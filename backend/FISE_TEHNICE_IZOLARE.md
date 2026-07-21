# Fișe tehnice — Teste de izolare efectuate (Hostix → Safix)

Document strict tehnic, cu dovezi. Fiecare fișă separă clar: ce s-a
testat, cum, rezultatul exact (eroare Postgres reală, nu presupunere),
și — esențial — **ce NU acoperă** testul. Traducerea în limbaj de
asigurare pentru familii rămâne rolul lui Safix/Echipei, nu al acestui
document.

---

## Fișa 1 — Izolare între microsite-uri (familii diferite)

**Ce garantează:** o familie nu poate, prin nicio cale tehnică, să
citească sau să modifice datele altei familii.

**Cum s-a testat:** provisionate 2 site-uri de test, fiecare cu schema
Postgres proprie și rol de bază de date propriu. S-a încercat explicit,
folosind rolul Site-ului B, citirea directă a schemei Site-ului A.

**Rezultat (dovadă, nu presupunere):**
```
permission denied for schema site_1_1
```
Refuzul vine de la Postgres însuși, la nivel de motor de bază de date —
nu dintr-un `if` în codul aplicației, care ar putea fi ocolit sau uitat
la o modificare viitoare.

**Mecanism:** fiecare site are propria schemă + propriul rol Postgres,
cu drepturi acordate STRICT pe schema proprie, niciodată transversal.

---

## Fișa 2 — Izolare față de contul tehnic de administrare (provisionare)

**Ce garantează:** nici contul folosit pentru a CREA site-uri noi
(operațiune tehnică, nu are legătură cu vizualizarea datelor) nu poate
citi conținutul vreunei familii, odată ce site-ul e creat.

**Cum s-a testat:** provisionat un site, apoi s-a încercat explicit,
folosind contul de administrare tehnică, citirea directă a datelor
familiei din acel site.

**Rezultat:**
```
permission denied for table family_members
```

**Notă de transparență:** acesta a fost inițial un gol real în
implementare (contul de creare rămânea, implicit, proprietarul
tabelelor create — proprietatea ocolește restricțiile de acces).
Identificat și corectat înainte de orice utilizare cu date reale —
proprietatea tabelelor se transferă către rolul site-ului imediat după
creare, în aceeași operațiune.

---

## Fișa 3 — Parola de acces a familiei

**Ce garantează:** parola cu care familia intră în propriul microsite
nu poate fi citită, recuperată sau vizualizată de nimeni — nici de
Hostix, nici de un viitor administrator, nici teoretic.

**Mecanism:** parola nu se stochează niciodată — se stochează doar o
"amprentă" matematică unidirecțională (hash bcrypt). Sistemul poate doar
VERIFICA dacă o parolă introdusă se potrivește cu amprenta; nu există
nicio operație care transformă amprenta înapoi în parolă.

**Distincție importantă:** parola familiei e complet SEPARATĂ de
parola tehnică a conexiunii la baza de date a site-ului respectiv (care
există, dar servește alt scop — conectarea aplicației la schema
site-ului, nu autentificarea familiei). Compromiterea uneia nu oferă
cale către cealaltă.

---

## Fișa 4 — Operațiunea de înlocuire/migrare clonă

**Context:** s-a analizat explicit dacă mutarea unei conversații între
Proiecte claude.ai (mecanismul discutat inițial) poate fi făcută în
siguranță, cu acces limitat doar la operațiunea de mutare, fără
vizibilitate asupra restului conținutului familiei.

**Constatare (verificată, nu presupusă):** pe claude.ai, singurul nivel
de permisiune sub „poate edita" este „poate folosi" — iar „poate
folosi" acordă deja vizibilitate completă asupra conținutului existent
al Proiectului. Nu există o permisiune de tipul „poate doar adăuga".

**Decizie rezultată:** mecanismul de mutare manuală prin interfața
claude.ai **nu se folosește cu date reale de familie**. În schimb:
- Evidența clonelor (serie, generație, istoric înlocuiri) se ține
  integral în Postgres, cu acces la fel de restricționat ca datele de
  familie (nicio persoană/cont nu poate citi conținutul familiei doar
  pentru a gestiona evidența clonelor).
