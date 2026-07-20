import { adminPool } from './adminPool';

export interface AccessWindow {
  id: number;
  siteNumber: string;
  operator: string;
  estimatedMinutes: number;
  windowStart: Date;
  windowEnd: Date;
  status: string;
}

// Creeaza o "fisa de manevra" — planifica o fereastra de acces temporar
// pentru operator (Admix) la Proiectul claude.ai al unui site, legata de
// o clona specifica daca e cazul (inlocuire). Deschiderea/inchiderea
// reala in claude.ai raman manuale — asta doar planifica si jurnalizeaza.
//
// windowMinutes = estimatedMinutes + marja — separate explicit, conform
// Fisei 5 (Admin+Safix+Hostix): marja reduce presiunea de timp asupra
// operatorului, nu perimetrul de securitate (proiectele vizate raman
// strict cele listate, indiferent de durata).
export async function scheduleAccessWindow(params: {
  siteNumber: string;
  cloneId?: number;
  operator?: string;
  estimatedMinutes: number;
  windowMinutes: number; // estimare + marja
  requestedBy?: string;
  notes?: string;
}): Promise<AccessWindow> {
  const siteRes = await adminPool.query('SELECT id FROM core.sites WHERE site_number = $1', [params.siteNumber]);
  if (siteRes.rowCount === 0) throw new Error(`Site necunoscut: ${params.siteNumber}`);
  const siteId = siteRes.rows[0].id;

  const windowStart = new Date();
  const windowEnd = new Date(windowStart.getTime() + params.windowMinutes * 60_000);

  const res = await adminPool.query(
    `INSERT INTO core.access_windows
       (site_id, clone_id, operator, estimated_minutes, window_start, window_end, requested_by, notes)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING id, operator, estimated_minutes, window_start, window_end, status`,
    [
      siteId,
      params.cloneId ?? null,
      params.operator ?? 'Admix',
      params.estimatedMinutes,
      windowStart,
      windowEnd,
      params.requestedBy ?? null,
      params.notes ?? null,
    ]
  );
  const row = res.rows[0];
  return {
    id: row.id,
    siteNumber: params.siteNumber,
    operator: row.operator,
    estimatedMinutes: row.estimated_minutes,
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

// Sectiunea C1: Admix cere extindere INAINTE de expirare. Prelungeste
// DURATA, niciodata scopul — proiectele deja aprobate raman aceleasi.
export async function requestExtension(
  accessWindowId: number,
  additionalMinutes: number,
  reason: string
): Promise<{ extensionId: number }> {
  const windowRes = await adminPool.query(
    `SELECT window_end, status FROM core.access_windows WHERE id = $1`,
    [accessWindowId]
  );
  if (windowRes.rowCount === 0) throw new Error('Fereastra inexistenta');
  if (windowRes.rows[0].status !== 'deschis') {
    throw new Error('Extinderea se cere doar cat fereastra e deschisa, inainte de expirare');
  }

  const res = await adminPool.query(
    `INSERT INTO core.access_window_extensions (access_window_id, additional_minutes, reason)
     VALUES ($1, $2, $3) RETURNING id`,
    [accessWindowId, additionalMinutes, reason]
  );
  return { extensionId: res.rows[0].id };
}

// Decizia Admin — aprobat/respins, jurnalizata; daca aprobat, muta
// window_end mai departe (nu largeste niciodata scopul/proiectele).
export async function decideExtension(extensionId: number, approved: boolean): Promise<void> {
  const extRes = await adminPool.query(
    `SELECT access_window_id, additional_minutes FROM core.access_window_extensions WHERE id = $1 AND decision = 'pending'`,
    [extensionId]
  );
  if (extRes.rowCount === 0) throw new Error('Cerere de extindere inexistenta sau deja decisa');
  const { access_window_id, additional_minutes } = extRes.rows[0];

  if (!approved) {
    await adminPool.query(`UPDATE core.access_window_extensions SET decision = 'rejected', decided_at = now() WHERE id = $1`, [extensionId]);
    return;
  }

  const windowRes = await adminPool.query(`SELECT window_end FROM core.access_windows WHERE id = $1`, [access_window_id]);
  const newEnd = new Date(new Date(windowRes.rows[0].window_end).getTime() + additional_minutes * 60_000);

  await adminPool.query('BEGIN');
  try {
    await adminPool.query(
      `UPDATE core.access_window_extensions SET decision = 'approved', decided_at = now(), new_window_end = $1 WHERE id = $2`,
      [newEnd, extensionId]
    );
    await adminPool.query(`UPDATE core.access_windows SET window_end = $1 WHERE id = $2`, [newEnd, access_window_id]);
    await adminPool.query('COMMIT');
  } catch (err) {
    await adminPool.query('ROLLBACK');
    throw err;
  }
}

// La inchidere: fereastra se marcheaza 'inchis'. Daca inchiderea reala e
// DUPA sfarsitul alocat (deja extins, daca a fost cazul) SI nu exista
// nicio extindere aprobata care sa acopere acest moment, se marcheaza
// unflagged_overrun = true — semnalul real de urmarit, nu depasirea in
// sine (o extindere aprobata nu declanseaza acest flag).
export async function markWindowClosed(id: number): Promise<{ unflaggedOverrun: boolean }> {
  const res = await adminPool.query(
    `SELECT window_end, status FROM core.access_windows WHERE id = $1`,
    [id]
  );
  if (res.rowCount === 0 || res.rows[0].status !== 'deschis') {
    throw new Error('Fereastra nu exista sau nu era in stare "deschis"');
  }

  const now = new Date();
  const windowEnd = new Date(res.rows[0].window_end);
  const unflaggedOverrun = now > windowEnd;

  await adminPool.query(
    `UPDATE core.access_windows SET status = 'inchis', closed_at = now(), unflagged_overrun = $2
     WHERE id = $1`,
    [id, unflaggedOverrun]
  );
  return { unflaggedOverrun };
}

// Genereaza textul fisei de manevra, gata de urmat pas cu pas.
export async function printManeuverSheet(id: number): Promise<string> {
  const res = await adminPool.query(
    `SELECT aw.id, aw.operator, aw.estimated_minutes, aw.window_start, aw.window_end, aw.status,
            aw.unflagged_overrun, s.site_number, c.role_category
     FROM core.access_windows aw
     JOIN core.sites s ON s.id = aw.site_id
     LEFT JOIN core.clones c ON c.id = aw.clone_id
     WHERE aw.id = $1`,
    [id]
  );
  if (res.rowCount === 0) throw new Error('Fereastra inexistenta');
  const r = res.rows[0];

  const extRes = await adminPool.query(
    `SELECT requested_at, additional_minutes, reason, decision, new_window_end
     FROM core.access_window_extensions WHERE access_window_id = $1 ORDER BY requested_at`,
    [id]
  );

  const fmt = (d: Date) => new Date(d).toLocaleString('ro-RO');
  const lines = [
    `FISA DE MANEVRA #${r.id} — status: ${r.status}`,
    `Site: ${r.site_number}${r.role_category ? ` (clona: ${r.role_category})` : ''}`,
    `Operator: ${r.operator}`,
    `Estimare necesara: ${r.estimated_minutes} min | Fereastra alocata: ${fmt(r.window_start)} -> ${fmt(r.window_end)}`,
    `1) La ${fmt(r.window_start)} — deschide acces "Can use" pt ${r.operator} la Proiectul ${r.site_number}.`,
    `2) Efectueaza migrarea/inlocuirea clonei.`,
    `3) Daca nu te incadrezi — cere extindere INAINTE de expirare (nu astepta expirarea).`,
    `4) La ${fmt(r.window_end)} (sau imediat dupa finalizare) — inchide accesul ${r.operator}.`,
    `5) Confirma inchiderea (marcheaza fereastra ca 'inchis' in sistem).`,
  ];
  if (extRes.rowCount! > 0) {
    lines.push('--- Extinderi solicitate ---');
    for (const e of extRes.rows) {
      lines.push(
        `  ${fmt(e.requested_at)} — +${e.additional_minutes} min, motiv: "${e.reason}" — ${e.decision}` +
          (e.new_window_end ? ` (fereastra noua pana la ${fmt(e.new_window_end)})` : '')
      );
    }
  }
  if (r.status === 'inchis') {
    lines.push(
      r.unflagged_overrun
        ? '⚠ SEMNAL: fereastra s-a inchis DUPA termenul alocat, FARA cerere de extindere aprobata — de discutat.'
        : '✓ Inchisa in termenul alocat (sau cu extindere aprobata acoperitoare).'
    );
  }
  return lines.join('\n');
}
