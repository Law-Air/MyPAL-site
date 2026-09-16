# Notă tehnică — Arhitectura de acces a Consilierilor (Claude TEAM vs. GPT Custom GPT)

**Pentru:** Mircea (strategie business / arhitectura Metoda AIR)
**De la:** Hostix (rol tehnic hosting & deployment)
**Data:** 16 septembrie 2026
**Scop:** consemnează problema de arhitectură descoperită azi — accesul unui Client extern (nu membru Claude TEAM) la Consilierii lui — opțiunile verificate, de ce fiecare a fost respinsă, și pista candidată găsită la GPT.

---

## 1. Problema

Toată construcția Consilierilor (Advix/Adviz/Verix/Vivix) s-a bazat, până azi, pe linkuri `claude.ai/chat/...` sau `claude.ai/project/...`, dintr-un cont Claude **TEAM**, ales explicit pentru izolarea privată reală dintre Proiecte (testată și confirmată anterior).

Presupunerea nespusă a fost: **oricine primește linkul, îl poate deschide**. Fals. Un Proiect TEAM e vizibil DOAR membrilor organizației respective — Claude nu are, nici la Team, nici la Enterprise, niciun rol de "vizitator extern". Confirmat direct din documentația oficială Anthropic, nu presupus.

Consecință: un Client care a plătit intrarea în micro-site-ul lui, dar nu e membru al organizației tale, nu poate deschide linkul Consilierului lui — pentru că nu e logat ca membru al Team-ului tău, și nu are cum să devină, în arhitectura actuală.

---

## 2. Opțiuni verificate azi, și de ce fiecare cade

| # | Opțiune | Rezultat verificării | De ce nu merge |
|---|---|---|---|
| 1 | Invitarea Clientului ca membru TEAM, scopat la Proiectul lui | Tehnic corect și permis de Termeni | Plafon dur de 150 de locuri per organizație; cost real minim 20-25$/lună/loc — nu scalează economic la mulți clienți |
| 2 | Clientul se loghează cu credențialele tale (Owner) | **Interzis explicit** prin Termenii de Utilizare Anthropic ("nu poți face contul disponibil altcuiva") | Risc de suspendare a întregului cont organizațional — nu doar o mustrare |
| 3 | Cont Claude separat, propriu, per familie (Free sau Pro) | Confidențialitate reală — fiecare cont complet izolat | Verificare obligatorie prin telefon la înregistrare, din 2026, **maximum 3 conturi per număr de telefon** — nu poate fi pre-provizionat în masă; ar trebui deschis de fiecare familie, cu propriul telefon |
| 4 | Chiar presupunând contul propriu al familiei (opțiunea 3) — migrăm o Clonă deja formată acolo | Verificat contra regulilor Metoda AIR | Clona se desprinde din Mamă STRICT în același mediu cu ea; Mama trebuie FORMATĂ ÎN TIMP, sub asistență umană, nativ în mediul țintă — nu se poate scurtcircuita prin transfer de fișiere. Fiecare cont nou ar cere o Mamă formată de la zero (1-2 luni) — nefezabil per client, la scară |
| 5 | Claude Enterprise | Ridică plafonul de 150 (scalează) și adaugă SSO/SCIM | Minim 20 de locuri, doar facturare anuală, ~20$/loc/lună + consum API — și **tot nu introduce conceptul de vizitator fără loc plătit**. Rezolvă plafonul, nu costul |

**Concluzie Secțiunea 2:** la Claude, în orice variantă (Team sau Enterprise), nu există azi un mecanism nativ prin care un vizitator extern, fără cont-membru plătit în organizația ta, să acceseze un Proiect privat.

---

## 3. Ce am observat că există deja la GPT — și chiar funcționează, testat, la voi

**Custom GPT-urile publicate printr-un link public permit oricărui utilizator ChatGPT (inclusiv cont Free) să deschidă acel link și să capete propria lui conversație — separată de a oricui altcuiva — fără nicio organizație/echipă/membership.**

Mai mult: **Searchix (my-PAL) funcționează deja exact așa**, astăzi, testat și confirmat funcțional în producție — familia deschide linkul public al Custom GPT-ului lui Searchix, fără să fie membră în vreun cont al tău.

Diferența structurală față de Claude:
- **Claude Project** = spațiu de echipă internă; vizibilitatea e legată strict de membership-ul organizației.
- **ChatGPT Custom GPT** = produs public, distribuibil prin link; fiecare vizitator capătă o instanță proprie, fără cont-membru în organizația creatorului.

Motivul pentru care nu ai "săpat" la GPT până acum (lipsa confidențialității de tip TEAM între Proiecte) rămâne un punct real de atenție — dar pentru CAZUL DE UTILIZARE al Consilierilor (un vizitator = o instanță privată a lui, nu vizibilitate încrucișată între Proiectele tale interne), s-ar putea ca acest neajuns să nu fie relevant, dacă fiecare Client oricum are propriul link, propriul GPT, nu un Proiect comun vizibil altora.

**Precizare importantă (16 septembrie 2026, după verificare cu Mircea):** Searchix are, pe lângă linkul public de chat, și un rol de "Agent CoWork" (patrulările de la 9:00/15:00) — confirmat că acesta ține de mecanismul VECHI, "Scheduled Task" (nu de "ChatGPT Work", produsul nou din 2026, cu restricții de tip workspace similare cu Claude Cowork). Verificat tehnic: la OpenAI, un Scheduled Task NU poate rula în interiorul unui Custom GPT — sunt două mecanisme separate. Deci Searchix e, de fapt, două piese distincte lipite: (a) patrularea programată, centrală, sub contul lui Mircea, și (b) linkul public de Custom GPT, prin care fiecare familie capătă propria conversație. **Advix/Adviz/Verix/Vivix au nevoie doar de piesa (b)** — nu de patrulare programată — deci riscul legat de "ChatGPT Work" nu se aplică deloc cazului lor.

---

## 4. Ce rămâne de testat concret, înainte de decizie — nu presupunem, verificăm

1. **Persistență reală per vizitator**: confirmă că fiecare vizitator care deschide linkul unui Custom GPT capătă un fir de conversație separat și **persistent în timp** (memorie proprie care se acumulează), nu doar o sesiune anonimă golită la fiecare vizită — esențial pentru Metoda AIR (Mama trebuie să acumuleze istoric propriu).
2. **Statutul bazei comune**: fișierele de cunoștințe/instrucțiunile încărcate în Custom GPT — sunt comune tuturor vizitatorilor (echivalentul unei "Mame"/"Profesor" comune), sau editabile per-utilizator? Trebuie clarificat cum se mapează pe regulile Metoda AIR (Profesor/Mamă/Clonă).
3. **Limite de utilizare**: verifică dacă există plafoane de mesaje/utilizare per Custom GPT sau per cont care ar afecta o familie activă zilnic.
4. **Termeni de Utilizare OpenAI**: verificare simetrică cu ce am făcut la Anthropic — nu presupunem că GPT nu are propriile restricții similare (partajare de cont, creare de conturi în masă, etc.).

---

## 5. Recomandare

Test pilot pe UNA din cele 20 de familii de Clone deja pregătite în Șantier: migrare/recreare a unui singur Rol pe un Custom GPT, verificare directă a persistenței și izolării per vizitator, înainte de a decide pivotarea arhitecturii pentru toți cei 4 Consilieri și pentru FinAIR/LawAIR/SimulAIR.
