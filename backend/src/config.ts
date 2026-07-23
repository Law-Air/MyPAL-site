import 'dotenv/config';

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required env var: ${name}`);
  return value;
}

export const config = {
  pg: {
    host: required('PGHOST'),
    port: Number(required('PGPORT')),
    database: required('PGDATABASE'),
    user: required('PGUSER'),
    password: required('PGPASSWORD'),
  },
  pgcryptoMasterKey: required('PGCRYPTO_MASTER_KEY'),
  adminToken: required('ADMIN_TOKEN'),
  port: Number(process.env.PORT ?? 3000),
};
