import express from 'express';
import cookieParser from 'cookie-parser';
import bcrypt from 'bcrypt';
import { adminPool } from './db/adminPool';
import { getSitePool } from './db/sitePool';
import { allocateSite } from './db/allocate';
import { sendMail } from './mail';
import {
  createSession,
  setSessionCookie,
  clearSessionCookie,
  revokeSession,
  requireFamilySession,
  requireAdminToken,
  SESSION_COOKIE,
} from './auth';

export const app = express();
app.use(express.json());
app.use(cookieParser());

app.get('/health', (_req, res) => res.json({ ok: true }));

// ===== Login familie (email + parola familiei) =====

app.post('/api/login', async (req, res) => {
  const { email, password } = req.body ?? {};
  if (!email || !password) {
    return res.status(400).json({ error: 'email si password sunt obligatorii' });
  }

  const result = await adminPool.query(
    `SELECT s.id, s.site_number, s.status, s.access_password_hash, s.password_is_default
     FROM core.site_emails e
     JOIN core.sites s ON s.id = e.site_id
     WHERE e.email = $1`,
    [email]
  );
  if (result.rowCount === 0) return res.status(401).json({ error: 'Email necunoscut' });

  const site = result.rows[0];
  if (site.status !== 'active') return res.status(403).json({ error: 'Site inactiv' });
  if (!site.access_password_hash) return res.status(401).json({ error: 'Parola nu a fost inca setata' });

  const valid = await bcrypt.compare(password, site.access_password_hash);
  if (!valid) return res.status(401).json({ error: 'Parola incorecta' });

  const token = await createSession(site.id);
  setSessionCookie(res, token);
  res.json({ ok: true, site_number: site.site_number, password_is_default: site.password_is_default });
});

// Pasul 2 (doar la prima intrare): pastreaza parola alocata.
app.post('/api/auth/keep-password', requireFamilySession, async (req, res) => {
  await adminPool.query(`UPDATE core.sites SET password_is_default = false WHERE id = $1`, [req.site!.id]);
  res.json({ ok: true });
});

// Pasul 2 (doar la prima intrare): schimba parola cu una proprie.
app.post('/api/auth/set-password', requireFamilySession, async (req, res) => {
  const { new_password } = req.body ?? {};
  if (!new_password || new_password.length < 4) {
    return res.status(400).json({ error: 'Parola noua trebuie sa aiba cel putin 4 caractere' });
  }
  const hash = await bcrypt.hash(new_password, 10);
  await adminPool.query(
    `UPDATE core.sites SET access_password_hash = $1, password_is_default = false WHERE id = $2`,
    [hash, req.site!.id]
  );
  res.json({ ok: true });
});

// Delogare — protejata: cere reconfirmarea parolei familiei, ca sa nu
// deloge un copil din joaca.
app.post('/api/auth/logout', requireFamilySession, async (req, res) => {
  const { password } = req.body ?? {};
  const result = await adminPool.query(`SELECT access_password_hash FROM core.sites WHERE id = $1`, [req.site!.id]);
  const hash = result.rows[0]?.access_password_hash;
  const valid = hash && (await bcrypt.compare(password ?? '', hash));
  if (!valid) return res.status(401).json({ error: 'Parola incorecta — nu s-a delogat' });

  const token = req.cookies?.[SESSION_COOKIE];
  if (token) await revokeSession(token);
  clearSessionCookie(res);
  res.json({ ok: true });
});

app.get('/api/me', requireFamilySession, (req, res) => {
  res.json({ site_number: req.site!.siteNumber, family_name: req.site!.familyName });
});

// ===== Consiliul Familiei =====

app.get('/api/family/members', requireFamilySession, async (req, res) => {
  const pool = await getSitePool(req.site!.siteNumber);
  if (!pool) return res.status(404).json({ error: 'Site necunoscut sau inactiv' });
  const result = await pool.query(
    `SELECT id, first_name, relation_label, is_titular, member_code IS NOT NULL AS are_cod
     FROM family_members ORDER BY id`
  );
  res.json(result.rows);
});

// Titularul seteaza/schimba codul unui membru — cod in clar, prezentat
// liber Consilierului mai tarziu; nu e un mecanism de securitate reala,
// doar separare de fluxuri intre membri (decizie Mircea, 23 iulie 2026).
app.put('/api/family/members/:id', requireFamilySession, async (req, res) => {
  const pool = await getSitePool(req.site!.siteNumber);
  if (!pool) return res.status(404).json({ error: 'Site necunoscut sau inactiv' });
  const { first_name, relation_label, member_code } = req.body ?? {};
  const result = await pool.query(
    `UPDATE family_members
     SET first_name = COALESCE($1, first_name),
         relation_label = COALESCE($2, relation_label),
         member_code = COALESCE($3, member_code)
     WHERE id = $4
     RETURNING id`,
    [first_name ?? null, relation_label ?? null, member_code ?? null, req.params.id]
  );
  if (result.rowCount === 0) return res.status(404).json({ error: 'Membru necunoscut' });
  res.json({ ok: true });
});

app.post('/api/family/members', requireFamilySession, async (req, res) => {
  const pool = await getSitePool(req.site!.siteNumber);
  if (!pool) return res.status(404).json({ error: 'Site necunoscut sau inactiv' });
  const { first_name, relation_label, member_code } = req.body ?? {};
  if (!first_name) return res.status(400).json({ error: 'first_name obligatoriu' });
  const result = await pool.query(
    `INSERT INTO family_members (first_name, relation_label, member_code, is_titular)
     VALUES ($1, $2, $3, false) RETURNING id`,
    [first_name, relation_label ?? null, member_code ?? null]
  );
  res.json({ ok: true, id: result.rows[0].id });
});

