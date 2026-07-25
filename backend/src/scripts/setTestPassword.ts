import bcrypt from 'bcrypt';
import { adminPool } from '../db/adminPool';

// Seteaza o parola aleasa (nu generata random) pt un site identificat dupa
// email - util cand vrem sa stim sigur parola dinainte (evita coliziuni de
// mascare in log-uri CI), nu pt fluxul real de alocare.
async function main() {
  const email = process.argv[2];
  const newPassword = process.argv[3];
  if (!email || !newPassword) throw new Error('Foloseste: node setTestPassword.js <email> <parola_noua>');

  const site = await adminPool.query(
    `SELECT s.id, s.site_number FROM core.site_emails e JOIN core.sites s ON s.id = e.site_id WHERE e.email = $1`,
    [email]
  );
  if (site.rowCount === 0) throw new Error(`Niciun site gasit pt email ${email}`);

  const hash = await bcrypt.hash(newPassword, 10);
  await adminPool.query(
    `UPDATE core.sites SET access_password_hash = $1, password_is_default = true WHERE id = $2`,
    [hash, site.rows[0].id]
  );
  console.log(`SITE_NUMBER=${site.rows[0].site_number}`);
  console.log(`Parola setata cu succes pt ${email}`);
  await adminPool.end();
}

main().catch((err) => {
  console.error('EROARE:', err);
  process.exit(1);
});
