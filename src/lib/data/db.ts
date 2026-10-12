import { readFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import postgres from "postgres";
export interface Row {
  [key: string]: string | number | null;
}
export interface DB {
  all<T = Row>(sql: string, params?: unknown[]): Promise<T[]>;
  run(sql: string, params?: unknown[]): Promise<void>;
}
const production = () =>
  process.env.APP_ENV === "production" || process.env.VERCEL === "1";
let sqlite: DatabaseSync | undefined;
let pg: ReturnType<typeof postgres> | undefined;
let queue: Promise<void> = Promise.resolve();
export function isProduction() {
  return production();
}
function cloud() {
  if (!pg) {
    if (!process.env.DATABASE_URL)
      throw new Error("DATABASE_URL is required in production");
    pg = postgres(process.env.DATABASE_URL, {
      max: 5,
      prepare: false,
      ssl: {
        rejectUnauthorized: true,
        ...(process.env.HABIB_DATABASE_CA_PATH
          ? { ca: readFileSync(process.env.HABIB_DATABASE_CA_PATH, "utf8") }
          : {}),
      },
    });
  }
  return pg;
}
function local() {
  if (!sqlite) {
    if (production())
      throw new Error("Local database is disabled in production");
    const path =
      process.env.HABIB_DATABASE_PATH ||
      join(process.cwd(), ".habib", "development.sqlite");
    mkdirSync(dirname(path), { recursive: true, mode: 0o700 });
    // Loaded only in development; PostgreSQL is used for deployment.
    sqlite = new DatabaseSync(path);
    sqlite.exec(
      "PRAGMA foreign_keys=ON; PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;",
    );
    sqlite.exec(
      readFileSync(join(process.cwd(), "src/lib/data/schema.sql"), "utf8"),
    );
  }
  return sqlite;
}
function placeholders(sql: string) {
  let index = 0;
  return sql.replace(/\?/g, () => `$${++index}`);
}
function pgAdapter(client: { unsafe: Function }): DB {
  return {
    async all<T>(sql: string, params: unknown[] = []) {
      return (await client.unsafe(placeholders(sql), params)) as T[];
    },
    async run(sql: string, params: unknown[] = []) {
      await client.unsafe(placeholders(sql), params);
    },
  };
}
export async function transaction<T>(work: (db: DB) => Promise<T>): Promise<T> {
  if (production()) {
    return (await cloud().begin(async (tx) => {
      await tx.unsafe("SELECT pg_advisory_xact_lock(7420181)");
      return work(pgAdapter(tx));
    })) as T;
  }
  const previous = queue;
  let release!: () => void;
  queue = new Promise((r) => {
    release = r;
  });
  await previous;
  try {
    const db = local();
    const adapter: DB = {
      async all<T>(sql: string, params: unknown[] = []) {
        return db
          .prepare(sql)
          .all(...(params as (string | number | null)[])) as T[];
      },
      async run(sql: string, params: unknown[] = []) {
        db.prepare(sql).run(...(params as (string | number | null)[]));
      },
    };
    db.exec("BEGIN IMMEDIATE");
    try {
      const value = await work(adapter);
      db.exec("COMMIT");
      return value;
    } catch (e) {
      db.exec("ROLLBACK");
      throw e;
    }
  } finally {
    release();
  }
}
export async function query<T>(sql: string, params: unknown[] = []) {
  return transaction((db) => db.all<T>(sql, params));
}

export async function closeDatabase() {
  await queue;
  if (pg) {
    await pg.end();
    pg = undefined;
  }
  if (sqlite) {
    sqlite.close();
    sqlite = undefined;
  }
}
