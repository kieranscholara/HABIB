import { NextRequest } from "next/server";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import { createHash, timingSafeEqual } from "node:crypto";
import { body, json, handle, origin, AppError, id } from "@/lib/http";
import {
  parent,
  register,
  login,
  logout,
  rate,
  supabase,
  ensureCloudParent,
  issueSession,
} from "@/lib/auth";
import { transaction, isProduction, query } from "@/lib/data/db";
import {
  curriculum,
  publicTopic,
  topicById,
  teaching,
  numericAnswer,
} from "@/lib/curriculum";
import {
  approved,
  ownedChild,
  ownedSession,
  consent,
  entitlement,
  usage,
  uuid,
  type Child,
} from "@/lib/family";
import {
  speechRequest,
  transcribeRequest,
  homeworkRequest,
} from "@/lib/providers";
import { conversationalHint } from "@/lib/tutor-provider";
import { homeworkSchema } from "@/lib/homework";
import { billing, webhook } from "@/lib/billing";
export const runtime = "nodejs";
const account = z.object({
  email: z
    .email()
    .max(254)
    .transform((v) => v.toLowerCase()),
  password: z.string().min(10).max(128),
});
const childSchema = z
  .object({
    nickname: z.string().trim().min(1).max(30),
    schoolYear: z.number().int().min(4).max(6),
    language: z.enum(["mt", "en"]),
  })
  .strict();
