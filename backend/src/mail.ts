// Fara SMTP configurat inca. Pana primim datele unui furnizor real
// (SMTP sau API), doar logam continutul — Admin poate trimite manual din
// jurnal daca e nevoie. Inlocuieste doar implementarea de aici cand exista
// credentiale, restul codului (allocate.ts, app.ts) nu se schimba.
export async function sendMail(to: string, subject: string, body: string): Promise<void> {
  console.log(`[MAIL STUB] catre=${to} subiect="${subject}"\n${body}`);
}
