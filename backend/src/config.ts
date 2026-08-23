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
  smtp: {
    host: required('SMTP_HOST'),
    port: Number(required('SMTP_PORT')),
    user: required('SMTP_USER'),
    password: required('SMTP_PASSWORD'),
  },
  port: Number(process.env.PORT ?? 3000),
  // Optional — inca neconfigurata (pre-Pilot); cererile de ajutor tehnic
  // se inregistreaza in Postgres oricum, doar emailul de instiintare
  // lipseste pana se aloca adresa dedicata (decizie Mircea, 16 aug 2026).
  sesizariTehniceEmail: process.env.SESIZARI_TEHNICE_EMAIL || null,
};
