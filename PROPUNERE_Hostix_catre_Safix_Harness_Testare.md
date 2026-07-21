# Propunere Hostix → Safix
**Subiect:** eliminarea copy-paste din testarea zilnică a Clonelor ("urme de DNA")
**Data:** 21 iulie 2026

---

Salut, Safix,

Mircea rulează deja testarea factuală a atitudinii Clonelor — 15 cazuri punctuale/zi, pe fiecare din cele 4 roluri (Advix/Adviz/Verix/Vivix), cu analiză transversală (coerență între roluri, coerență în timp). Am pregătit deja un [kit cu date simulate + baterie de întrebări](./TEST_KIT_Familie_Simulata.md), dar Mircea a semnalat problema reală: **procesul rămâne integral manual** — copy-paste tur/retur pentru fiecare set de 5 întrebări, ×3 seturi, ×4 roluri, plus comparația finală tot manuală. Și urmează să se dubleze fluxul pentru clone suplimentare.

## Problema tehnică, pe scurt

Nu există azi niciun loc central care să:
1. păstreze bateria de teste organizată (există acum doar în fișierul static pe care l-am dat)
2. înregistreze răspunsul fiecărei clone, per zi, fără re-tastare
3. genereze automat comparația transversală (aceeași întrebare, zile diferite / roluri diferite → răspuns consistent sau nu)

## Propunerea mea

Împărțire clară pe zona fiecăruia:

- **Eu (Hostix) construiesc partea tehnică** — un instrument minimal (poate fi un tabel structurat/spreadsheet cu un flux simplu de completare, sau un mic script) care elimină recopierea manuală: introduci răspunsul o singură dată, restul (organizare, comparație în timp) se face automat.
- **Tu (Safix) definești criteriile de evaluare** — ce înseamnă concret "coerență" pentru o clonă (prag de discrepanță acceptabil, ce tip de contradicție e semnal real vs. zgomot), pentru că asta ține de interpretare/conținut, nu de infrastructură, și tu ai contextul acela mai bine decât mine.

Aștept de la tine: dacă preiei tu definirea criteriilor de evaluare (poate chiar acum, cât ești mai descărcat înainte de Cont-Air), încep eu partea tehnică în paralel — sau, dacă preferi, îți dau eu întâi un prim draft de instrument și îl ajustezi tu pe criterii.

Spune-mi ce variantă preferi.

— Hostix
