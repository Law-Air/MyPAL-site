import bcrypt from 'bcrypt';
import { Pool } from 'pg';
import { provisionSite } from '../db/provision';
import { getSitePool } from '../db/sitePool';
import { adminPool } from '../db/adminPool';

// Date exclusiv fictive — nicio informatie reala de familie in teste,
// conform cerintei Safix (Sectiunea 3.3).
function safe(result: { siteNumber: string; schemaName: string; dbRoleName: string }) {
  return { siteNumber: result.siteNumber, schemaName: result.schemaName, dbRoleName: result.dbRoleName };
}

async function main() {
  console.log('--- Provisionez Site A (familie test) ---');
  const siteA = await provisionSite('Familie Test A');
  console.log(safe(siteA)); // parola rolului NU se afiseaza, nici in teste

  console.log('--- Provisionez Site B (familie test) ---');
  const siteB = await provisionSite('Familie Test B');
  console.log(safe(siteB));

  const testPassword = 'parola-test-123';
  const hash = await bcrypt.hash(testPassword, 10);
  await adminPool.query('UPDATE core.sites SET access_password_hash = $1 WHERE id = $2', [hash, siteA.siteId]);
  console.log('--- Parola de acces setata pt Site A (doar hash stocat) ---');

  const poolA = await getSitePool(siteA.siteNumber);
  if (!poolA) throw new Error('poolA null');
  await poolA.query(
    `INSERT INTO family_members (first_name, is_titular) VALUES ('Membru Test', true)`
  );
  console.log('--- Membru familie (fictiv) adaugat in Site A, prin rolul dedicat Site A ---');

  const membersA = await poolA.query('SELECT first_name, is_titular FROM family_members');
  console.log('Membri Site A (cititi prin rolul A):', membersA.rows);

  console.log('--- Test izolare 1: Site B incearca sa citeasca schema Site A ---');
  const poolB = await getSitePool(siteB.siteNumber);
  if (!poolB) throw new Error('poolB null');
  const schemaA = siteA.schemaName;
  try {
    await poolB.query(`SELECT * FROM ${schemaA}.family_members`);
    console.log('EROARE DE SECURITATE: Site B a putut citi datele Site A!');
    process.exitCode = 1;
  } catch (err: any) {
    console.log('CORECT — Site B NU poate accesa schema Site A. Eroare Postgres:', err.message);
  }

  console.log('--- Test izolare 2: contul de provisionare (mypal_admin) incearca sa citeasca datele Site A ---');
  try {
    await adminPool.query(`SELECT * FROM ${schemaA}.family_members`);
    console.log('EROARE DE SECURITATE: contul de provisionare a putut citi datele familiei!');
    process.exitCode = 1;
  } catch (err: any) {
    console.log('CORECT — mypal_admin NU poate citi continutul familiei (doar structura, la provisionare). Eroare Postgres:', err.message);
  }

  console.log('--- Test login corect (Site A, parola buna) ---');
  const validCompare = await bcrypt.compare(testPassword, hash);
  console.log('Parola verificata local (bcrypt):', validCompare);

  await adminPool.end();
  const pools = [poolA, poolB];
  for (const p of pools) await (p as Pool).end();
  console.log('--- Test complet, toate conexiunile inchise ---');
}

main().catch((err) => {
  console.error('EROARE:', err);
  process.exit(1);
});
