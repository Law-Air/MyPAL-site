#!/bin/bash
# Diagnostic pur, read-only.
set +e
echo "=== TXT records pt my-pal.ai (SPF etc.) ==="
getent hosts my-pal.ai
dig +short TXT my-pal.ai 2>/dev/null || host -t TXT my-pal.ai 2>/dev/null || nslookup -type=TXT my-pal.ai 2>/dev/null
