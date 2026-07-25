import bcrypt from 'bcrypt';
import { adminPool } from '../db/adminPool';
import { allocateSite } from '../db/allocate';

// Creeaza (sau reactiveaza) un cont de test cu parola ALEASA (nu cea
// generata random de allocateSite), ca sa poata fi folosit direct pt
// teste manuale usoare - date exclusiv fictive.
async function main() {
  const familyName = process.argv[2];
  const email = process.argv[3];
  const password = process.argv[4];
  if (!familyName || !email || !password) {
    throw new Error('Foloseste: node createTestAccount.js <nume_familie> <email> <parola>');
  }

  const existing = await adminPool.query(
    `SELECT s.id, s.site_number FROM core.site_emails e JOIN core.sites s ON s.id = e.site_id WHERE e.email = $1`,
    [email]
  );

  let siteId: number;
  let siteNumber: string;
  if (existing.rowCount! > 0) {
    siteId = existing.rows[0].id;
    siteNumber = existing.rows[0].site_number;
  } else {
    const allocated = await allocateSite(familyName, email, 'plan-test');
    siteId = allocated.siteId;
    siteNumber = allocated.siteNumber;
  }

  const hash = await bcrypt.hash(password, 10);
  await adminPool.query(
    `UPDATE core.sites SET family_name = $1, access_password_hash = $2, password_is_default = false WHERE id = $3`,
    [familyName, hash, siteId]
  );

  console.log(`SITE_NUMBER=${siteNumber}`);
  console.log(`Cont de test gata pt ${email}`);
  await adminPool.end();
}

main().catch((err) => {
  console.error('EROARE:', err);
  process.exit(1);
});
