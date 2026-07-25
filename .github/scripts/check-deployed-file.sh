#!/bin/bash
set +e
echo "=== Exista myPAL_Intrare.html pe server? ==="
ls -la /var/www/mypal-site/myPAL_Intrare.html
echo "=== Contine 'Prima ta intrare' (pasul de parola din pagina noua)? ==="
grep -c "Prima ta intrare" /var/www/mypal-site/myPAL_Intrare.html
echo "=== Data ultimei modificari a fisierului ==="
stat -c '%y' /var/www/mypal-site/myPAL_Intrare.html
echo "=== Raspuns HTTP direct (verifica prezenta in continutul real servit) ==="
curl -s -u mypal:1631 https://my-pal.ai/myPAL_Intrare.html | grep -c "Prima ta intrare"
echo "=== Acasa arata link catre pagina noua, nu mai are inputuri inline? ==="
curl -s -u mypal:1631 https://my-pal.ai/myPAL_Acasa.html | grep -c "myPAL_Intrare.html"
curl -s -u mypal:1631 https://my-pal.ai/myPAL_Acasa.html | grep -c 'id="login-email"'
