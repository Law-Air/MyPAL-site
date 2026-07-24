#!/bin/bash
# Diagnostic pur de retea, fara Node/nodemailer - izoleaza daca problema e
# DNS, blocare firewall (drop tacut) sau altceva.
set +e

echo "=== DNS lookup smtp.titan.email ==="
timeout 10 getent hosts smtp.titan.email

echo "=== TCP connect catre smtp.titan.email:465 (10s timeout) ==="
timeout 10 bash -c 'cat < /dev/null > /dev/tcp/smtp.titan.email/465' && echo "CONECTAT OK" || echo "ESUAT/TIMEOUT (cod: $?)"

echo "=== TCP connect catre smtp.titan.email:587 (10s timeout) ==="
timeout 10 bash -c 'cat < /dev/null > /dev/tcp/smtp.titan.email/587' && echo "CONECTAT OK" || echo "ESUAT/TIMEOUT (cod: $?)"

echo "=== TCP connect catre smtp.titan.email:25 (10s timeout, doar informativ) ==="
timeout 10 bash -c 'cat < /dev/null > /dev/tcp/smtp.titan.email/25' && echo "CONECTAT OK" || echo "ESUAT/TIMEOUT (cod: $?)"

echo "=== Reguli firewall locale (ufw / iptables), doar iesire ==="
ufw status verbose 2>/dev/null || echo "ufw indisponibil/inactiv"
iptables -L OUTPUT -n 2>/dev/null | head -20
