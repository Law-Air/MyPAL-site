import { randomBytes, createHash, timingSafeEqual } from 'crypto';
import { Request, Response, NextFunction } from 'express';
import { adminPool } from './db/adminPool';
import { config } from './config';

export const SESSION_COOKIE = 'mypal_session';
// Fara expirare automata — "asta e casa lor". Se sterge doar la delogare
// explicita, confirmata cu parola familiei (vezi /api/auth/logout).
const SESSION_COOKIE_MAX_AGE_MS = 1000 * 60 * 60 * 24 * 365;

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      site?: { id: number; siteNumber: string; familyName: string | null };
    }
  }
}

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export async function createSession(siteId: number): Promise<string> {
  const token = randomBytes(32).toString('base64url');
  await adminPool.query(
    `INSERT INTO core.sessions (site_id, token_hash) VALUES ($1, $2)`,
    [siteId, hashToken(token)]
  );
  return token;
}

export function setSessionCookie(res: Response, token: string): void {
  res.cookie(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_COOKIE_MAX_AGE_MS,
  });
}

export function clearSessionCookie(res: Response): void {
  res.clearCookie(SESSION_COOKIE, { path: '/' });
}

export async function revokeSession(token: string): Promise<void> {
  await adminPool.query(
    `UPDATE core.sessions SET revoked_at = now() WHERE token_hash = $1 AND revoked_at IS NULL`,
    [hashToken(token)]
  );
}

// Cere o sesiune de familie valida (cookie prezent, negasit revocat, site
// activ). Ataseaza req.site pentru rutele urmatoare.
export async function requireFamilySession(req: Request, res: Response, next: NextFunction) {
  const token = req.cookies?.[SESSION_COOKIE];
  if (!token) return res.status(401).json({ error: 'Nu esti logat' });

  const result = await adminPool.query(
    `SELECT s.id, s.site_number, s.family_name
     FROM core.sessions sess
     JOIN core.sites s ON s.id = sess.site_id
     WHERE sess.token_hash = $1 AND sess.revoked_at IS NULL AND s.status = 'active'`,
    [hashToken(token)]
  );
  if (result.rowCount === 0) return res.status(401).json({ error: 'Sesiune invalida sau expirata' });

  const row = result.rows[0];
  req.site = { id: row.id, siteNumber: row.site_number, familyName: row.family_name };
  next();
}

export function requireAdminToken(req: Request, res: Response, next: NextFunction) {
  const provided = req.header('x-admin-token') ?? '';
  const expected = config.adminToken;
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return res.status(401).json({ error: 'Token admin invalid' });
  }
  next();
}
