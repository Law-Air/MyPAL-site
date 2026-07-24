#!/bin/bash
# Runs on the Hetzner server via SSH, AFTER dist/ + package.json +
# package-lock.json have already been rsynced to /opt/mypal-backend/.
# Idempotent: safe to re-run.
set -euo pipefail

cd /opt/mypal-backend

echo "=== Verificare/instalare Node.js ==="
if ! command -v node >/dev/null 2>&1; then
  curl -fsSL https://deb.nodesource.com/setup_lts.x | bash -
  apt-get install -y nodejs
fi
node --version

echo "=== Unelte de build pt module native (bcrypt) ==="
if ! command -v gcc >/dev/null 2>&1; then
  apt-get update -y
  apt-get install -y build-essential python3
fi

echo "=== Instalare dependinte productie ==="
npm install --omit=dev
# npm blocheaza implicit scripturile de instalare ale pachetelor (politica
# "allow-scripts"), inclusiv cel al bcrypt (node-gyp-build) - fara el,
# binarul nativ nu se construieste si require('bcrypt') pica la runtime.
# Aprobam explicit si reconstruim.
npm approve-scripts --allow-scripts-pending || true
npm rebuild

echo "=== Migratie 003 (core: email login, comenzi, sesiuni) ==="
set -a
source /etc/mypal/db.env
set +a
psql -v ON_ERROR_STOP=1 -f db/migrations/003_login_orders_sessions.sql

echo "=== Migrare site-uri deja provisionate (relation_label/member_code) ==="
node dist/scripts/migrateSites.js

echo "=== Configurare serviciu systemd ==="
cat > /etc/systemd/system/mypal-backend.service <<'UNITEOF'
[Unit]
Description=myPAL backend
After=network.target postgresql.service

[Service]
Type=simple
WorkingDirectory=/opt/mypal-backend
EnvironmentFile=/etc/mypal/db.env
Environment=PORT=3000
ExecStart=/usr/bin/node dist/server.js
Restart=always
RestartSec=5
User=root

[Install]
WantedBy=multi-user.target
UNITEOF

systemctl daemon-reload
systemctl enable mypal-backend
systemctl restart mypal-backend

echo "=== Astept stabilizarea serviciului (verific de mai multe ori, ca sa prind crash-loop) ==="
STABLE=true
for i in $(seq 1 6); do
  sleep 1
  STATE=$(systemctl is-active mypal-backend || true)
  echo "  t+${i}s: $STATE"
  if [ "$STATE" != "active" ]; then
    STABLE=false
  fi
done

echo "=== Jurnal serviciu (ultimele 40 linii, mereu afisat) ==="
journalctl -u mypal-backend --no-pager -n 40

if [ "$STABLE" != "true" ]; then
  echo "EROARE: serviciul nu a fost stabil 'active' pe durata verificarii."
  exit 1
fi

echo "=== Legare nginx -> backend (/api/) ==="
CONF=/etc/nginx/sites-available/mypal-site
# proxy_pass FARA path (nici macar "/") dupa host:port - cu path (chiar
# si doar "/") nginx REscrie prefixul location-ului, taind "/api/" din
# cerere inainte sa ajunga la Express (care are rutele definite CU
# "/api/..."). Fara path dupa "3000", nginx trimite URI-ul original,
# neschimbat, catre backend.
if grep -q "proxy_pass http://127.0.0.1:3000/;" "$CONF"; then
  sed -i 's#proxy_pass http://127.0.0.1:3000/;#proxy_pass http://127.0.0.1:3000;#' "$CONF"
  nginx -t
  systemctl reload nginx
  echo "Corectat: proxy_pass nu mai taie prefixul /api/."
fi

if ! grep -q "location /api/" "$CONF"; then
  # Insereaza blocul de proxy imediat dupa "location / { ... }" din
  # server block-ul HTTPS (singurul care are try_files - cel de pe 80
  # doar redirectioneaza, nu are location).
  python3 - "$CONF" <<'PYEOF'
import sys
path = sys.argv[1]
with open(path) as f:
    content = f.read()
marker = "    location / {\n        try_files $uri $uri/ =404;\n    }\n"
proxy_block = (
    "    location /api/ {\n"
    "        proxy_pass http://127.0.0.1:3000;\n"
    "        proxy_set_header Host $host;\n"
    "        proxy_set_header X-Real-IP $remote_addr;\n"
    "    }\n"
)
if marker not in content:
    raise SystemExit("EROARE: marker-ul asteptat nu a fost gasit in " + path)
content = content.replace(marker, marker + proxy_block, 1)
with open(path, "w") as f:
    f.write(content)
PYEOF
  nginx -t
  systemctl reload nginx
  echo "Proxy /api/ adaugat."
else
  echo "Proxy /api/ exista deja - nu modific."
fi

echo "=== Verificare finala ==="
echo "--- direct pe backend (port 3000) ---"
curl -s http://127.0.0.1:3000/health && echo
echo "--- prin nginx + domeniu + SSL (calea reala folosita de site) ---"
curl -s https://my-pal.ai/api/health && echo
systemctl status mypal-backend --no-pager -l | head -10