type Context = { params: Promise<{ path: string[] }> };
async function handler(req: NextRequest, context: Context) {
  try {
    const parts = (await context.params).path,
      path = parts.join("/"),
      method = req.method;
    if (path === "billing/webhook" && method === "POST")
      return await webhook(req);
    if (method !== "GET") origin(req);
    if (path === "status" && method === "GET")
      return json({
        mode: isProduction() ? "production" : "development",
        speechConfigured:
          process.env.HABIB_SPEECH_ENABLED !== "false" &&
          !!(
            (process.env.HABIB_SPEECH_KEY || process.env.AZURE_SPEECH_KEY) &&
            (process.env.HABIB_SPEECH_REGION || process.env.AZURE_SPEECH_REGION)
          ),
        homeworkConfigured:
          process.env.HABIB_HOMEWORK_ENABLED !== "false" &&
          !!process.env.HABIB_OPENAI_KEY,
        billingConfigured: !!(
          process.env.STRIPE_SECRET_KEY && process.env.STRIPE_FAMILY_PRICE_ID
        ),
        contentRequiresReview: true,
      });
    if (path.startsWith("auth/")) {
      if (method !== "POST")
        throw new AppError("METHOD_NOT_ALLOWED", "Method not allowed.", 405);
      if (path === "auth/logout") {
        await logout();
        return json({ ok: true });
      }
      if (path === "auth/login" || path === "auth/signup") {
        const input = await body(
          req,
          account.extend({
            name: z.string().trim().min(1).max(60).optional(),
            adult: z.boolean().optional(),
            inviteCode: z.string().max(200).optional(),
          }),
        );
        await transaction(async (db) => {
          await rate(db, "auth-global", 150, 3600);
          await rate(
            db,
            "auth:" + createHash("sha256").update(input.email).digest("hex"),
            10,
            600,
          );
        });
        if (path === "auth/signup") {
          if (!input.adult)
            throw new AppError(
              "ADULT_REQUIRED",
              "Only a parent or legal guardian may create an account.",
            );
          if (isProduction()) {
            const expected = process.env.HABIB_INVITE_CODE;
            const given = Buffer.from(input.inviteCode || "");
            if (
              !expected ||
              given.length !== Buffer.byteLength(expected) ||
              !timingSafeEqual(given, Buffer.from(expected))
            )
              throw new AppError(
                "INVITATION_REQUIRED",
                "An invitation is required during the controlled launch.",
                403,
              );
          }
          return json(
            await register(input.email, input.password, input.name || "Parent"),
            201,
          );
        }
        await login(input.email, input.password);
        return json({ ok: true });
      }
      if (path === "auth/forgot") {
        const input = await body(req, z.object({ email: z.email().max(254) }));
        await transaction((db) => rate(db, "reset-global", 30, 3600));
        if (!isProduction())
          throw new AppError(
            "LOCAL_RESET_UNAVAILABLE",
            "Email recovery is available with Supabase in production. Create a different test account locally.",
            503,
          );
        await supabase().auth.resetPasswordForEmail(input.email, {
          redirectTo: process.env.NEXT_PUBLIC_APP_URL + "/reset-password",
        });
        return json({
          message:
            "If this account exists, a password reset email has been sent.",
        });
      }
      if (path === "auth/confirm") {
        const input = await body(
          req,
          z.object({ tokenHash: z.string().min(10).max(300) }),
        );
        if (!isProduction())
          throw new AppError(
            "NOT_AVAILABLE",
            "Email confirmation is not required locally.",
          );
        const { data, error } = await supabase().auth.verifyOtp({
          token_hash: input.tokenHash,
          type: "signup",
        });
        if (error || !data.user)
          throw new AppError(
            "LINK_EXPIRED",
            "This confirmation link is invalid or expired.",
          );
        await ensureCloudParent(data.user);
        await issueSession(data.user.id);
        return json({ ok: true });
      }
      if (path === "auth/reset") {
        const input = await body(
          req,
          z.object({
            tokenHash: z.string().min(10).max(300),
            password: z.string().min(10).max(128),
          }),
        );
        if (!isProduction())
          throw new AppError(
            "NOT_AVAILABLE",
            "Configure Supabase to use email recovery.",
          );
        const client = supabase();
        const { error } = await client.auth.verifyOtp({
          token_hash: input.tokenHash,
          type: "recovery",
        });
        if (error)
          throw new AppError(
            "LINK_EXPIRED",
            "This reset link is invalid or expired.",
          );
        const { data, error: updateError } = await client.auth.updateUser({
          password: input.password,
        });
        if (updateError || !data.user)
          throw new AppError("RESET_FAILED", "Could not change your password.");
        await transaction((db) =>
          db.run("DELETE FROM auth_sessions WHERE parent_id=?", [data.user.id]),
        );
        return json({ ok: true });
      }
    }
    const user = await parent();
    await transaction((db) => rate(db, "parent:" + user.id, 120));
    if (path === "me" && method === "GET")
      return await transaction(async (db) => {
        const sub = (
          await db.all("SELECT * FROM subscriptions WHERE parent_id=?", [
            user.id,
          ])
        )[0];
        const usageData = sub
          ? await usage(
              db,
              user.id,
              sub as unknown as import("@/lib/family").Subscription,
            )
          : null;
        return json({
          parent: user,
          subscription: sub,
          usage: usageData,
          mode: isProduction() ? "production" : "development",
        });
      });
    if (path === "children" && method === "GET")
      return await transaction(async (db) =>
        json({
          children: await db.all(
            "SELECT c.*, CASE WHEN EXISTS(SELECT 1 FROM consents n WHERE n.child_id=c.id AND n.revoked_at IS NULL AND n.policy_version=?) THEN 1 ELSE 0 END AS consented FROM children c WHERE c.parent_id=? ORDER BY c.created_at",
            ["1.0", user.id],
          ),
        }),
      );
    if (path === "children" && method === "POST") {
      const input = await body(req, childSchema);
      return await transaction(async (db) => {
        const children = await db.all(
          "SELECT id FROM children WHERE parent_id=?",
          [user.id],
        );
        if (children.length >= 2)
          throw new AppError(
            "CHILD_LIMIT",
            "Your family plan includes two child profiles.",
            409,
          );
        const childId = uuid();
        await db.run(
          "INSERT INTO children(id,parent_id,nickname,school_year,language,created_at) VALUES(?,?,?,?,?,?)",
          [
            childId,
            user.id,
            input.nickname,
            input.schoolYear,
            input.language,
            new Date().toISOString(),
          ],
        );
        return json({ id: childId }, 201);
      });
    }
    if (parts[0] === "children" && parts[1]) {
      id.parse(parts[1]);
      const childId = parts[1];
      if (parts[2] === "consent" && method === "POST") {
        const input = await body(
          req,
          z.object({
            authorised: z.literal(true),
            policyVersion: z.literal("1.0"),
          }),
        );
        return await transaction(async (db) => {
          await ownedChild(db, user.id, childId);
          await db.run(
            "UPDATE consents SET revoked_at=? WHERE child_id=? AND revoked_at IS NULL",
            [new Date().toISOString(), childId],
          );
          await db.run(
            "INSERT INTO consents(id,parent_id,child_id,policy_version,purpose,verification_method,granted_at) VALUES(?,?,?,?,?,?,?)",
            [
              uuid(),
              user.id,
              childId,
              input.policyVersion,
              "maths_tutoring",
              isProduction()
                ? "verified_parent_account"
                : "development_parent_account",
              new Date().toISOString(),
            ],
          );
          return json({ ok: true });
        });
      }
      if (parts[2] === "consent" && method === "DELETE")
        return await transaction(async (db) => {
          await ownedChild(db, user.id, childId);
          await db.run(
            "UPDATE consents SET revoked_at=? WHERE child_id=? AND revoked_at IS NULL",
            [new Date().toISOString(), childId],
          );
          await db.run(
            "UPDATE tutor_sessions SET status='ended',ended_at=? WHERE child_id=? AND status='active'",
            [new Date().toISOString(), childId],
          );
          return json({ ok: true });
        });
      if (parts.length === 2 && method === "PATCH") {
        const input = await body(req, childSchema);
        return await transaction(async (db) => {
          await ownedChild(db, user.id, childId);
          await db.run(
            "UPDATE children SET nickname=?,school_year=?,language=? WHERE id=?",
            [input.nickname, input.schoolYear, input.language, childId],
          );
          await db.run(
            "UPDATE tutor_sessions SET status='ended',ended_at=? WHERE child_id=? AND status='active'",
            [new Date().toISOString(), childId],
          );
          return json({ ok: true });
        });
      }
      if (parts.length === 2 && method === "DELETE")
        return await transaction(async (db) => {
          await ownedChild(db, user.id, childId);
          await db.run("DELETE FROM children WHERE id=?", [childId]);
          return json({ ok: true });
        });
    }
    if (path === "curriculum" && method === "GET")
      return await transaction(async (db) => {
        const list = [];
        for (const t of curriculum) {
          const reviewed = await approved(db, t);
          if (!isProduction() || reviewed) list.push(publicTopic(t, reviewed));
        }
        return json({ topics: list });
      });
    if (path === "progress" && method === "GET")
      return await transaction(async (db) =>
        json({
          progress: await db.all(
            "SELECT p.* FROM topic_progress p JOIN children c ON c.id=p.child_id WHERE c.parent_id=? ORDER BY p.last_practised_at DESC",
            [user.id],
          ),
          sessions: await db.all(
            "SELECT s.id,s.child_id,s.topic_id,s.status,s.started_at,s.ended_at,s.turn_count FROM tutor_sessions s JOIN children c ON c.id=s.child_id WHERE c.parent_id=? ORDER BY s.started_at DESC LIMIT 50",
            [user.id],
          ),
        }),
      );
    if (path === "sessions" && method === "POST") {
      const input = await body(
        req,
        z.object({ childId: id, topicId: z.string().min(1).max(80) }).strict(),
      );
      return await transaction(async (db) => {
        const child = await ownedChild(db, user.id, input.childId);
        await consent(db, child.id);
        await entitlement(db, user.id);
        const topic = topicById(input.topicId);
        if (!topic || topic.year !== child.school_year)
          throw new AppError(
            "TOPIC_UNAVAILABLE",
            "Choose a topic for your child’s school year.",
          );
        if (isProduction() && !(await approved(db, topic)))
          throw new AppError(
            "TOPIC_UNREVIEWED",
            "This topic is awaiting teacher approval.",
            403,
          );
        await db.run(
          "UPDATE tutor_sessions SET status='ended',ended_at=? WHERE child_id=? AND status='active'",
          [new Date().toISOString(), child.id],
        );
        const sessionId = uuid();
        await db.run(
          "INSERT INTO tutor_sessions(id,child_id,topic_id,status,started_at) VALUES(?,?,?,?,?)",
          [sessionId, child.id, topic.id, "active", new Date().toISOString()],
        );
        return json({ id: sessionId }, 201);
      });
    }
    if (parts[0] === "sessions" && parts[1]) {
      const sessionId = id.parse(parts[1]);
      if (parts.length === 2 && method === "GET")
        return await transaction(async (db) => {
          const { session, child, topic } = await ownedSession(
            db,
            user.id,
            sessionId,
            true,
          );
          const turns = await db.all<{ response_json: string }>(
            "SELECT response_json FROM tutor_turns WHERE session_id=? ORDER BY turn_index",
            [sessionId],
          );
          return json({
            session,
            child: {
              id: child.id,
              nickname: child.nickname,
              language: child.language,
            },
            topic: publicTopic(topic, await approved(db, topic)),
            opening: topic.exercises[0].prompt[child.language],
            turns: turns.map((t) => JSON.parse(t.response_json)),
          });
        });
      if (parts[2] === "end" && method === "POST")
        return await transaction(async (db) => {
          const rows = await db.all(
            "SELECT s.id FROM tutor_sessions s JOIN children c ON c.id=s.child_id WHERE s.id=? AND c.parent_id=?",
            [sessionId, user.id],
          );
          if (!rows.length)
            throw new AppError(
              "CHILD_ACCESS_DENIED",
              "This session is unavailable.",
              403,
            );
          await db.run(
            "UPDATE tutor_sessions SET status='ended',ended_at=? WHERE id=? AND status='active'",
            [new Date().toISOString(), sessionId],
          );
          return json({ ok: true });
        });
      if (parts[2] === "turns" && method === "POST") {
        const input = await body(
          req,
          z
            .object({
              clientTurnId: id,
              text: z.string().trim().min(1).max(500),
            })
            .strict(),
        );
        const start = performance.now();
        const context = await transaction((db) =>
          ownedSession(db, user.id, sessionId, true),
        );
        const previous = await transaction((db) =>
          db.all<{ response_json: string }>(
            "SELECT response_json FROM tutor_turns WHERE session_id=? AND client_turn_id=?",
            [sessionId, input.clientTurnId],
          ),
        );
        if (previous[0]) return json(JSON.parse(previous[0].response_json));
        const action =
          numericAnswer(input.text) === null
            ? await conversationalHint(
                input.text,
                context.topic,
                context.session.step,
                context.child.language,
              )
            : null;
        return await transaction(async (db) => {
          const { session, child, topic } = await ownedSession(
            db,
            user.id,
            sessionId,
            true,
          );
          const existing = await db.all<{ response_json: string }>(
            "SELECT response_json FROM tutor_turns WHERE session_id=? AND client_turn_id=?",
            [sessionId, input.clientTurnId],
          );
          if (existing[0]) return json(JSON.parse(existing[0].response_json));
          if (session.status !== "active")
            throw new AppError(
              "SESSION_NOT_ACTIVE",
              "This lesson is complete.",
              409,
            );
          if (session.turn_count >= 60)
            throw new AppError(
              "TURN_LIMIT",
              "Take a break and start another lesson.",
              429,
            );
          const result = teaching(
            topic,
            session.step,
            session.mistakes,
            input.text,
            child.language,
          );
          if (result.correct === null && result.safetyState === "normal") {
            if (action === "repeat")
              result.text =
                topic.exercises[session.step]?.prompt[child.language] ||
                result.text;
            if (action === "redirect")
              result.text =
                (child.language === "mt"
                  ? "Ejja nibqgħu fuq il-matematika. "
                  : "Let’s stay with our maths lesson. ") +
                (topic.exercises[session.step]?.prompt[child.language] || "");
          }
          const done = result.nextStep >= topic.exercises.length;
          const now = new Date().toISOString();
          if (result.correct !== null) {
            await db.run(
              "INSERT INTO question_attempts(id,session_id,question_id,is_correct,hints_used,created_at) VALUES(?,?,?,?,?,?)",
              [
                uuid(),
                sessionId,
                `${session.homework_json ? "HOMEWORK" : topic.id}:${session.step}`,
                result.correct ? 1 : 0,
                session.mistakes,
                now,
              ],
            );
            await db.run(
              "INSERT INTO topic_progress(child_id,topic_id,questions_attempted,correct_count,completed_lessons,last_practised_at) VALUES(?,?,?,?,?,?) ON CONFLICT(child_id,topic_id) DO UPDATE SET questions_attempted=topic_progress.questions_attempted+1,correct_count=topic_progress.correct_count+excluded.correct_count,completed_lessons=topic_progress.completed_lessons+excluded.completed_lessons,last_practised_at=excluded.last_practised_at",
              [
                child.id,
                session.homework_json ? "HOMEWORK" : topic.id,
                1,
                result.correct ? 1 : 0,
                done ? 1 : 0,
                now,
              ],
            );
          }
          const response = {
            id: uuid(),
            text: result.text,
            correct: result.correct,
            step: result.nextStep,
            totalSteps: topic.exercises.length,
            complete: done,
            safetyState: result.safetyState,
            type: result.type,
            tutorMs: Math.round(performance.now() - start),
          };
          await db.run(
            "INSERT INTO tutor_turns(id,session_id,client_turn_id,turn_index,response_json,created_at) VALUES(?,?,?,?,?,?)",
            [
              response.id,
              sessionId,
              input.clientTurnId,
              session.turn_count,
              JSON.stringify(response),
              now,
            ],
          );
          await db.run(
            "UPDATE tutor_sessions SET step=?,mistakes=?,turn_count=turn_count+1,status=?,ended_at=? WHERE id=?",
            [
              result.nextStep,
              result.nextMistakes,
              done ? "complete" : "active",
              done ? now : null,
              sessionId,
            ],
          );
          return json(response);
        });
      }
      if (parts[2] === "transcribe" && method === "POST")
        return await transcribeRequest(req, user.id, sessionId);
      if (parts[2] === "speech" && method === "POST")
        return await speechRequest(req, user.id, sessionId);
      if (parts[2] === "homework" && method === "POST")
        return await homeworkRequest(req, user.id, sessionId);
      if (
        parts[2] === "homework" &&
        parts[3] === "confirm" &&
        method === "POST"
      ) {
        const input = await body(req, homeworkSchema);
        return await transaction(async (db) => {
          const { session } = await ownedSession(db, user.id, sessionId);
          if (session.turn_count > 0)
            throw new AppError(
              "HOMEWORK_START_REQUIRED",
              "Start a fresh lesson before confirming a photo question.",
              409,
            );
          await db.run(
            "UPDATE tutor_sessions SET homework_json=?,step=0,mistakes=0 WHERE id=?",
            [JSON.stringify(input), sessionId],
          );
          return json({ ok: true });
        });
      }
    }
    if (path === "billing/checkout" && method === "POST")
      return await billing(user, "checkout");
    if (path === "billing/portal" && method === "POST")
      return await billing(user, "portal");
    if (path === "privacy/export" && method === "GET")
      return await transaction(async (db) => {
        const children = await db.all<Child>(
          "SELECT * FROM children WHERE parent_id=?",
          [user.id],
        );
        const consents = await db.all(
          "SELECT * FROM consents WHERE parent_id=?",
          [user.id],
        );
        const progress = await db.all(
          "SELECT p.* FROM topic_progress p JOIN children c ON c.id=p.child_id WHERE c.parent_id=?",
          [user.id],
        );
        const sessions = await db.all(
          "SELECT s.* FROM tutor_sessions s JOIN children c ON c.id=s.child_id WHERE c.parent_id=?",
          [user.id],
        );
        const attempts = await db.all(
          "SELECT a.* FROM question_attempts a JOIN tutor_sessions s ON s.id=a.session_id JOIN children c ON c.id=s.child_id WHERE c.parent_id=?",
          [user.id],
        );
        const events = await db.all(
          "SELECT id,kind,units,period_key,status,created_at FROM usage_events WHERE parent_id=?",
          [user.id],
        );
        return json({
          exportedAt: new Date().toISOString(),
          parent: user,
          children,
          consents,
          progress,
          sessions,
          attempts,
          usage: events,
        });
      });
    if (path === "privacy/delete" && method === "POST") {
      const input = await body(
        req,
        z.object({
          confirmation: z.literal("DELETE"),
          password: z.string().min(1).max(128),
        }),
      );
      await login(user.email, input.password);
      const sub = (
        await query<{ stripe_subscription_id: string | null }>(
          "SELECT stripe_subscription_id FROM subscriptions WHERE parent_id=?",
          [user.id],
        )
      )[0];
      if (sub?.stripe_subscription_id)
        throw new AppError(
          "CANCEL_FIRST",
          "Cancel your subscription in the billing portal before deleting your account.",
          409,
        );
      if (isProduction()) {
        const url = process.env.NEXT_PUBLIC_SUPABASE_URL,
          key = process.env.SUPABASE_SERVICE_ROLE_KEY;
        if (!url || !key)
          throw new AppError(
            "CONFIGURATION_REQUIRED",
            "Account erasure requires Supabase administration access.",
            503,
          );
        const { error } = await createClient(url, key, {
          auth: { persistSession: false },
        }).auth.admin.deleteUser(user.id);
        if (error)
          throw new AppError(
            "ERASURE_FAILED",
            "Could not delete the authentication account. Try again.",
            503,
          );
      }
      await transaction((db) =>
        db.run("DELETE FROM parents WHERE id=?", [user.id]),
      );
      await logout();
      return json({ ok: true });
    }
    throw new AppError("NOT_FOUND", "This endpoint does not exist.", 404);
  } catch (e) {
    return handle(e);
  }
}
export const GET = handler;
export const POST = handler;
export const PATCH = handler;
export const DELETE = handler;
