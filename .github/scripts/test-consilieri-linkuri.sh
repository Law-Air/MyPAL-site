#!/bin/bash
set -e
COOKIES=$(mktemp)
CAPAC="mypal:1631"

echo "=== Login (test-cinci) ==="
curl -s -u "$CAPAC" -c "$COOKIES" -X POST https://my-pal.ai/api/login \
  -H "Content-Type: application/json" \
  -d '{"email":"abcd@abcd.ai","password":"1234&1234"}'
echo

echo "=== GET linkuri (trebuie sa arate cele 4 valori demo) ==="
curl -s -u "$CAPAC" -b "$COOKIES" https://my-pal.ai/api/family/consilieri-linkuri
echo

echo "=== Test parola gresita: suprascrierea trebuie respinsa (401), nimic schimbat ==="
curl -s -u "$CAPAC" -b "$COOKIES" -o /dev/null -w "HTTP %{http_code}\n" -X POST https://my-pal.ai/api/family/consilieri-link \
  -H "Content-Type: application/json" \
  -d '{"rol":"advix","link":"https://claude.ai/chat/00000000-0000-0000-0000-000000000001","password":"gresita-cu-totul"}'

echo "=== POST suprascrie link Advix cu un link de test, parola corecta ==="
curl -s -u "$CAPAC" -b "$COOKIES" -X POST https://my-pal.ai/api/family/consilieri-link \
  -H "Content-Type: application/json" \
  -d '{"rol":"advix","link":"https://claude.ai/chat/00000000-0000-0000-0000-000000000001","password":"1234&1234"}'
echo

echo "=== GET linkuri din nou (Advix trebuie sa aiba revizia crescuta) ==="
curl -s -u "$CAPAC" -b "$COOKIES" https://my-pal.ai/api/family/consilieri-linkuri
echo

echo "=== GET istoric Advix (trebuie sa arate versiunea anterioara) ==="
curl -s -u "$CAPAC" -b "$COOKIES" https://my-pal.ai/api/family/consilieri-link/advix/istoric
echo

echo "=== Restaureaza (suprascrie cu link-ul demo original, parola corecta) ==="
curl -s -u "$CAPAC" -b "$COOKIES" -X POST https://my-pal.ai/api/family/consilieri-link \
  -H "Content-Type: application/json" \
  -d '{"rol":"advix","link":"https://claude.ai/chat/2f6c6eca-73ac-431f-8828-016c80add51c","password":"1234&1234"}'
echo

echo "=== Test validare: link invalid, alt domeniu (asteptat 400), parola corecta ==="
curl -s -u "$CAPAC" -b "$COOKIES" -o /dev/null -w "HTTP %{http_code}\n" -X POST https://my-pal.ai/api/family/consilieri-link \
  -H "Content-Type: application/json" \
  -d '{"rol":"advix","link":"https://evil.example.com/phish","password":"1234&1234"}'

echo "=== Test validare: link claude.ai dar cale gresita, fara UUID (asteptat 400) ==="
curl -s -u "$CAPAC" -b "$COOKIES" -o /dev/null -w "HTTP %{http_code}\n" -X POST https://my-pal.ai/api/family/consilieri-link \
  -H "Content-Type: application/json" \
  -d '{"rol":"advix","link":"https://claude.ai/settings","password":"1234&1234"}'

echo "=== Test validare: format /project/<uuid> acceptat (asteptat ok:true), apoi restaurat ==="
curl -s -u "$CAPAC" -b "$COOKIES" -X POST https://my-pal.ai/api/family/consilieri-link \
  -H "Content-Type: application/json" \
  -d '{"rol":"advix","link":"https://claude.ai/project/00000000-0000-0000-0000-000000000002","password":"1234&1234"}'
echo
curl -s -u "$CAPAC" -b "$COOKIES" -X POST https://my-pal.ai/api/family/consilieri-link \
  -H "Content-Type: application/json" \
  -d '{"rol":"advix","link":"https://claude.ai/chat/2f6c6eca-73ac-431f-8828-016c80add51c","password":"1234&1234"}'
echo

echo "=== Test validare: rol invalid (asteptat 400) ==="
curl -s -u "$CAPAC" -b "$COOKIES" -o /dev/null -w "HTTP %{http_code}\n" -X POST https://my-pal.ai/api/family/consilieri-link \
  -H "Content-Type: application/json" \
  -d '{"rol":"nu-exista","link":"https://claude.ai/chat/x","password":"1234&1234"}'

echo "=== Cerere ajutor tehnic (email neconfigurat inca - trebuie ok:true oricum) ==="
curl -s -u "$CAPAC" -b "$COOKIES" -X POST https://my-pal.ai/api/family/clone-replacement-request \
  -H "Content-Type: application/json" \
  -d '{"rol":"verix","motiv":"test automat, de sters manual"}'
echo

rm -f "$COOKIES"
