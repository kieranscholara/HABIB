import { config } from "dotenv";
config({ path: [".env.local", ".env"], quiet: true });
import { transaction, closeDatabase } from "../src/lib/data/db";
const dayAgo = new Date(Date.now() - 86400000).toISOString();
await transaction(async (db) => {
  await db.run("DELETE FROM tutor_turns WHERE created_at<?", [dayAgo]);
  await db.run("DELETE FROM auth_sessions WHERE expires_at<?", [
    new Date().toISOString(),
  ]);
  await db.run("DELETE FROM rate_limits WHERE expires_at<?", [
    new Date().toISOString(),
  ]);
  await db.run(
    "UPDATE tutor_sessions SET status='ended',ended_at=? WHERE status='active' AND started_at<?",
    [
      new Date().toISOString(),
      new Date(Date.now() - 2 * 3600000).toISOString(),
    ],
  );
  await db.run(
    "UPDATE usage_events SET status='complete' WHERE status='reserved' AND created_at<?",
    [new Date(Date.now() - 60000).toISOString()],
  );
});
console.log(
  "Retention complete. Structured learning records remain until parent erasure.",
);

await closeDatabase();
