/**
 * list-and-reset-admin.js
 *
 * Run against Railway DB to see users and reset admin password.
 *
 * Usage:
 *   $env:DATABASE_URL="postgresql://postgres:PASSWORD@HOST:PORT/railway"
 *   node scripts/list-and-reset-admin.js
 *
 * Or pass password as argument:
 *   node scripts/list-and-reset-admin.js NewPass@123
 */

'use strict';

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const { Client } = require('pg');
const bcrypt = require('bcryptjs');

const NEW_PASSWORD = process.argv[2] || 'Admin@12345';

async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  console.log('Connected to:', process.env.DATABASE_URL?.replace(/:([^:@]+)@/, ':***@'));

  // List all users
  const { rows: users } = await client.query(
    `SELECT u.id, u.email, u.name, u."isActive", r.name AS role
     FROM "User" u
     LEFT JOIN "Role" r ON r.id = u."roleId"
     ORDER BY u."createdAt"`
  );

  if (users.length === 0) {
    console.log('\nNo users found. Go to /setup to create the first admin.');
    return;
  }

  console.log('\nUsers in database:');
  users.forEach((u, i) => {
    console.log(`  ${i + 1}. ${u.email} | name: ${u.name} | role: ${u.role ?? 'none'} | active: ${u.isActive}`);
  });

  // Reset password for ALL users (or just admins - change filter if needed)
  const hash = await bcrypt.hash(NEW_PASSWORD, 12);
  const { rowCount } = await client.query(
    `UPDATE "User" SET "password" = $1, "isActive" = true WHERE "password" IS NOT NULL`,
    [hash]
  );

  console.log(`\nPassword reset to: ${NEW_PASSWORD}`);
  console.log(`Updated ${rowCount} user(s).`);
  console.log('\nTry logging in with the email shown above and the new password.');
  await client.end();
}

main().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});
