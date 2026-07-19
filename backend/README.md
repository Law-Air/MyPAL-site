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
  (`src/db/sitePool.ts`). Testat: un site nu poate citi schema altuia
  (vezi `src/scripts/testProvision.ts`).
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

## Ce lipsește încă (nu blocant pentru pilot, dar de știut)

- Sesiuni reale după login (acum doar confirmă parola, nu emite token/cookie).
- PIN-uri membri familie (`family_members.pin_hash`) — coloana există, nu e
  încă folosită de niciun endpoint.
- Lista exactă de categorii (10-20 per domeniu) — schema `categories` e
  gata, dar neseeded — așteaptă lista finală de la Mircea/Safix.
- Cererea de înlocuire clonă (`clone_replacement_requests`) — tabelul
  există, endpoint-ul de creare nu e încă scris.
- Legătura cu sistemul extern de coduri (`Cod XXX.XXX` / `Parolă FAB-...`)
  — presupunere curentă: `site_number` (`core.sites.site_number`) chiar
  este acest cod, alocat extern și pre-perechiat. De confirmat.
