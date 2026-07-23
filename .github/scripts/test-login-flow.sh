#!/bin/bash
# Test end-to-end al fluxului real (comanda -> alocare -> login), rulat pe
# server via SSH. Foloseste date exclusiv fictive.
set -euo pipefail

cd /opt/mypal-backend
set -a
source /etc/mypal/db.env
set +a

echo "=== Alocare site de test (echivalent cu Confirma Plata) ==="
OUTPUT=$(node dist/scripts/testLoginFlow.js)
echo "$OUTPUT"

EMAIL=$(echo "$OUTPUT" | grep -m1 -o 'EMAIL=.*' | cut -d= -f2-)
PASSWORD=$(echo "$OUTPUT" | grep -m1 -o 'PASSWORD=.*' | cut -d= -f2-)
SITE_NUMBER=$(echo "$OUTPUT" | grep -m1 -o 'SITE_NUMBER=.*' | cut -d= -f2-)

echo "=== Test login corect (email + parola alocata) ==="
curl -s -c /tmp/mypal_test_cookie.txt -X POST https://my-pal.ai/api/login \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}"
echo

echo "=== Test /api/me cu sesiunea primita ==="
curl -s -b /tmp/mypal_test_cookie.txt https://my-pal.ai/api/me
echo

echo "=== Test login cu parola gresita ==="
curl -s -X POST https://my-pal.ai/api/login \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"gresita\"}"
echo

echo "=== Test delogare cu parola corecta ==="
curl -s -b /tmp/mypal_test_cookie.txt -X POST https://my-pal.ai/api/auth/logout \
  -H "Content-Type: application/json" \
  -d "{\"password\":\"$PASSWORD\"}"
echo

echo "=== Test /api/me dupa delogare (trebuie sa esueze) ==="
curl -s -b /tmp/mypal_test_cookie.txt https://my-pal.ai/api/me
echo

echo "=== Test /api/orders public (creare comanda) ==="
curl -s -X POST https://my-pal.ai/api/orders \
  -H "Content-Type: application/json" \
  -d "{\"family_name\":\"Familie Test Smoke Comanda\",\"email\":\"smoke-comanda-$(date +%s)@example.com\",\"plan\":\"start\"}"
echo

echo "Site alocat pt acest test: $SITE_NUMBER"
rm -f /tmp/mypal_test_cookie.txt
