> ⚠️ **SUPERSEDAT** — document scris pe 21 iulie 2026, păstrat neschimbat mai jos ca instantaneu istoric ("ce știam atunci"). Majoritatea punctelor de mai jos sunt deja realizate: backend-ul e conectat și live (autentificare reală, nu mockup), Postgres rulează în producție cu migrații aplicate, testele de izolare există și rulează la cerere (workflow-uri GitHub). Nu folosiți acest document ca sursă pentru starea curentă a proiectului — marcat de Hostix pe 23 august 2026, la observația lui Safix.

# Jalonare Pre-Lansare — pentru Bizzix
**Data:** 21 iulie 2026 · **Estimare propusă:** ~1 săptămână
**Scop:** listă finală, PROFI, pentru stabilirea calendarului cu Bizzix înainte de a declara faza de fezabilitate/pre-lansare încheiată.

---

## Infrastructură & Securitate
- [ ] HTTPS/SSL + legarea domeniului real `my-pal.ai` de serverul Hetzner
- [ ] Firewall pe server (acces SSH restricționat la cheia de deploy)
- [ ] Backup/restore Postgres, per-familie (plan + implementare) — plasă de siguranță obligatorie înainte de orice familie reală

## Backend & Integrare
- [ ] Instalare Postgres pe Hetzner + rulare migrații în producție
- [ ] Deploy backend + conectarea ecranului de login (acum mockup) la autentificare reală
- [ ] Automatizarea testelor de izolare (rulează la fiecare schimbare de cod, nu manual — ca să prindem imediat orice regresie)
- [ ] Monitorizare/alertare de bază (server activ, spațiu disc, reușita backup-urilor)

## Conținut & Confidențialitate
- [ ] Pagină/secțiune de Confidențialitate pe site, cu strategia ACCES-TEMPORAR / TIME-BOXED pentru migrări

## Testare funcțională
- [ ] Testare tabele Postgres în producție (nu doar în mediul de dezvoltare)
- [ ] Testare împerechere Site n/xxx.xxx ↔ Proiect AIR n/xxx.xxx, complet cu cele 4 roluri factory-made
- [ ] Testare acțiune de migrare individuală pentru Rol n/xxx.xxx (Support)

---

**Total: 10 puncte.** Estimare Mircea: finalizabile în ~1 săptămână. În paralel, echipa pornește testarea de fabrică a Clonelor (linie de testare prin sondaj + training zilnic cu feedback).
