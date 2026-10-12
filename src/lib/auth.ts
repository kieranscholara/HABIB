import {
  randomBytes,
  createHash,
  scryptSync,
  timingSafeEqual,
  randomUUID,
} from "node:crypto";
import { cookies } from "next/headers";
import { createClient } from "@supabase/supabase-js";
import { transaction, query, isProduction, type DB } from "./data/db";
import { AppError } from "./http";
export interface Parent {
  id: string;
  email: string;
  display_name: string;
  created_at: string;
  password_hash?: string;
}
const hash = (s: string) => createHash("sha256").update(s).digest("hex");
export function passwordHash(password: string) {
  const salt = randomBytes(16).toString("hex");
  return salt + ":" + scryptSync(password, salt, 64).toString("hex");
}
export function checkPassword(password: string, stored: string) {
  const [salt, key] = stored.split(":");
  if (!salt || !key) return false;
  const a = scryptSync(password, salt, 64),
    b = Buffer.from(key, "hex");
  return a.length === b.length && timingSafeEqual(a, b);
}
export function supabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL,
    key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key)
    throw new AppError(
      "CONFIGURATION_REQUIRED",
      "Supabase authentication needs configuration.",
      503,
    );
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
export async function rate(db: DB, key: string, limit: number, seconds = 60) {
  const now = new Date().toISOString();
  const rows = await db.all<{ hits: number; expires_at: string }>(
    "SELECT hits,expires_at FROM rate_limits WHERE key=?",
    [key],
  );
  const row = rows[0];
  if (!row || row.expires_at <= now) {
    await db.run(
      "INSERT INTO rate_limits(key,hits,expires_at) VALUES(?,1,?) ON CONFLICT(key) DO UPDATE SET hits=1,expires_at=excluded.expires_at",
      [key, new Date(Date.now() + seconds * 1000).toISOString()],
    );
  } else {
    if (row.hits >= limit)
      throw new AppError(
        "RATE_LIMITED",
        "Please wait a moment before trying again.",
        429,
      );
    await db.run("UPDATE rate_limits SET hits=hits+1 WHERE key=?", [key]);
  }
}
export async function parent(): Promise<Parent> {
  const token = (await cookies()).get("habib_session")?.value;
  if (!token)
    throw new AppError("AUTH_REQUIRED", "Please sign in to continue.", 401);
  const rows = await query<Parent>(
    "SELECT p.id,p.email,p.display_name,p.created_at FROM parents p JOIN auth_sessions s ON p.id=s.parent_id WHERE s.token_hash=? AND s.expires_at>?",
    [hash(token), new Date().toISOString()],
  );
  if (!rows[0])
    throw new AppError(
      "AUTH_REQUIRED",
      "Your session expired. Please sign in again.",
      401,
    );
  return rows[0];
}
export async function issueSession(parentId: string) {
  const token = randomBytes(32).toString("hex");
  await transaction(async (db) => {
    await db.run("DELETE FROM auth_sessions WHERE expires_at<?", [
      new Date().toISOString(),
    ]);
    await db.run(
      "INSERT INTO auth_sessions(token_hash,parent_id,expires_at) VALUES(?,?,?)",
      [
        hash(token),
        parentId,
        new Date(Date.now() + 12 * 3600000).toISOString(),
      ],
    );
  });
  (await cookies()).set("habib_session", token, {
    httpOnly: true,
    sameSite: "lax",
    secure: isProduction(),
    path: "/",
    maxAge: 12 * 3600,
  });
}
export async function logout() {
  const jar = await cookies(),
    token = jar.get("habib_session")?.value;
  if (token)
    await transaction((db) =>
      db.run("DELETE FROM auth_sessions WHERE token_hash=?", [hash(token)]),
    );
  jar.delete("habib_session");
}
export async function register(email: string, password: string, name: string) {
  let parentId: string = randomUUID();
  let secret: string | null = passwordHash(password);
  if (isProduction()) {
    const { data, error } = await supabase().auth.signUp({
      email,
      password,
      options: {
        data: { display_name: name },
        emailRedirectTo: process.env.NEXT_PUBLIC_APP_URL + "/auth/confirm",
      },
    });
    if (error || !data.user)
      throw new AppError(
        "SIGNUP_FAILED",
        "Could not create this account. Try signing in or resetting your password.",
      );
    parentId = data.user.id;
    secret = null;
    if (!data.session) return { confirmationRequired: true };
  }
  await transaction(async (db) => {
    const existing = await db.all("SELECT id FROM parents WHERE email=?", [
      email,
    ]);
    if (existing.length)
      throw new AppError(
        "SIGNUP_FAILED",
        "Could not create this account. Try signing in.",
      );
    await db.run(
      "INSERT INTO parents(id,email,display_name,password_hash,created_at) VALUES(?,?,?,?,?)",
      [parentId, email, name, secret, new Date().toISOString()],
    );
    const now = new Date();
    await db.run(
      "INSERT INTO subscriptions(parent_id,status,period_start,period_end,voice_limit_ms,updated_at) VALUES(?,?,?,?,?,?)",
      [
        parentId,
        isProduction() ? "trial" : "development",
        now.toISOString(),
        new Date(now.getTime() + 7 * 86400000).toISOString(),
        300000,
        now.toISOString(),
      ],
    );
  });
  await issueSession(parentId);
  return { confirmationRequired: false };
}
export async function ensureCloudParent(user: {
  id: string;
  email?: string;
  user_metadata?: { display_name?: string };
}) {
  await transaction(async (db) => {
    await db.run(
      "INSERT INTO parents(id,email,display_name,created_at) VALUES(?,?,?,?) ON CONFLICT(id) DO NOTHING",
      [
        user.id,
        user.email || "",
        user.user_metadata?.display_name || "Parent",
        new Date().toISOString(),
      ],
    );
    const now = new Date();
    await db.run(
      "INSERT INTO subscriptions(parent_id,status,period_start,period_end,voice_limit_ms,updated_at) VALUES(?,?,?,?,?,?) ON CONFLICT(parent_id) DO NOTHING",
      [
        user.id,
        "trial",
        now.toISOString(),
        new Date(now.getTime() + 7 * 86400000).toISOString(),
        300000,
        now.toISOString(),
      ],
    );
  });
}
export async function login(email: string, password: string) {
  if (isProduction()) {
    const { data, error } = await supabase().auth.signInWithPassword({
      email,
      password,
    });
    if (error || !data.user)
      throw new AppError(
        "LOGIN_FAILED",
        "Email or password is incorrect.",
        401,
      );
    await ensureCloudParent(data.user);
    await issueSession(data.user.id);
  } else {
    const rows = await query<Parent>("SELECT * FROM parents WHERE email=?", [
      email,
    ]);
    const dummy =
      "constant:" + scryptSync("incorrect", "constant", 64).toString("hex");
    if (!checkPassword(password, rows[0]?.password_hash || dummy))
      throw new AppError(
        "LOGIN_FAILED",
        "Email or password is incorrect.",
        401,
      );
    await issueSession(rows[0].id);
  }
}
