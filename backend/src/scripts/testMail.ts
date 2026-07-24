import { sendMail } from '../mail';

// Test minimal de SMTP real, fara nicio legatura cu alocarea de site-uri.
async function main() {
  const to = process.argv[2];
  if (!to) throw new Error('Foloseste: node testMail.js <adresa-destinatie>');
  await sendMail(to, 'Test SMTP myPAL', 'Daca citesti asta, SMTP-ul (Titan/GoDaddy) e configurat corect. Trimis de Hostix.');
  console.log(`Email trimis catre ${to}`);
}

main().catch((err) => {
  console.error('EROARE:', err);
  process.exit(1);
});
