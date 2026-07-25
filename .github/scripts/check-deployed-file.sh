#!/bin/bash
set +e
echo "=== Contine 'nav-btn-delogare' in fisierul de pe server? ==="
grep -c "nav-btn-delogare" /var/www/mypal-site/myPAL_Acasa.html
echo "=== Data ultimei modificari a fisierului ==="
stat -c '%y' /var/www/mypal-site/myPAL_Acasa.html
echo "=== Raspuns HTTP direct (verifica prezenta in continutul real servit) ==="
curl -s https://my-pal.ai/myPAL_Acasa.html | grep -c "nav-btn-delogare"
echo "=== Headere cache pt aceasta pagina ==="
curl -sI https://my-pal.ai/myPAL_Acasa.html | grep -i "cache\|etag\|last-modified"
