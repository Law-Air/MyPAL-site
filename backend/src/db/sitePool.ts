import { Pool } from 'pg';
import { adminPool } from './adminPool';
import { config } from '../config';

// One cached Pool per site, each authenticated as THAT site's own
// dedicated, permission-limited Postgres role. A request for site A can
// never end up querying through site B's connection — the credentials
// themselves are scoped, not just an application-level filter.
const pools = new Map<string, Pool>();

export async function getSitePool(siteNumber: string): Promise<Pool | null> {
  if (pools.has(siteNumber)) return pools.get(siteNumber)!;

  const res = await adminPool.query(
    `SELECT schema_name, db_role_name,
            pgp_sym_decrypt(db_role_password_enc, $2) AS db_role_password
     FROM core.sites
     WHERE site_number = $1 AND status = 'active'`,
    [siteNumber, config.pgcryptoMasterKey]
  );
  if (res.rowCount === 0) return null;

  const { schema_name, db_role_name, db_role_password } = res.rows[0];
  const pool = new Pool({
    host: config.pg.host,
    port: config.pg.port,
    database: config.pg.database,
    user: db_role_name,
    password: db_role_password,
    options: `-c search_path=${schema_name}`,
  });
  pools.set(siteNumber, pool);
  return pool;
}
