# INSTRUCȚIUNE TEHNICĂ — IZOLARE SECURIZATĂ A DATELOR DE FAMILIE
**De la: SAFIX — Rol Tehnic FIN-AIR/LAW-AIR**
**Către: HOSTIX — Hosting & Technical Deployment**
**Aprobat de: Mircea Popa, Admin**
**Data: [de completat la trimitere]**

---

## 1. SCOP

Acest document fixează, în scris, granița de încredere pentru izolarea datelor familiilor/IMM-urilor în ecosistemul MyPAL/Fin-Air. Nu e o recomandare — e o cerință obligatorie de arhitectură, rezultată dintr-o analiză explicită cerută de Admin, în urma unor întrebări reale ridicate de utilizatori pilot.

**Afirmația pe care avem voie să o facem public, verificată și demonstrată:**

> **"Datele stocate de familie în Postgres sunt izolate."**

Orice extindere a acestei afirmații (către claude.ai, către alte componente ale platformei Claude, către procese neconfirmate) **nu este autorizată** până la o verificare separată, explicită. A se vedea Secțiunea 5.

---

## 2. ARHITECTURA CONFIRMATĂ (recapitulare obligatorie)

- **Instanțe Postgres separate per Proiect major** — MyPAL și Fin-Air, fiecare pe VPS propriu (CPX21/22 MyPAL, CPX31/32 Fin-Air)
- **Schema separată per client**, în interiorul fiecărui Proiect — fiecare familie/IMM are propriul set de tabele, izolat
- **Rol Postgres dedicat per schema**, cu permisiuni `GRANT` limitate strict la propria schema — fără excepție, fără cale de citire transversală
- Separarea pe schema **face parte din primul și singurul script de provisionare** — nu există cale de a crea o schemă „goală", fără rol dedicat de la bun început (confirmat deja de Hostix, în implementarea curentă)

Acest nivel de izolare a fost **testat adversarial**, nu doar presupus: încercarea explicită a Site B de a citi datele Site A a fost respinsă de Postgres cu eroare de permisiune reală. Acest test rămâne dovada de referință și trebuie **repetat la fiecare modificare majoră a schemei de permisiuni**, nu doar o singură dată la lansare.

---

## 3. CERINȚE OBLIGATORII PENTRU HOSTIX

### 3.1 Parole și credențiale
- Parola familiei: stocată **exclusiv ca hash bcrypt** (sau echivalent modern, cost factor adecvat) — niciodată în clar, niciodată reversibilă, niciodată vizibilă în vreun tabel de lucru, log, sau export de debug.
- Parola rolului Postgres al fiecărei schema: **separată conceptual** de parola familiei — compromiterea uneia nu trebuie să ofere cale către cealaltă.
- **Interzis**: orice tabel, fișier de configurare, sau log care conține parole în clar, chiar temporar, chiar în mediul de dezvoltare/testare.

### 3.2 Operațiunea de migrare/înlocuire clonă
- Se execută **exclusiv prin script/serviciu backend**, cu cont de serviciu ale cărui permisiuni Postgres sunt strict scopate la operațiunea de provisionare (creare schema + rol + grant), fără drept de citire a conținutului altor schema.
- **Este interzisă** orice formă de operațiune manuală, semi-manuală sau asistată prin interfața claude.ai (mutare de conversație/chat între Proiecte) ca mecanism de migrare a datelor sau identității unei familii reale. Motiv (confirmat, nu presupus): claude.ai Projects nu oferă niciun nivel de permisiune sub „Can use", iar „Can use" acordă deja vizibilitate completă asupra conținutului Proiectului — nu există separare acces-la-acțiune / acces-la-conținut la nivelul acelei platforme. Vezi Secțiunea 5.
- Fiecare operațiune de provisionare/înlocuire trebuie **logată** (cine/ce a inițiat, timestamp, schema afectată) — traseu de audit, nu opțional.

### 3.3 Testare
- Date reale de familie **nu se folosesc** în testare sau dezvoltare. Pentru date de test realiste, se solicită set-uri simulate de la rolul **Vivix**.
- Testul de izolare cross-schema (Secțiunea 2) se repetă la fiecare lansare majoră și se documentează rezultatul, indiferent dacă a trecut sau nu.

