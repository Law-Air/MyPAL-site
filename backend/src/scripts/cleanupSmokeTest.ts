import { adminPool } from '../db/adminPool';

// Reverseaza exact efectele testLoginFlow.ts / testarilor de comanda: site-ul
// 1/000.001 (pastrat de Mircea pt teste de casa viitoare si istorie) inapoi
// la starea nealocata, si sterge comenzile fictive create in timpul testelor.
async function main() {
  const site = await adminPool.query(`SELECT id FROM core.sites WHERE site_number = '1/000.001'`);
  if (site.rowCount! > 0) {
    const siteId = site.rows[0].id;
    await adminPool.query(`DELETE FROM core.sessions WHERE site_id = $1`, [siteId]);
    await adminPool.query(`DELETE FROM core.site_emails WHERE site_id = $1`, [siteId]);
    await adminPool.query(
      `UPDATE core.sites
       SET family_name = NULL, access_password_hash = NULL,
           password_is_default = true, allocated_at = NULL, subscription_plan = 'start'
       WHERE id = $1`,
      [siteId]
    );
    console.log('Site 1/000.001 resetat la starea nealocata.');
  } else {
    console.log('Site 1/000.001 nu a fost gasit — nimic de resetat.');
  }

  const del = await adminPool.query(`DELETE FROM core.orders WHERE email LIKE 'smoke-%@example.com'`);
  console.log(`Comenzi de test sterse: ${del.rowCount}`);

  await adminPool.end();
}

main().catch((err) => {
  console.error('EROARE:', err);
  process.exit(1);
});
