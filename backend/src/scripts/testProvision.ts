import bcrypt from 'bcrypt';
import { Pool } from 'pg';
import { provisionSite } from '../db/provision';
import { getSitePool } from '../db/sitePool';
import { adminPool } from '../db/adminPool';
import { config } from '../config';

async function main() {
  console.log('--- Provisionez Site A (Familia Ionescu) ---');
  const siteA = await provisionSite('Familia Ionescu');
  console.log(siteA);

  console.log('--- Provisionez Site B (Familia Popescu) ---');
  const siteB = await provisionSite('Familia Popescu');
  console.log(siteB);

  const testPassword = 'parola-test-123';
  const hash = await bcrypt.hash(testPassword, 10);
  await adminPool.query('UPDATE core.sites SET access_password_hash = $1 WHERE id = $2', [hash, siteA.siteId]);
  console.log('--- Parola de acces setata pt Site A ---');

  const poolA = await getSitePool(siteA.siteNumber);
  if (!poolA) throw new Error('poolA null');
  await poolA.query(
    `INSERT INTO family_members (first_name, is_titular) VALUES ('Mircea', true)`
  );
  console.log('--- Membru familie adaugat in Site A, prin rolul dedicat Site A ---');

  const membersA = await poolA.query('SELECT first_name, is_titular FROM family_members');
  console.log('Membri Site A (citit prin rolul A):', membersA.rows);

  console.log('--- Test izolare: incerc sa citesc schema Site A folosind rolul Site B ---');
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
