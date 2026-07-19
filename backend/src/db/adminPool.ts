import { Pool } from 'pg';
import { config } from '../config';

// Admin pool: used only for core-schema operations (site registry, clone
// evidence, provisioning new sites). Never used to read/write business
// data inside a site's own schema — that always goes through sitePool
// with that site's own dedicated, permission-limited role.
export const adminPool = new Pool({
  host: config.pg.host,
  port: config.pg.port,
  database: config.pg.database,
  user: config.pg.user,
  password: config.pg.password,
});
