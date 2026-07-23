#!/bin/bash
# Read-only diagnostic, runs on the server via SSH.
set +e

echo "=== nginx -t ==="
nginx -t

echo "=== systemctl status nginx ==="
systemctl status nginx --no-pager -l | head -10

echo "=== systemctl status mypal-backend ==="
systemctl status mypal-backend --no-pager -l | head -10

echo "=== curl -I https://my-pal.ai/ (din server, cerere catre sine) ==="
curl -sI https://my-pal.ai/

echo "=== curl -I https://my-pal.ai/myPAL.html ==="
curl -sI https://my-pal.ai/myPAL.html

echo "=== curl -I http://167.235.193.105/ (direct pe IP) ==="
curl -sI http://167.235.193.105/

echo "=== continut /var/www/mypal-site (index) ==="
ls -la /var/www/mypal-site/ | head -20
