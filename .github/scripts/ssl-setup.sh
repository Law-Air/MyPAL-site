#!/bin/bash
# Runs on the Hetzner server via SSH. Idempotent: safe to re-run.
set -euo pipefail

CONF=/etc/nginx/sites-available/mypal-site

echo "=== Leg explicit domeniul de block-ul nginx existent (era catch-all: server_name _;) ==="
if grep -q "server_name _;" "$CONF"; then
  sed -i 's/server_name _;/server_name my-pal.ai www.my-pal.ai;/' "$CONF"
  nginx -t
  systemctl reload nginx
  echo "server_name actualizat la my-pal.ai + www.my-pal.ai"
else
  echo "server_name deja actualizat sau diferit de asteptare - nu modific (verifica manual daca e nevoie)."
fi

echo "=== Instalare certbot (idempotent) ==="
if ! command -v certbot >/dev/null 2>&1; then
  apt-get update -y
  apt-get install -y certbot python3-certbot-nginx
fi

echo "=== Obtinere/reinnoire certificat SSL ==="
certbot --nginx \
  -d my-pal.ai -d www.my-pal.ai \
  --non-interactive --agree-tos \
  -m office@my-pal.ai \
  --redirect

echo "=== Reinnoire automata (verificare timer systemd) ==="
systemctl enable certbot.timer 2>/dev/null || true
systemctl start certbot.timer 2>/dev/null || true
systemctl is-enabled certbot.timer || echo "ATENTIE: certbot.timer nu e activ - reinnoirea automata nu e garantata"

echo "=== Stare finala ==="
certbot certificates
nginx -t
