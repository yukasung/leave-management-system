/**
 * Next.js instrumentation hook — runs once when the server process starts.
 * https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 *
 * Responsibilities:
 *   1. Seed default roles (ADMIN, HR, MANAGER, EMPLOYEE) if the table is empty.
 *   2. Log whether the system needs first-time setup (no users yet).
 *
 * The actual redirect to /setup is handled by the login page server component
 * and the root page — instrumentation cannot issue HTTP redirects.
 */
export async function register() {
  // Only run in the Node.js runtime (not edge workers / middleware)
  if (process.env.NEXT_RUNTIME !== 'nodejs') return

  const { seedRoles } = await import('./lib/seed-roles')

  try {
    await seedRoles()
  } catch (err) {
    // Log but do not crash the server — the app can still start
    console.error('[instrumentation] Failed to seed roles:', err)
  }
}