### 3.4 Backup
- Backup per-schema, nu doar per-server — necesar atât pentru restaurare selectivă, cât și pentru scenariul de arhivare "rece" per-abonament (decizie separată, pending).
- Procedura de restore trebuie testată efectiv, nu doar presupusă funcțională.

---

## 4. CE NU ESTE ACOPERIT DE ACEASTĂ IZOLARE (limite explicite, de comunicat intern)

- Proiectele claude.ai (ADVIX, ADVIZ, VERIX, VIVIX, myPAL P/001.0XX) sunt spațiul de lucru al **echipei**, nu canalul de livrare a serviciului către familii. Nu conțin, prin design, date de producție ale familiilor.
- Vizibilitatea/administrarea contului Claude Team (Primary Owner) este un subiect separat, cu reguli proprii de platformă — nu e acoperit de garanția Postgres și nu trebuie amestecat cu ea în comunicare.

---

## 5. NOTĂ DE FUNDAMENTARE (pentru referință, nu de retransmis ca atare familiilor)

Verificat explicit: pe claude.ai (Team/Enterprise), permisiunile la nivel de Proiect au doar două trepte — „Can use" (vizibilitate completă asupra conținutului, fără editare) și „Can edit". Nu există un nivel granular de tipul „poate doar adăuga conținut, fără acces la restul". Această limitare de platformă este motivul pentru care întreaga operațiune de migrare/înlocuire a fost mutată integral în backend-ul Postgres, unde permisiunile granulare sunt posibile și au fost demonstrate.

---

**Confirmare necesară de la Hostix la primire:** citește, confirmă înțelegerea Secțiunii 3 ca cerință obligatorie (nu recomandare), și semnalează dacă implementarea curentă are vreun punct neacoperit față de acest document.

**SAFIX — Tehnic FIN-AIR / infrastructură, automatizări, fluxuri și siguranță operațională.**

---

## CONFIRMARE HOSTIX (adăugat la primire)

Citit, confirmat ca cerință obligatorie. Verificare punct cu punct față de implementarea curentă:

- **3.1** — conform. Parola familiei: hash bcrypt. Parola rolului Postgres: criptată separat (`pgcrypto`), niciodată reutilizată/derivată din parola familiei. Corectat: scriptul de test afișa anterior parola rolului în clar în consolă (doar mediu local, dar contrar literei cerinței) — eliminat, nu se mai loghează nicăieri, nici în dev.
- **3.2** — **gol real, identificat și corectat azi.** Contul de provisionare (`mypal_admin`), fiind cel care crea tabelele fiecărei schema, rămânea implicit proprietarul lor — proprietatea ocolește orice `GRANT`, deci `mypal_admin` avea de fapt acces complet la conținutul oricărui site, chiar dacă nu-i fusese acordat explicit. Corectat: proprietatea tabelelor/secvențelor se transferă către rolul dedicat al site-ului imediat după creare, în aceeași tranzacție de provisionare; apartenența temporară de rol necesară pentru transfer se revocă imediat după. Retestat adversarial: `mypal_admin` primește acum "permission denied" la citirea conținutului oricărui site — nu doar teoretic, verificat cu eroare Postgres reală.
- **3.3** — corectat: datele de test foloseau anterior un nume real ("Mircea") ca membru de familie fictiv; înlocuit cu placeholder generic. Testul de izolare cross-schema rulează la fiecare modificare a schemei de permisiuni (repetat azi, de două ori, cu rezultat documentat mai sus).
- **3.4** — neimplementat încă (backup per-schema + restore testat). Rămâne pe listă, nu blochează pilotul curent.

Mecanismul de migrare/înlocuire clonă prin interfața claude.ai (Secțiunea 3.2) **nu a fost folosit vreodată cu date reale** — a rămas la stadiul de discuție conceptuală. Confirmat: rămâne exclusiv teoretic; implementarea reală se face integral prin backend, cum cere documentul.
