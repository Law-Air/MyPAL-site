# FIȘĂ DE MANEVRĂ — ACCES TEMPORAR ADMIX LA PROIECTE
**Ecosistem MyPAL / FIN-AIR — control acces pe fereastră de timp**

---

## Principiu

Accesul Admix (operator/support) la Proiectele claude.ai ale familiilor este **normal închis**. Se deschide EXCLUSIV pe durata unei operațiuni de migrare/înlocuire clonă, strict pentru proiectele necesare, și se închide imediat după.

**Regulă fixă: fără fișă completată, fără deschidere de acces.**

---

## SECȚIUNEA A — Înainte de deschidere (completează Admin)

| Câmp | Valoare |
|---|---|
| Nr. fișă / dată | |
| Operațiune (ce se migrează) | |
| Proiect(e) vizate (cod exact) | |
| Motiv migrare | |
| Timp estimat necesar (calculat din nr. migrări) | |
| Marjă adăugată | |
| **Fereastră alocată (estimat + marjă)** | |
| Ora programată deschidere | |
| Ora programată închidere | |
| Admix (nume/cont operator) | |
| Aprobat de (Admin) | |

**Regulă de dimensionare:** fereastra alocată nu este niciodată egală cu timpul minim necesar — include întotdeauna o marjă rezonabilă. Marja reduce presiunea de timp asupra operatorului, nu perimetrul de securitate (proiectele vizate rămân strict cele listate, indiferent de durată).

---

## SECȚIUNEA B — La deschidere (completează Admin, în momentul acțiunii)

- [ ] Am verificat că sunt deschise **DOAR** proiectele listate în Secțiunea A — niciun altul
- [ ] Ora reală de deschidere: _______
- [ ] Am notificat Admix că fereastra e activă și durata ei

---

## SECȚIUNEA C — În timpul ferestrei (completează Admix)

| Acțiune efectuată | Ora | Observații |
|---|---|---|
| | | |
| | | |

**Reguli obligatorii pentru Admix în fereastra deschisă:**
- Execută STRICT operațiunea de migrare pentru care a fost deschis accesul
- Nu deschide, nu citește, nu copiază alt conținut din Proiect în afara acțiunii necesare
- Dacă observă, ÎNAINTE de expirare, că nu se va încadra — solicită extindere prin Secțiunea C1, nu așteaptă expirarea ferestrei

### C1 — Cerere de extindere (dacă e cazul, completată de Admix, ÎNAINTE de expirare)

| Câmp | Valoare |
|---|---|
| Ora cererii | |
| Timp suplimentar solicitat | |
| Motiv | |
| Răspuns Admin (aprobat/respins) | |
| Ora nouă de închidere (dacă aprobat) | |

**Notă:** o extindere aprobată **nu** e o abatere — e procesul funcționând corect. Doar o **depășire fără cerere de extindere** (fereastra a expirat fără ca Admix să fi semnalat din timp) se marchează ca eveniment de discutat la Secțiunea E.

---

## SECȚIUNEA D — La închidere (completează Admin)

- [ ] Am verificat că Proiectul/Proiectele din Secțiunea A sunt din nou **închise** pentru Admix
- [ ] Ora reală de închidere: _______
- [ ] Am verificat că nu a rămas nicio invitație/acces activ pe niciun alt Proiect
- [ ] Operațiunea de migrare a fost confirmată reușită (verificat separat, la nivel de Postgres/backend, conform testului de izolare)

---

## SECȚIUNEA E — Verificare finală și arhivare

- [ ] Fișa completă (A-D) este arhivată în registrul de audit al ecosistemului
- [ ] Durata reală a ferestrei a corespuns cu cea programată (dacă NU, se notează motivul abaterii)
- [ ] Semnătură Admin: _______________
- [ ] Semnătură/confirmare Admix: _______________

---

## Notă tehnică (SAFIX)

Această fișă disciplinează un proces în prezent **manual**. Nu înlocuiește garanția tehnică reală de izolare (care rămâne exclusiv la nivel Postgres, per Instrucțiunea Hostix separată) — este un control administrativ suplimentar, pentru fereastra de timp în care Admix are, inevitabil, vizibilitate asupra conținutului Proiectului deschis.

Dacă frecvența migrărilor crește, acest proces poate fi parțial automatizat (deschidere/închidere programată prin script, cu jurnal automat) — de evaluat cu Hostix când volumul o justifică.

---

## Implementare Hostix (adăugat la primire)

Mecanismul din Secțiunile A/C1/E e implementat și testat în
`core.access_windows` + `core.access_window_extensions`
(`backend/src/db/accessWindow.ts`):

- `estimated_minutes` vs. `window_start`/`window_end` — separate,
  exact ca în Secțiunea A.
- `requestExtension()` / `decideExtension()` — Secțiunea C1, cu
  jurnalizare separată a cererii și a deciziei.
- `unflagged_overrun` — semnalul cerut la Secțiunea C1/E: **true** doar
  la depășire FĂRĂ extindere aprobată acoperitoare; o extindere
  aprobată nu-l declanșează.

Testat adversarial, 3 scenarii (închidere normală, extindere aprobată,
depășire nesemnalată) — toate cu rezultatul așteptat. Detaliu complet
în `backend/FISE_TEHNICE_IZOLARE.md`, Fișa 5.
