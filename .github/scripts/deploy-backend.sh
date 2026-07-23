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
sleep 2
systemctl is-active mypal-backend

echo "=== Legare nginx -> backend (/api/) ==="
CONF=/etc/nginx/sites-available/mypal-site
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
    "        proxy_pass http://127.0.0.1:3000/;\n"
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
curl -s http://127.0.0.1:3000/health && echo
systemctl status mypal-backend --no-pager -l | head -10
