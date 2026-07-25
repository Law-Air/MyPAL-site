#!/bin/bash
# Adauga un gate simplu (HTTP Basic Auth) pe tot domeniul - un "CAPAC" de
# acces, separat complet de login-ul real al familiilor, doar ca sa nu
# ajunga vizitatori intamplatori pe site in faza de pilot.
set -euo pipefail

PIN="$1"

if ! command -v htpasswd >/dev/null 2>&1; then
  apt-get update -y
  apt-get install -y apache2-utils
fi

htpasswd -bc /etc/nginx/mypal.htpasswd mypal "$PIN"
chmod 640 /etc/nginx/mypal.htpasswd
chown root:www-data /etc/nginx/mypal.htpasswd

CONF=/etc/nginx/sites-available/mypal-site
# Gate DOAR pe location / (paginile statice) - /api/ ramane fara Basic
# Auth, ca sa nu stricam login-ul real si toate scripturile de test care
# apeleaza direct /api/... (au oricum propria autentificare reala).
if ! grep -q "auth_basic_user_file /etc/nginx/mypal.htpasswd;" "$CONF"; then
  python3 - "$CONF" <<'PYEOF'
import sys
path = sys.argv[1]
with open(path) as f:
    content = f.read()
marker = "    location / {\n        add_header Cache-Control \"no-cache\";\n"
gate = (
    "    location / {\n"
    "        auth_basic \"myPAL\";\n"
    "        auth_basic_user_file /etc/nginx/mypal.htpasswd;\n"
    "        add_header Cache-Control \"no-cache\";\n"
)
if marker not in content:
    raise SystemExit("EROARE: marker-ul asteptat nu a fost gasit in " + path)
content = content.replace(marker, gate, 1)
with open(path, "w") as f:
    f.write(content)
PYEOF
  nginx -t
  systemctl reload nginx
  echo "CAPAC activat (doar pe paginile statice, /api/ ramane liber pt scripturi de test)."
else
  echo "CAPAC deja activ - doar am actualizat PIN-ul."
  nginx -t
  systemctl reload nginx
fi
