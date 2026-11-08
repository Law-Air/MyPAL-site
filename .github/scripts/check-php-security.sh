#!/bin/bash
# One-off read-only check, per Hetzner security advisory (PHP CVEs, 21 oct 2026).
set -u
echo "=== php binary ==="
which php 2>/dev/null || echo "no php binary in PATH"
php -v 2>/dev/null || true
echo "=== dpkg packages matching php ==="
dpkg -l 2>/dev/null | grep -i php || echo "no php packages via dpkg"
echo "=== systemd units matching php ==="
systemctl list-units --all 2>/dev/null | grep -i php || echo "no php systemd units"
echo "=== listening ports (nginx/node only expected) ==="
ss -tlnp 2>/dev/null | grep -E ':80|:443|:3000' || true
echo "=== our own backend service ==="
systemctl is-active mypal-backend 2>/dev/null || true
echo "=== OS / unattended-upgrades status ==="
cat /etc/os-release 2>/dev/null | head -3
systemctl is-enabled unattended-upgrades 2>/dev/null || echo "unattended-upgrades not found/enabled"
