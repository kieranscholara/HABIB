import { config } from "dotenv";
config({ path: [".env.local", ".env"], quiet: true });
import postgres from "postgres";
import { readFileSync } from "node:fs";
if (!process.env.DATABASE_URL)
  throw new Error(
    "Set DATABASE_URL securely to your Supabase PostgreSQL connection URL.",
  );
const sql = postgres(process.env.DATABASE_URL, {
  ssl: {
    rejectUnauthorized: true,
    ...(process.env.HABIB_DATABASE_CA_PATH
      ? { ca: readFileSync(process.env.HABIB_DATABASE_CA_PATH, "utf8") }
      : {}),
  },
  max: 1,
  prepare: false,
});
try {
  await sql.begin(async (tx) => {
    await tx.unsafe(
      "CREATE TABLE IF NOT EXISTS habib_migrations (version TEXT PRIMARY KEY,applied_at TIMESTAMPTZ NOT NULL DEFAULT now())",
    );
    const exists =
      await tx`SELECT version FROM habib_migrations WHERE version='001'`;
    if (!exists.length) {
      await tx.unsafe(
        readFileSync("supabase/migrations/001_family_learning.sql", "utf8"),
      );
      await tx`INSERT INTO habib_migrations(version) VALUES('001')`;
    }
  });
  console.log("Database migration applied.");
} finally {
  await sql.end();
}
