/**
 * Reports whether every public table has row-level security enabled, and
 * whether the connecting role can bypass it.
 *
 * EcomOS does NOT use RLS as its tenant boundary — that's app-level
 * (hasCapability, scoped by storeId/organizationId in every query). RLS here
 * exists only to close Supabase's anon-key REST exposure (see the
 * enable_rls migrations and DATABASE.md), and Prisma connects as the
 * Postgres owner role, which bypasses it by design. So a bypass-capable role
 * is expected and only a note, not a failure.
 *
 * What DID happen once (2026-09-20): a migration added tables (finance,
 * then Meta) without an accompanying "enable RLS" migration, leaving them
 * open to anyone with the anon key. That's what this script guards against:
 * it fails if any table lacks RLS enabled at all.
 */
import pg from "pg";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is not set");
  process.exit(1);
}

const client = new pg.Client({ connectionString: url });
await client.connect();

const problems = [];
const notes = [];

const { rows: [role] } = await client.query(
  `SELECT current_user AS name, rolsuper, rolbypassrls FROM pg_roles WHERE rolname = current_user`,
);
notes.push(`connected as ${role.name}`);
if (role.rolsuper || role.rolbypassrls) {
  notes.push(
    `${role.name} bypasses RLS (${role.rolsuper ? "superuser" : "BYPASSRLS"}) — expected: ` +
      `RLS here only blocks the anon key, not the app. See scripts/db-check.mjs.`,
  );
}

const { rows: tables } = await client.query(`
  SELECT c.relname AS name, c.relrowsecurity AS enabled
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' AND c.relkind = 'r' AND c.relname NOT IN ('_prisma_migrations')
  ORDER BY c.relname
`);

for (const table of tables) {
  if (!table.enabled) problems.push(`${table.name}: row-level security is not enabled`);
}
notes.push(`${tables.length} public tables checked`);

await client.end();

for (const note of notes) console.log(note);

if (problems.length > 0) {
  console.error(`\n${problems.length} problem(s):`);
  for (const problem of problems) console.error(`  - ${problem}`);
  console.error("\nAdd an enable-RLS migration for the tables above (see prisma/migrations/20260919003500_enable_rls).");
  process.exit(1);
}

console.log("\nevery public table has RLS enabled");
