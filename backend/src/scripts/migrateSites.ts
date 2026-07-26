import { adminPool } from '../db/adminPool';

// Aplică peste orice site deja provisionat (înainte de introducerea
// coloanelor relation_label/member_code) exact structura pe care
// provisionSite() o creează deja pentru site-urile noi. Idempotent —
// sigur de rulat oricand, inclusiv peste site-uri deja migrate.
//
// Ownership-ul tabelelor a fost transferat rolului fiecărui site la
// provisionare (Sectiunea 3.2 Safix), asa ca mypal_admin nu poate altera
// direct schema — imprumuta temporar apartenenta la rolul site-ului,
// exact ca in provision.ts.
async function main() {
  const sites = await adminPool.query(
    `SELECT schema_name, db_role_name FROM core.sites ORDER BY id`
  );

  for (const { schema_name, db_role_name } of sites.rows) {
    const client = await adminPool.connect();
    try {
      await client.query('BEGIN');
      await client.query(`GRANT ${db_role_name} TO mypal_admin`);
      await client.query(`SET ROLE ${db_role_name}`);
      await client.query(
        `ALTER TABLE ${schema_name}.family_members
           ADD COLUMN IF NOT EXISTS relation_label TEXT,
           ADD COLUMN IF NOT EXISTS member_code TEXT`
      );
      await client.query(`ALTER TABLE ${schema_name}.family_members DROP COLUMN IF EXISTS pin_hash`);
      await client.query(
        `CREATE TABLE IF NOT EXISTS ${schema_name}.memorie_backup (
           id          BIGSERIAL PRIMARY KEY,
           eticheta    TEXT,
           continut    TEXT NOT NULL,
           creat_la    TIMESTAMPTZ NOT NULL DEFAULT now()
         )`
      );
      await client.query('RESET ROLE');
      await client.query(`REVOKE ${db_role_name} FROM mypal_admin`);
      await client.query('COMMIT');
      console.log(`OK: ${schema_name}`);
    } catch (err) {
      await client.query('ROLLBACK').catch(() => {});
      console.error(`EROARE la ${schema_name}:`, err);
      throw err;
    } finally {
      client.release();
    }
  }

  console.log(`--- Migrare completa: ${sites.rowCount} site(uri) ---`);
  await adminPool.end();
}

main().catch((err) => {
  console.error('EROARE:', err);
  process.exit(1);
});
