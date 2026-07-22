#!/bin/bash
# Runs on the Hetzner server itself (piped over SSH by the GitHub Actions
# workflow). Idempotent: safe to re-run, does nothing destructive if the
# server was already provisioned.
set -euo pipefail

echo "=== Verificare/instalare PostgreSQL ==="
if ! command -v psql >/dev/null 2>&1; then
  apt-get update -y
  apt-get install -y postgresql postgresql-contrib
fi
systemctl enable postgresql
systemctl start postgresql

mkdir -p /etc/mypal
chmod 700 /etc/mypal

if [ ! -f /etc/mypal/db.env ]; then
  echo "=== Prima provisionare: generez secrete de productie (raman DOAR pe acest server, nu ajung niciodata in GitHub) ==="
  ADMIN_PW=$(openssl rand -base64 24 | tr -dc 'A-Za-z0-9')
  MASTER_KEY=$(openssl rand -base64 32 | tr -dc 'A-Za-z0-9')

  cat > /etc/mypal/db.env <<ENVEOF
PGHOST=127.0.0.1
PGPORT=5432
PGDATABASE=mypal_prod
PGUSER=mypal_admin
PGPASSWORD=${ADMIN_PW}
PGCRYPTO_MASTER_KEY=${MASTER_KEY}
ENVEOF
  chmod 600 /etc/mypal/db.env

  # CREATEROLE (nu SUPERUSER) — minim necesar pentru ca mypal_admin sa poata
  # crea rolurile/schemele per site si sa transfere ownership-ul, fara sa
  # aiba privilegii nelimitate pe server (cerinta de minim-privilegiu).
  sudo -u postgres psql -v ON_ERROR_STOP=1 -c "CREATE ROLE mypal_admin LOGIN CREATEROLE PASSWORD '${ADMIN_PW}';"
  sudo -u postgres psql -v ON_ERROR_STOP=1 -c "CREATE DATABASE mypal_prod OWNER mypal_admin;"

  echo "=== Rol mypal_admin (CREATEROLE, non-superuser) si baza mypal_prod create. ==="
else
  echo "=== /etc/mypal/db.env exista deja - provisionarea initiala a rulat anterior, nu suprascriu nimic. ==="
fi

echo "=== Stare finala ==="
systemctl is-active postgresql
sudo -u postgres psql -c "SELECT rolname, rolsuper, rolcreaterole, rolcreatedb FROM pg_roles WHERE rolname = 'mypal_admin';"
sudo -u postgres psql -c "SELECT datname, pg_get_userbyid(datdba) AS owner FROM pg_database WHERE datname = 'mypal_prod';"
