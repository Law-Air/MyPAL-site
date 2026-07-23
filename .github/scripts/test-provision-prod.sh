#!/bin/bash
# Runs on the Hetzner server via SSH. Uses the already-deployed
# dist/scripts/testProvision.js (compiled from the same code tested
# locally) against the REAL production database (mypal_prod), to prove
# isolation holds there too - not just in dev.
set -euo pipefail

cd /opt/mypal-backend
set -a
source /etc/mypal/db.env
set +a

echo "=== Rulez testProvision.js in productie (mypal_prod) ==="
OUTPUT=$(node dist/scripts/testProvision.js)
echo "$OUTPUT"

SITE_A_NUMBER=$(echo "$OUTPUT" | grep -m1 -o "siteNumber: '[^']*'" | sed "s/siteNumber: '//;s/'//")
echo "=== Site A extras: $SITE_A_NUMBER ==="

echo "=== Test login real, prin domeniul public (nginx + SSL + backend + Postgres) ==="
curl -s -X POST https://my-pal.ai/api/login \
  -H "Content-Type: application/json" \
  -d "{\"site_number\":\"$SITE_A_NUMBER\",\"password\":\"parola-test-123\"}"
echo

echo "=== Test login cu parola gresita (trebuie respins) ==="
curl -s -X POST https://my-pal.ai/api/login \
  -H "Content-Type: application/json" \
  -d "{\"site_number\":\"$SITE_A_NUMBER\",\"password\":\"gresita\"}"
echo