- Pentru pasul care încă necesită acțiune manuală pe claude.ai (nu
  există alternativă tehnică — verificat, Admin API-ul Anthropic
  gestionează conturi/membri, nu conținut de Proiect), s-a implementat
  un mecanism de **acces temporar, time-boxed, jurnalizat**
  (`access_windows`) — operatorul primește acces la Proiectul unei
  familii DOAR pe durata efectivă a migrării, niciodată permanent,
  cu fiecare deschidere/închidere înregistrată.

---

## Fișa 5 — Dimensionarea ferestrelor `access_windows` și procedura de extindere

**Context:** ferestrele time-boxed (Fișa 4) reduc expunerea, dar dacă
sunt calculate strict la minimul tehnic necesar (ex. 5 minute pentru 3
migrări), orice variație normală (întârziere de rețea, o clarificare
necesară, o eroare de tastare) transformă o activitate corectă
într-o depășire de fereastră — ceea ce fie întrerupe operatorul la
mijlocul unei migrări, fie îl obligă să justifice o abatere pentru un
incident care nu a afectat securitatea datelor.

**Decizie (Admin + Safix + Hostix):** timpul alocat unei ferestre =
timp estimat pentru operațiune + marjă. Marja nu relaxează perimetrul
de securitate (fereastra rămâne time-boxed, jurnalizată, restrânsă la
proiectele necesare) — doar recunoaște variabilitatea normală a
lucrului uman.

**Mecanism implementat (`core.access_windows` + `core.access_window_extensions`):**
- Câmp `estimated_minutes` (estimare tehnică minimă) separat de
  `window_start`/`window_end` (fereastra alocată = estimare + marjă) —
  ambele vizibile în jurnalul ferestrei, nu contopite.
- Procedură de **extindere pro-activă**: dacă operatorul (Admix)
  observă, ÎNAINTE de expirare, că nu se va încadra, poate cere
  extindere prin sistem — cererea (motiv, timp suplimentar) și decizia
  Admin (aprobat/respins) se jurnalizează separat, timestampat.
- Câmp `unflagged_overrun`: **true doar** dacă fereastra s-a închis
  DUPĂ termenul alocat (eventual extins) FĂRĂ nicio extindere aprobată
  care să acopere acel moment. O extindere aprobată nu declanșează
  acest semnal — e procesul funcționând corect, nu o abatere.

**Testat adversarial, 3 scenarii — toate confirmate:**
1. Închidere normală, în termen → fără semnal.
2. Extindere cerută, aprobată, închidere în noul termen → fără semnal.
3. Închidere după termenul alocat, fără nicio cerere de extindere →
   semnal declanșat corect (`unflagged_overrun = true`).

**Ce NU schimbă acest mecanism:** fereastra rămâne time-boxed și
restrânsă la proiectele explicit listate; extinderea prelungește durata,
nu lărgește niciodată scopul (proiectele) accesului deja aprobat.

---

## Ce NU e acoperit de aceste teste (limite explicite)

- **Izolarea între Proiecte claude.ai** (Team/Enterprise) nu a fost
  verificată tehnic de Hostix — ține de platforma Anthropic, nu de
  infrastructura Postgres construită aici. Orice afirmație pe acest
  subiect trebuie confirmată separat, la sursă.
- **Fereastra de acces temporar reduce, dar nu elimină** expunerea în
  timpul unei migrări efective — operatorul chiar vede conținutul
  Proiectului cât timp fereastra e deschisă.
- **Backup/restore per-schema** — cerut de Safix (Secțiunea 3.4), încă
  neimplementat, deci netestat.

---

*Document pregătit de Hostix pentru Safix, ca bază tehnică a fișei de
confidențialitate/izolare pentru familii. Toate rezultatele de mai sus
sunt reproductibile — codul de test există în
`backend/src/scripts/testProvision.ts`.*
