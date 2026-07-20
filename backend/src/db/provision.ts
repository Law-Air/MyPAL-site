import { randomBytes } from 'crypto';
import { readFileSync } from 'fs';
import { join } from 'path';
import { adminPool } from './adminPool';
import { config } from '../config';
import { MYPAL_CATEGORY_SEED } from './categorySeed';

const TEMPLATE_SQL = readFileSync(
  join(__dirname, '..', '..', 'db', 'migrations', '002_site_schema_template.sql'),
  'utf-8'
);

export interface ProvisionResult {
  siteId: number;
  siteNumber: string;
  schemaName: string;
  dbRoleName: string;
  dbRolePassword: string; // returned once, plaintext, for immediate use — never logged
}

function formatSiteNumber(group: number, seq: number): string {
  const block = Math.floor(seq / 1000);
  const inBlock = seq % 1000;
  return `${group}/${String(block).padStart(3, '0')}.${String(inBlock).padStart(3, '0')}`;
}

export async function provisionSite(familyName?: string): Promise<ProvisionResult> {
  const client = await adminPool.connect();
  try {
    await client.query('BEGIN');

    // 1) Allocate next site_number atomically.
    const counterRes = await client.query(
      'SELECT current_group, current_seq FROM core.site_number_counter WHERE id = 1 FOR UPDATE'
    );
    let { current_group: group, current_seq: seq } = counterRes.rows[0];
    seq += 1;
    if (seq > 999999) {
      seq = 0;
      group += 1;
      if (group > 999) throw new Error('Site number capacity exhausted (999 groups x 1,000,000)');
    }
    await client.query(
      'UPDATE core.site_number_counter SET current_group = $1, current_seq = $2 WHERE id = 1',
      [group, seq]
    );
    const siteNumberSeq = group * 1_000_000 + seq;
    const siteNumber = formatSiteNumber(group, seq);
    const schemaName = `site_${group}_${seq}`;
    const dbRoleName = `role_${group}_${seq}`;
    const dbRolePassword = randomBytes(24).toString('base64url');

    // 2) Dedicated role + isolated schema.
    await client.query(`CREATE ROLE ${dbRoleName} LOGIN PASSWORD '${dbRolePassword}'`);
    await client.query(`CREATE SCHEMA ${schemaName}`);
    await client.query(`GRANT USAGE ON SCHEMA ${schemaName} TO ${dbRoleName}`);
    await client.query(`REVOKE ALL ON SCHEMA core FROM ${dbRoleName}`);

    // 3) Apply the identical per-site template (only difference across
    //    every site is the data, never the structure).
    const templateSql = TEMPLATE_SQL.replace(/:schema_name/g, schemaName);
    await client.query(templateSql);

    // Seed identică de categorii MyPAL (PF) — aceleași pentru orice site nou.
    for (const [i, cat] of MYPAL_CATEGORY_SEED.entries()) {
      await client.query(
        `INSERT INTO ${schemaName}.categories (code, domain, name, sort_order) VALUES ($1, $2, $3, $4)`,
        [cat.code, cat.domain, cat.name, i]
      );
    }

    await client.query(
      `GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA ${schemaName} TO ${dbRoleName}`
    );
    await client.query(
      `GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA ${schemaName} TO ${dbRoleName}`
    );
    await client.query(
      `ALTER DEFAULT PRIVILEGES IN SCHEMA ${schemaName} GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO ${dbRoleName}`
    );

    // 4) Register the site + encrypt its role password with the master key.
    const siteRes = await client.query(
      `INSERT INTO core.sites
         (site_number, site_number_seq, schema_name, db_role_name, db_role_password_enc,
          family_name, status, activated_at)
       VALUES ($1, $2, $3, $4, pgp_sym_encrypt($5, $6), $7, 'active', now())
       RETURNING id`,
      [siteNumber, siteNumberSeq, schemaName, dbRoleName, dbRolePassword, config.pgcryptoMasterKey, familyName ?? null]
    );
    const siteId = siteRes.rows[0].id;

    // 5) Generation 0 team — one clone per domain, clone_id = site_number.
    const domains = ['conta', 'juridic', 'rezervari_simulari', 'audit'];
    for (const domain of domains) {
      await client.query(
        `INSERT INTO core.clones (site_id, clone_id, role_category, generation, status)
         VALUES ($1, $2, $3, 0, 'activ')`,
        [siteId, siteNumber, domain]
      );
    }

    await client.query('COMMIT');
    return { siteId, siteNumber, schemaName, dbRoleName, dbRolePassword };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}
