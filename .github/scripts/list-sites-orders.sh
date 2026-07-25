#!/bin/bash
set -euo pipefail
cd /opt/mypal-backend
set -a
source /etc/mypal/db.env
set +a
export PGPASSWORD

echo "=== core.sites (alocare) ==="
psql -c "SELECT site_number, family_name, status, allocated_at IS NOT NULL AS alocat, password_is_default FROM core.sites ORDER BY site_number_seq;"

echo "=== core.site_emails (email mascat, log public) ==="
psql -c "SELECT s.site_number, left(e.email,2) || '***@' || split_part(e.email,'@',2) AS email_mascat, e.is_primary FROM core.site_emails e JOIN core.sites s ON s.id = e.site_id ORDER BY s.site_number_seq;"

echo "=== core.orders (email mascat, log public) ==="
psql -c "SELECT id, family_name, left(email,2) || '***@' || split_part(email,'@',2) AS email_mascat, subscription_plan, status, created_at FROM core.orders ORDER BY id;"

echo "=== core.sessions active ==="
psql -c "SELECT s.site_number, sess.created_at, sess.revoked_at FROM core.sessions sess JOIN core.sites s ON s.id = sess.site_id ORDER BY sess.created_at DESC LIMIT 10;"