// Linia unica "Rol-Nume-Cod ; ..." codificata Base64, de postat manual de
// Titular la fiecare Consilier (Advix/Adviz/Verix/Vivix) — cf. deciziei
// Mircea din 23 iulie 2026: separare de fluxuri intre membri, nu
// confidentialitate reala (mediu privat Claude Team).
app.get('/api/family/consilier-line', requireFamilySession, async (req, res) => {
  const pool = await getSitePool(req.site!.siteNumber);
  if (!pool) return res.status(404).json({ error: 'Site necunoscut sau inactiv' });
  const result = await pool.query(
    `SELECT relation_label, first_name, member_code FROM family_members
     WHERE member_code IS NOT NULL ORDER BY id`
  );
  const linePlain = result.rows
    .map((m) => `${m.relation_label ?? 'Membru'}-${m.first_name}-${m.member_code}`)
    .join(' ; ');
  res.json({ line_plain: linePlain, line_base64: Buffer.from(linePlain, 'utf-8').toString('base64') });
});

// ===== Memorie AI: copie de siguranta text, salvata/recuperata doar de familie =====
// Niciun Consilier nu scrie sau citeste automat aici — familia copiaza
// manual din/spre Proiectul Claude. Append-only, fara UPDATE/DELETE expuse.

app.get('/api/family/memorie', requireFamilySession, async (req, res) => {
  const pool = await getSitePool(req.site!.siteNumber);
  if (!pool) return res.status(404).json({ error: 'Site necunoscut sau inactiv' });
  const result = await pool.query(
    `SELECT id, eticheta, continut, creat_la FROM memorie_backup ORDER BY creat_la DESC`
  );
  res.json(result.rows);
});

app.post('/api/family/memorie/salveaza', requireFamilySession, async (req, res) => {
  const pool = await getSitePool(req.site!.siteNumber);
  if (!pool) return res.status(404).json({ error: 'Site necunoscut sau inactiv' });
  const { eticheta, continut } = req.body ?? {};
  if (!continut) return res.status(400).json({ error: 'continut este obligatoriu' });
  const result = await pool.query(
    `INSERT INTO memorie_backup (eticheta, continut) VALUES ($1, $2) RETURNING id, creat_la`,
    [eticheta ?? null, continut]
  );
  res.json({ ok: true, id: result.rows[0].id, creat_la: result.rows[0].creat_la });
});

// ===== Comenzi si alocare (plata -> emitere site+parola) =====

app.post('/api/orders', async (req, res) => {
  const { family_name, email, plan } = req.body ?? {};
  if (!family_name || !email) return res.status(400).json({ error: 'family_name si email sunt obligatorii' });
  const result = await adminPool.query(
    `INSERT INTO core.orders (family_name, email, subscription_plan) VALUES ($1, $2, COALESCE($3, 'start')) RETURNING id`,
    [family_name, email, plan ?? null]
  );
  res.json({ ok: true, order_id: result.rows[0].id });
});

app.get('/api/admin/orders', requireAdminToken, async (_req, res) => {
  const result = await adminPool.query(
    `SELECT id, family_name, email, subscription_plan, status, created_at FROM core.orders ORDER BY created_at DESC`
  );
  res.json(result.rows);
});

app.post('/api/admin/orders/:id/confirm-payment', requireAdminToken, async (req, res) => {
  const orderRes = await adminPool.query(`SELECT * FROM core.orders WHERE id = $1`, [req.params.id]);
  if (orderRes.rowCount === 0) return res.status(404).json({ error: 'Comanda necunoscuta' });
  const order = orderRes.rows[0];
  if (order.status !== 'pending') return res.status(409).json({ error: `Comanda e deja '${order.status}'` });

  const { siteId, siteNumber, password } = await allocateSite(order.family_name, order.email, order.subscription_plan);
  await adminPool.query(
    `UPDATE core.orders SET status = 'confirmed', site_id = $1, confirmed_at = now() WHERE id = $2`,
    [siteId, order.id]
  );

  // Parola in clar exista doar aici, o singura data, ca sa fie trimisa —
  // nu e stocata niciodata in clar si nu se intoarce in raspunsul catre
  // Admin (Admin vede Nume+Email+Parola Blank, cf. deciziei Mircea).
  await sendMail(
    order.email,
    'Codul tau de acces my-PAL',
    `Bine ai venit, ${order.family_name}!\n\nSite-ul tau: ${siteNumber}\nParola: ${password}\n\nLa prima intrare pe my-pal.ai poti pastra aceasta parola sau o poti schimba cu una proprie.`
  );

  res.json({ ok: true, site_number: siteNumber, family_name: order.family_name, email: order.email });
});

// Minimal proof of isolation: list this site's own family members, using
// ONLY that site's dedicated role — never the admin pool.
app.get('/api/:siteNumber/family', async (req, res) => {
  const pool = await getSitePool(decodeURIComponent(req.params.siteNumber));
  if (!pool) return res.status(404).json({ error: 'Site necunoscut sau inactiv' });

  const result = await pool.query('SELECT id, first_name, is_titular FROM family_members ORDER BY id');
  res.json(result.rows);
});
