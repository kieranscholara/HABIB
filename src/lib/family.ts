import { randomUUID, createHash } from "node:crypto";
import { isProduction, type DB } from "./data/db";
import { AppError } from "./http";
import { homeworkTopic } from "./homework";
import { topicById, type Topic } from "./curriculum";
export interface Child {
  id: string;
  parent_id: string;
  nickname: string;
  school_year: number;
  language: "mt" | "en";
  created_at: string;
  consented?: number;
}
export interface Session {
  id: string;
  child_id: string;
  topic_id: string;
  status: string;
  step: number;
  mistakes: number;
  turn_count: number;
  started_at: string;
  ended_at: string | null;
  homework_json: string | null;
}
export interface Subscription {
  parent_id: string;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  status: string;
  period_start: string;
  period_end: string;
  voice_limit_ms: number;
  cancel_at_period_end: number;
}
export function contentHash(topic: Topic) {
  return createHash("sha256").update(JSON.stringify(topic)).digest("hex");
}
export async function approved(db: DB, topic: Topic) {
  const rows = await db.all<{ content_hash: string }>(
    "SELECT content_hash FROM curriculum_reviews WHERE topic_id=?",
    [topic.id],
  );
  return rows[0]?.content_hash === contentHash(topic);
}
export async function ownedChild(db: DB, parentId: string, childId: string) {
  const rows = await db.all<Child>(
    "SELECT * FROM children WHERE id=? AND parent_id=?",
    [childId, parentId],
  );
  if (!rows[0])
    throw new AppError(
      "CHILD_ACCESS_DENIED",
      "This child profile is unavailable.",
      403,
    );
  return rows[0];
}
export async function consent(db: DB, childId: string) {
  const rows = await db.all(
    "SELECT id FROM consents WHERE child_id=? AND purpose=? AND policy_version=? AND revoked_at IS NULL",
    [childId, "maths_tutoring", "1.0"],
  );
  if (!rows.length)
    throw new AppError(
      "PARENT_CONSENT_REQUIRED",
      "Parent authorisation is required before learning.",
      403,
    );
}
export async function entitlement(db: DB, parentId: string) {
  const rows = await db.all<Subscription>(
    "SELECT * FROM subscriptions WHERE parent_id=?",
    [parentId],
  );
  const s = rows[0];
  if (
    !s ||
    !["active", "trial", "development"].includes(s.status) ||
    s.period_end <= new Date().toISOString()
  )
    throw new AppError(
      "SUBSCRIPTION_REQUIRED",
      "Your trial or subscription has ended. Please check your plan.",
      403,
    );
  return s;
}
export async function ownedSession(
  db: DB,
  parentId: string,
  sessionId: string,
  allowComplete = false,
) {
  const rows = await db.all<Session>(
    "SELECT s.* FROM tutor_sessions s JOIN children c ON c.id=s.child_id WHERE s.id=? AND c.parent_id=?",
    [sessionId, parentId],
  );
  const s = rows[0];
  if (!s)
    throw new AppError(
      "CHILD_ACCESS_DENIED",
      "This session is unavailable.",
      403,
    );
  if (s.status !== "active" && !(allowComplete && s.status === "complete"))
    throw new AppError("SESSION_NOT_ACTIVE", "This lesson has ended.", 409);
  if (s.started_at < new Date(Date.now() - 2 * 3600000).toISOString())
    throw new AppError(
      "SESSION_EXPIRED",
      "Start a new lesson to continue.",
      409,
    );
  const child = await ownedChild(db, parentId, s.child_id);
  await consent(db, s.child_id);
  await entitlement(db, parentId);
  const topic = topicById(s.topic_id);
  if (!topic)
    throw new AppError("TOPIC_UNAVAILABLE", "This topic is unavailable.");
  if (isProduction() && !(await approved(db, topic)))
    throw new AppError(
      "TOPIC_UNREVIEWED",
      "This lesson is awaiting teacher approval.",
      403,
    );
  return {
    session: s,
    child,
    topic: s.homework_json
      ? homeworkTopic(topic, JSON.parse(s.homework_json))
      : topic,
  };
}
export async function usage(db: DB, parentId: string, s: Subscription) {
  const rows = await db.all<{ used: number }>(
    "SELECT COALESCE(SUM(units),0) AS used FROM usage_events WHERE parent_id=? AND period_key=? AND status IN (?,?)",
    [parentId, s.period_start, "reserved", "complete"],
  );
  return {
    usedMs: Number(rows[0]?.used || 0),
    limitMs: s.voice_limit_ms,
    remainingMs: Math.max(0, s.voice_limit_ms - Number(rows[0]?.used || 0)),
  };
}
export async function reserveVoice(
  db: DB,
  parentId: string,
  sessionId: string,
  id: string,
  kind: string,
  units: number,
) {
  await ownedSession(db, parentId, sessionId, true);
  const existing = await db.all<{
    status: string;
    kind: string;
    session_id: string;
  }>(
    "SELECT status,kind,session_id FROM usage_events WHERE id=? AND parent_id=?",
    [id, parentId],
  );
  if (existing[0]?.status === "failed") {
    await db.run("DELETE FROM usage_events WHERE id=? AND parent_id=?", [
      id,
      parentId,
    ]);
    existing.length = 0;
  }
  if (existing.length)
    throw new AppError(
      "REQUEST_ALREADY_PROCESSED",
      "This voice request has already been processed. It will not be charged again.",
      409,
    );
  const sub = await entitlement(db, parentId);
  if ((await usage(db, parentId, sub)).remainingMs < units)
    throw new AppError(
      "VOICE_LIMIT_REACHED",
      "Your family’s voice allowance has been used.",
      429,
    );
  await db.run(
    "INSERT INTO usage_events(id,parent_id,session_id,kind,units,period_key,status,created_at) VALUES(?,?,?,?,?,?,?,?)",
    [
      id,
      parentId,
      sessionId,
      kind,
      units,
      sub.period_start,
      "reserved",
      new Date().toISOString(),
    ],
  );
}
export const uuid = () => randomUUID();
