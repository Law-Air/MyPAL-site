import { adminPool } from '../db/adminPool';

// Delogare fortata, la sursa - revoca toate sesiunile active. La scara de
// pilot (un singur tester), sigur de rulat oricand e nevoie de un test
// curat, fara sa astepte cine e blocat de cache-ul propriului browser.
async function main() {
  const result = await adminPool.query(
    `UPDATE core.sessions SET revoked_at = now() WHERE revoked_at IS NULL RETURNING id, site_id`
  );
  console.log(`Sesiuni revocate: ${result.rowCount}`);
  await adminPool.end();
}

main().catch((err) => {
  console.error('EROARE:', err);
  process.exit(1);
});
