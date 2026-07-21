import express from 'express';
import bcrypt from 'bcrypt';
import { adminPool } from './db/adminPool';
import { getSitePool } from './db/sitePool';

export const app = express();
app.use(express.json());

app.get('/health', (_req, res) => res.json({ ok: true }));

// Site-wide login: site_number + the access password issued by the
// external password machine (or later changed by the family).
app.post('/api/login', async (req, res) => {
  const { site_number, password } = req.body ?? {};
  if (!site_number || !password) {
    return res.status(400).json({ error: 'site_number si password sunt obligatorii' });
  }

  const result = await adminPool.query(
    `SELECT id, access_password_hash, status FROM core.sites WHERE site_number = $1`,
    [site_number]
  );
  if (result.rowCount === 0) return res.status(401).json({ error: 'Site necunoscut' });

  const site = result.rows[0];
  if (site.status !== 'active') return res.status(403).json({ error: 'Site inactiv' });
  if (!site.access_password_hash) return res.status(401).json({ error: 'Parola nu a fost inca setata' });

  const valid = await bcrypt.compare(password, site.access_password_hash);
  if (!valid) return res.status(401).json({ error: 'Parola incorecta' });

  res.json({ ok: true, site_number });
});

// Minimal proof of isolation: list this site's own family members, using
// ONLY that site's dedicated role — never the admin pool.
app.get('/api/:siteNumber/family', async (req, res) => {
  const pool = await getSitePool(decodeURIComponent(req.params.siteNumber));
  if (!pool) return res.status(404).json({ error: 'Site necunoscut sau inactiv' });

  const result = await pool.query('SELECT id, first_name, is_titular FROM family_members ORDER BY id');
  res.json(result.rows);
});
