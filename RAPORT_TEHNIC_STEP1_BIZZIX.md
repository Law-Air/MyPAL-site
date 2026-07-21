# Raport tehnic de funcționare — STEP ONE
**Pentru:** Bizzix (strategie business / lansare PILOT)
**De la:** Hostix (rol tehnic hosting & deployment)
**Data:** 21 iulie 2026
**Scop:** bază de discuție pentru strategia de lansare PILOT — ce e live, ce e construit dar neconectat, și ce implică fiecare opțiune de lansare.

---

## 1. Rezumat executiv

Site-ul static **my-pal.ai** este live, funcțional și se auto-publică la fiecare modificare. Există în paralel un backend Postgres multi-tenant (izolare completă pe familie), construit și testat adversarial, dar **încă neconectat** la site-ul public. Cele două piese pot fi lansate în PILOT separat sau împreună — alegerea are implicații directe asupra riscului de confidențialitate și a vitezei de lansare. Secțiunea 6 conține recomandarea concretă.

---

## 2. Arhitectura curentă (operațională, live)

```
Hostix (eu) → GitHub (main, cu istoric complet)
                 │
                 ▼
        GitHub Actions (robot automat, la fiecare push)
                 │  SSH cu cheie dedicată, acces limitat
                 ▼
        Server Hetzner (167.235.193.105)
                 │  rsync → /var/www/mypal-site/ + reload nginx
                 ▼
        my-pal.ai (public, live)
```

- Zero pași manuali după `git push` — publicarea e automată, capăt la capăt.
- Cheia SSH folosită de robot e restrânsă la sincronizare fișiere + reload nginx (nu shell root nelimitat).
- Istoric complet în GitHub: orice schimbare e trasabilă, cu rollback posibil instant.

**Status:** funcțional, verificat end-to-end (ultima rulare reușită: adăugarea favicon-ului pe toate cele 15 pagini, 21 iulie 2026).

---

## 3. Ce este LIVE acum pe my-pal.ai

- Toate cele 15 pagini statice (Acasă, Echipă, Verifică, Memorie, Rezervări, Legal, etc.) — corectate în urma auditului de hosting-readiness (linkuri fantomă reparate, email real, favicon adăugat).
- Interfața pentru cei 4 consilieri AI (Advix / Adviz / Verix / Vivix) — prezentare + conversații demo.
- Ecranul de "intrare" (Cine ești + Cod personal 4 cifre) și panoul familie (Consiliul Familiei, membri, parole PIN) — **funcționale vizual**, dar vezi secțiunea 4.

---

## 4. Ce este construit, testat, dar NECONECTAT la site-ul public

Un backend Postgres separat (dezvoltat și testat în acest sprint) oferă:

- **Izolare completă per-familie** — fiecare familie primește propria schemă + rol dedicat în baza de date; testat adversarial (o familie nu poate citi datele alteia, iar contul de administrare a bazei nu poate citi datele niciunei familii după provizionare).
- **Numerotare site** conform schemei convenite (`grup/bloc.secvență`).
- **Sistem de clone și genealogie** (versiuni ale consilierilor per familie, pe cele 4 domenii: conta, juridic, rezervări_simulări, audit).
- **27 de categorii MyPAL** pre-seed-uite, identice pentru orice familie nouă.
- **`access_windows`** — sistemul de acces manual, cu fereastră de timp estimată + marjă, extindere proactivă vs. depășire nesemnalată (propunerea Safix, validată).

**Important:** acest backend NU este încă legat de formularele de pe site-ul public. E validat separat, în mediu de dezvoltare.

---

## 5. Starea reală de securitate/confidențialitate — ACUM, pe site-ul public

Ecranul de "intrare" de pe my-pal.ai este în acest moment un **mockup client-side**: verifică doar că s-au introdus 4 caractere, fără nicio validare reală față de o bază de date. Consecință directă:

- **Nu există date reale de familie stocate în spatele acestui ecran.**
- Orice vizitator (inclusiv terți, pentru verificare/testare UX) poate "intra" — asta nu constituie o breșă de confidențialitate, pentru că nu există confidențial de expus.
- Acesta e motivul pentru care am putut confirma azi, direct lui Mircea, că vizitele de verificare/terți sunt sigure de făcut chiar acum, fără nicio modificare din partea mea.

Acest lucru **se schimbă obligatoriu** în momentul în care backend-ul de la secțiunea 4 se conectează la formularele publice — din acel moment ecranul de intrare trebuie să valideze real, iar accesul terților trebuie tratat cu aceeași rigoare ca accesul unei familii.

---

## 6. Implicații pentru strategia de lansare PILOT — două opțiuni

**Opțiunea A — PILOT pe demo-ul actual (disponibil ACUM, cost zero suplimentar)**
Folosit pentru: validare UX/parcurs, prezentări către terți/investitori/familii-pilot, testare a fluxului de conversație cu cei 4 consilieri. Fără date reale de familie → fără risc de confidențialitate. Poate începe imediat.

**Opțiunea B — PILOT cu familii reale + date reale**
Necesită întâi: conectarea backend-ului Postgres la formularele publice (autentificare reală per-familie, înlocuirea ecranului mockup). Abia după această conectare are sens onboarding-ul de familii reale cu date reale.

---

## 7. Recomandarea Hostix pentru STEP ONE

Pornire în paralel:
1. **Opțiunea A imediat** — folosiți demo-ul actual pentru validarea de business/UX cu Bizzix, vizite terți, feedback, fără nicio presiune de securitate (nu există ce să se scurgă).
2. **Conectarea backend↔front-end** continuă ca lucru tehnic de fond, pregătind Opțiunea B pentru momentul în care strategia de business (Bizzix) decide să onboardeze prima familie reală.

Astfel viteza de lansare (business) nu așteaptă după finalizarea tehnică completă, iar rigoarea de confidențialitate rămâne intactă pentru momentul în care contează cu adevărat — la prima familie reală.

---

## 8. Decizii deschise, necesare de la Bizzix

- Orizont de timp dorit până la onboarding prima familie reală (determină prioritatea conectării backend-ului).
- Dacă Opțiunea A (demo) e suficientă pentru runda curentă de verificări/vizite terți, sau dacă se dorește deja un nivel de autentificare reală înainte de asta.
