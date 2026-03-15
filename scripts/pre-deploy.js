/**
 * pre-deploy.js
 *
 * Runs BEFORE `prisma migrate deploy` on every Railway deployment.
 *
 * Problem it solves:
 *   Prisma records a migration in _prisma_migrations when it STARTS applying it.
 *   If the migration SQL fails (e.g. missing column), the row stays with
 *   applied_steps_count = 0 (failed state).  On the next deploy, `prisma migrate
 *   deploy` sees the old checksum in that row, compares it to the (possibly
 *   modified) migration file, and REFUSES to re-apply it — exiting immediately
 *   with error code 1.
 *
 * Fix:
 *   Delete the _prisma_migrations rows for any migration that is in a FAILED
 *   state (applied_steps_count = 0).  This lets `prisma migrate deploy` treat
 *   them as unseen migrations and re-apply them cleanly.
 *
 * Safety:
 *   - Only deletes rows where applied_steps_count = 0 (never successfully applied).
 *   - Successfully applied migrations (applied_steps_count > 0) are left alone.
 *   - If _prisma_migrations doesn't exist yet (fresh DB) the script exits silently.
 *   - Any error is logged but does NOT stop the deployment (non-fatal).
 */

'use strict';

const { Client } = require('pg');

async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  try {
    // Check if _prisma_migrations table exists (it won't on a fresh DB)
    const { rows: tableCheck } = await client.query(`
      SELECT 1
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name = '_prisma_migrations'
    `);

    if (tableCheck.length === 0) {
      console.log('[pre-deploy] Fresh database — no cleanup needed.');
      return;
    }

    // Remove rows for failed migrations so prisma migrate deploy can re-apply them
    const { rowCount } = await client.query(`
      DELETE FROM "_prisma_migrations"
      WHERE applied_steps_count = 0
    `);

    if (rowCount > 0) {
      console.log(`[pre-deploy] Removed ${rowCount} failed migration record(s) — they will be re-applied.`);
    } else {
      console.log('[pre-deploy] No failed migrations found — nothing to clean up.');
    }
  } finally {
    await client.end();
  }
}

main()
  .catch((err) => {
    // Non-fatal: log the warning and let the calling process continue.
    console.warn('[pre-deploy] Warning (non-fatal):', err.message);
  });
