import bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';
import { adminPool } from './adminPool';
import { provisionSite } from './provision';

export interface AllocateResult {
  siteId: number;
  siteNumber: string;
  password: string; // in clar, o singura data — doar ca sa fie trimisa pe email
}

function generatePassword(): string {
  return randomBytes(9).toString('base64url');
}

// "Emiterea" comerciala: aloca familiei primul site NEVANDUT (allocated_at
// IS NULL), sau provisioneaza unul nou daca rezerva e goala. Distinct de
// provisionSite() — acela creeaza infrastructura tehnica (schema/rol),
// asta face "vanzarea" (nume+email+parola) peste un site deja existent.
export async function allocateSite(familyName: string, email: string, plan: string): Promise<AllocateResult> {
  const client = await adminPool.connect();
  try {
    await client.query('BEGIN');
    const free = await client.query(
      `SELECT id, site_number FROM core.sites
       WHERE allocated_at IS NULL AND status = 'active'
       ORDER BY site_number_seq ASC LIMIT 1 FOR UPDATE`
    );

    let siteId: number;
    let siteNumber: string;
    if (free.rowCount! > 0) {
      siteId = free.rows[0].id;
      siteNumber = free.rows[0].site_number;
    } else {
      // Rezerva de site-uri pre-provisionate e goala — provisionam unul
      // nou pe loc, ca sa nu blocam niciodata o vanzare.
      await client.query('COMMIT');
      const provisioned = await provisionSite();
      siteId = provisioned.siteId;
      siteNumber = provisioned.siteNumber;
      await client.query('BEGIN');
    }

    const password = generatePassword();
    const passwordHash = await bcrypt.hash(password, 10);

    await client.query(
      `UPDATE core.sites
       SET family_name = $1, access_password_hash = $2, password_is_default = true,
           subscription_plan = $3, allocated_at = now()
       WHERE id = $4`,
      [familyName, passwordHash, plan, siteId]
    );
    await client.query(
      `INSERT INTO core.site_emails (site_id, email, is_primary) VALUES ($1, $2, true)`,
      [siteId, email]
    );

    await client.query('COMMIT');
    return { siteId, siteNumber, password };
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}
