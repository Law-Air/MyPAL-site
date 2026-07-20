import { adminPool } from './adminPool';

export interface AccessWindow {
  id: number;
  siteNumber: string;
  cloneRoleCategory: string | null;
  operator: string;
  windowStart: Date;
  windowEnd: Date;
  status: string;
}

// Creeaza o "fisa de manevra" — planifica o fereastra de acces temporar
// pentru operator (Admix) la Proiectul claude.ai al unui site, legata de
// o clona specifica daca e cazul (inlocuire). Deschiderea/inchiderea
// reala in claude.ai raman manuale — asta doar planifica si jurnalizeaza.
export async function scheduleAccessWindow(params: {
  siteNumber: string;
  cloneId?: number;
  operator?: string;
  windowStart: Date;
  windowEnd: Date;
  requestedBy?: string;
  notes?: string;
}): Promise<AccessWindow> {
  const siteRes = await adminPool.query('SELECT id FROM core.sites WHERE site_number = $1', [params.siteNumber]);
  if (siteRes.rowCount === 0) throw new Error(`Site necunoscut: ${params.siteNumber}`);
  const siteId = siteRes.rows[0].id;

  const res = await adminPool.query(
    `INSERT INTO core.access_windows
       (site_id, clone_id, operator, window_start, window_end, requested_by, notes)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING id, operator, window_start, window_end, status`,
    [
      siteId,
      params.cloneId ?? null,
      params.operator ?? 'Admix',
      params.windowStart,
      params.windowEnd,
      params.requestedBy ?? null,
      params.notes ?? null,
    ]
  );
  const row = res.rows[0];
  return {
    id: row.id,
    siteNumber: params.siteNumber,
    cloneRoleCategory: null,
    operator: row.operator,
    windowStart: row.window_start,
    windowEnd: row.window_end,
    status: row.status,
  };
}

export async function markWindowOpened(id: number): Promise<void> {
  const res = await adminPool.query(
    `UPDATE core.access_windows SET status = 'deschis', opened_at = now()
     WHERE id = $1 AND status = 'planificat'`,
    [id]
  );
  if (res.rowCount === 0) throw new Error('Fereastra nu exista sau nu era in stare "planificat"');
}

export async function markWindowClosed(id: number): Promise<void> {
  const res = await adminPool.query(
    `UPDATE core.access_windows SET status = 'inchis', closed_at = now()
     WHERE id = $1 AND status = 'deschis'`,
    [id]
  );
  if (res.rowCount === 0) throw new Error('Fereastra nu exista sau nu era in stare "deschis"');
}

// Genereaza textul fisei de manevra, gata de urmat pas cu pas.
export async function printManeuverSheet(id: number): Promise<string> {
  const res = await adminPool.query(
    `SELECT aw.id, aw.operator, aw.window_start, aw.window_end, aw.status,
            s.site_number, c.role_category
     FROM core.access_windows aw
     JOIN core.sites s ON s.id = aw.site_id
     LEFT JOIN core.clones c ON c.id = aw.clone_id
     WHERE aw.id = $1`,
    [id]
  );
  if (res.rowCount === 0) throw new Error('Fereastra inexistenta');
  const r = res.rows[0];
  const fmt = (d: Date) => new Date(d).toLocaleString('ro-RO');
  return [
    `FISA DE MANEVRA #${r.id} — status: ${r.status}`,
    `Site: ${r.site_number}${r.role_category ? ` (clona: ${r.role_category})` : ''}`,
    `Operator: ${r.operator}`,
    `1) La ${fmt(r.window_start)} — deschide acces "Can use" pt ${r.operator} la Proiectul ${r.site_number}.`,
    `2) Efectueaza migrarea/inlocuirea clonei.`,
    `3) La ${fmt(r.window_end)} (sau imediat dupa finalizare) — inchide accesul ${r.operator}.`,
    `4) Confirma inchiderea (marcheaza fereastra ca 'inchis' in sistem).`,
  ].join('\n');
}
