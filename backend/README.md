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

### Flux real de autentificare (clarificat cu Mircea, 23 iulie 2026) — de implementat

`/api/login` e construit azi pe `site_number` + parolă, dar fluxul REAL, pe
3 niveluri, e diferit:

1. **Prima intrare** — verificare adresă de email (a familiei).
2. **Intrări ulterioare** — email + **parola familiei** (poate exista și un
   al doilea email de familie, adăugat ulterior). Aceasta e parola-mamă
   emisă la alocarea site-ului (`core.sites.access_password_hash`), dar
   verificarea se face după EMAIL, nu după `site_number` direct — deci
   `core.sites` are nevoie de o coloană `email` (sau un tabel separat, dacă
   se acceptă mai multe email-uri per familie), iar `/api/login` trebuie
   rescris sa caute site-ul dupa email, nu dupa `site_number`.
3. **În Acasă → Consiliul Familiei** — reprezentantul familiei (Titular)
   activează codurile (PIN-urile) celorlalți membri, autorizat cu parola
   familiei. Aici intră în joc `family_members.pin_hash` — dar activarea
   e o acțiune a Titularului, nu un login separat al fiecărui membru.

Pe frontend, ecranul "Intră în casă" din `myPAL_Acasa.html` (funcția
`intraAcasa()`) NU e conectat azi la niciunul dintre aceste niveluri —
verifică doar `lungime >= 4`, fără sa valideze nimic real. La fel, codul
din overlay-ul Verix (`v1`-`v4`) e un al treilea cod, separat, folosit doar
ca sa deschidă fereastra de chat — neconfirmat inca daca ramane asa sau
se leaga de PIN-ul membrului.

**De facut, pas cu pas:** (1) adaugă `email` la `core.sites` (sau tabel
separat pt mai multe email-uri), (2) rescrie `/api/login` sa caute dupa
email, (3) construiește ecranul de verificare email (prima intrare),
(4) conectează Consiliul Familiei la un endpoint real de activare PIN-uri
membri, autorizat cu parola familiei deja validata la login.
