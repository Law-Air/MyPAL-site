#!/bin/bash
set -e
COOKIES=$(mktemp)
CAPAC="mypal:1631"

echo "=== Login (test-cinci) ==="
curl -s -u "$CAPAC" -c "$COOKIES" -X POST https://my-pal.ai/api/login \
  -H "Content-Type: application/json" \
  -d '{"email":"abcd@abcd.ai","password":"1234&1234"}'
echo

echo "=== Salveaza o copie de test ==="
curl -s -u "$CAPAC" -b "$COOKIES" -X POST https://my-pal.ai/api/family/memorie/salveaza \
  -H "Content-Type: application/json" \
  -d '{"eticheta":"test-automat","continut":"Continut fictiv de test, sters manual dupa verificare."}'
echo

echo "=== Recupereaza istoricul ==="
curl -s -u "$CAPAC" -b "$COOKIES" https://my-pal.ai/api/family/memorie
echo

rm -f "$COOKIES"
