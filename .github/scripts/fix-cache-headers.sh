#!/bin/bash
# Forteaza revalidare (nu re-descarcare completa, doar un check rapid
# "s-a schimbat?") pt orice fisier servit de pe /var/www/mypal-site,
# ca sa nu mai ramana browsere blocate pe versiuni vechi dupa deploy.
set -euo pipefail

CONF=/etc/nginx/sites-available/mypal-site

if ! grep -q 'add_header Cache-Control "no-cache"' "$CONF"; then
  python3 - "$CONF" <<'PYEOF'
import sys
path = sys.argv[1]
with open(path) as f:
    content = f.read()
marker = "    location / {\n        try_files $uri $uri/ =404;\n    }\n"
new_block = (
    "    location / {\n"
    "        add_header Cache-Control \"no-cache\";\n"
    "        try_files $uri $uri/ =404;\n"
    "    }\n"
)
if marker not in content:
    raise SystemExit("EROARE: marker-ul asteptat nu a fost gasit in " + path)
content = content.replace(marker, new_block, 1)
with open(path, "w") as f:
    f.write(content)
PYEOF
  nginx -t
  systemctl reload nginx
  echo "Adaugat Cache-Control: no-cache pe location /."
else
  echo "Deja configurat - nu modific."
fi

echo "=== Verificare header ==="
curl -sI https://my-pal.ai/myPAL_Acasa.html | grep -i "cache-control\|etag"
