# myPAL Backend (pilot)

Node.js + Express + TypeScript, Postgres cu izolare pe schemă per site.

## Arhitectură, pe scurt

- **`core` schema** — registru de site-uri (`core.sites`) și evidența
  clonelor (`core.clones`). Nu conține niciodată date de familie.
- **O schemă separată per microsite** (`site_<grup>_<secventa>`), creată de
  `provisionSite()` — identică structural pentru orice site nou, diferă
  doar datele.
- **Un rol Postgres dedicat per site**, cu drepturi STRICT limitate la
  propria schemă. Aplicația nu se conectează niciodată "ca admin" pentru
  a citi datele unui site — folosește mereu rolul acelui site
  (`src/db/sitePool.ts`). Testat: un site nu poate citi schema altuia,
  și — la fel de important — **contul de provisionare (`mypal_admin`) nu
  poate citi conținutul niciunui site**, doar poate face operațiuni
  structurale (creare schemă/rol/grant). Tabelele fiecărui site sunt
  transferate ca proprietate către rolul acelui site imediat după
  creare (`ALTER TABLE ... OWNER TO`) — altfel `mypal_admin`, fiind
  cel care le creează, ar rămâne implicit proprietar și ar avea acces
  complet, indiferent de `GRANT`-uri (cerință explicită din
  `INSTRUCTIUNE_HOSTIX_Izolare_Securizata.md`, Secțiunea 3.2). Ambele
  cazuri au test dedicat (vezi `src/scripts/testProvision.ts`).
- **Parola de acces a site-ului** — hash bcrypt (`core.sites.access_password_hash`),
  nimeni (nici admin) nu o poate citi înapoi.
- **Parola rolului Postgres al fiecărui site** — criptată (nu hash) cu
  `pgcrypto`, folosind o cheie master din `PGCRYPTO_MASTER_KEY` — trebuie
  să fie recuperabilă (aplicația se conectează cu ea), spre deosebire de
  parola de acces a familiei.

## Setup local

```
npm install
cp .env.example .env   # completeaza cu datele tale de Postgres local
npm run dev:migrate    # aplica core schema (o singura data)
npm run build
npm run test:provision # provisioneaza 2 site-uri de test si verifica izolarea
npm start               # porneste serverul pe :3000
```

## Flux real de autentificare (implementat 23 iulie 2026)

Login-ul e pe email, nu pe `site_number` — deciziile lui Mircea din aceeași zi:

1. **`POST /api/login`** `{email, password}` — caută site-ul după
   `core.site_emails.email` (o familie poate avea mai multe email-uri;
   primul e `is_primary`), verifică `access_password_hash` (bcrypt).
   La succes creează o sesiune (`core.sessions`, token în cookie
   `mypal_session`, httpOnly, **fără expirare automată** — "asta e casa
   lor"). Răspunsul include `password_is_default`.
2. **Doar la prima intrare** (`password_is_default = true`): frontend-ul
   arată alegerea păstrează/schimbă. `POST /api/auth/keep-password` sau
   `POST /api/auth/set-password {new_password}`.
3. **Delogare protejată** — `POST /api/auth/logout {password}` cere
   reconfirmarea parolei familiei înainte să revoce sesiunea (protecție la
   glumele copiilor, cerere explicită Mircea).
4. **Consiliul Familiei** (`GET/POST/PUT /api/family/members`, cu sesiunea
   de familie) — Titularul setează `relation_label` + `member_code` per
   membru. `member_code` e stocat **în clar** (nu hash) — decizie explicită
   Mircea: separarea fluxurilor între membri e o formalitate internă
   (mediu privat Claude Team), nu securitate reală, deci nu trebuie sa fie
   ireversibil. `GET /api/family/consilier-line` produce linia unică
   `Rol-Nume-Cod ; ...` codificată Base64, pe care Titularul o postează
   manual la fiecare Consilier (Advix/Adviz/Verix/Vivix) — verificarea
   Nume+Cod în chat rămâne manuală/conversațională, Consilierii nefiind
   (încă) conectați live la acest backend.

## Comenzi și alocare (plată → emitere site+parolă)

Pentru pilot (20-30 comenzi), fără procesator de plăți — confirmarea e
manuală, din `myPAL_Admin.html` (protejat cu header `x-admin-token`,
secretul `ADMIN_TOKEN` din `/etc/mypal/db.env`, generat automat la deploy).

1. **`POST /api/orders`** `{family_name, email, plan}` (public) — scrie o
   comandă `pending` în `core.orders`.
2. **`POST /api/admin/orders/:id/confirm-payment`** (admin) — alocă primul
   site nevândut (`core.sites.allocated_at IS NULL`, sau provisionează unul
   nou dacă rezerva e goală), generează parola, o hash-uiește, trimite
   emailul (`src/mail.ts`, prin SMTP GoDaddy Workspace Email —
   `SMTP_HOST/PORT/USER/PASSWORD`, secrete GitHub, scrise în
   `/etc/mypal/db.env` la fiecare deploy) și marchează alocarea. Parola în
   clar există o singură dată, local, cât să fie trimisă — Admin nu o vede
   niciodată în răspuns (`Nume+Email+Parolă Blank`, cerință explicită
   Mircea).

## Ce lipsește încă (nu blocant pentru pilot, dar de știut)

- Wiring frontend pentru Consiliul Familiei (`myPAL_Acasa.html`) — API-ul
  există (`/api/family/members`, `/api/family/consilier-line`), dar tabelul
  de membri din overlay rămâne pe datele mock existente; conectarea la API
  e următorul pas.
- Lista exactă de categorii (10-20 per domeniu) — schema `categories` e
  gata, dar neseeded — așteaptă lista finală de la Mircea/Safix.
- Cererea de înlocuire clonă (`clone_replacement_requests`) — tabelul
  există, endpoint-ul de creare nu e încă scris.
- Legătura cu sistemul extern de coduri (`Cod XXX.XXX` / `Parolă FAB-...`)
  — presupunere curentă: `site_number` (`core.sites.site_number`) chiar
  este acest cod, alocat extern și pre-perechiat. De confirmat.
