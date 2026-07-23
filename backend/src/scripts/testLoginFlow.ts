import bcrypt from 'bcrypt';
import { allocateSite } from '../db/allocate';
import { adminPool } from '../db/adminPool';

// Script de diagnostic, NU calea de productie: allocateSite() intoarce
// parola in clar direct (ca sa poata fi trimisa pe email), lucru pe care
// endpoint-urile publice/admin nu-l fac niciodata. Il folosim aici doar ca
// sa putem testa end-to-end fluxul de login, fara sa afectam designul
// real (Admin nu vede niciodata parola in raspunsul API-ului adevarat).
async function main() {
  const email = `smoke-${Date.now()}@example.com`;
  const result = await allocateSite('Familie Test Smoke', email, 'start');

  const row = await adminPool.query('SELECT access_password_hash FROM core.sites WHERE id = $1', [result.siteId]);
  const hashOk = await bcrypt.compare(result.password, row.rows[0].access_password_hash);

  console.log(`SITE_NUMBER=${result.siteNumber}`);
  console.log(`HASH_VERIFICAT_LOCAL=${hashOk}`);
  console.log(`EMAIL=${email}`);
  console.log(`PASSWORD=${result.password}`);

  await adminPool.end();
}

main().catch((err) => {
  console.error('EROARE:', err);
  process.exit(1);
});
