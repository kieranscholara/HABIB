import { beforeEach, describe, it, expect } from "vitest";
import { randomUUID } from "node:crypto";
process.env.HABIB_DATABASE_PATH = "/tmp/habib-unit-" + randomUUID() + ".sqlite";
import { transaction } from "../src/lib/data/db";
import {
  ownedSession,
  ownedChild,
  reserveVoice,
  usage,
  type Subscription,
} from "../src/lib/family";
import { checkPassword, passwordHash } from "../src/lib/auth";
const A = randomUUID(),
  B = randomUUID(),
  kid = randomUUID(),
  session = randomUUID();
beforeEach(async () => {
  await transaction(async (db) => {
    await db.run("DELETE FROM parents");
    const now = new Date().toISOString();
    for (const id of [A, B]) {
      await db.run(
        "INSERT INTO parents(id,email,display_name,created_at) VALUES(?,?,?,?)",
        [id, id + "@test.invalid", "Tester", now],
      );
      await db.run(
        "INSERT INTO subscriptions(parent_id,status,period_start,period_end,voice_limit_ms,updated_at) VALUES(?,?,?,?,?,?)",
        [
          id,
          "trial",
          now,
          new Date(Date.now() + 86400000).toISOString(),
          30000,
          now,
        ],
      );
    }
    await db.run(
      "INSERT INTO children(id,parent_id,nickname,school_year,language,created_at) VALUES(?,?,?,?,?,?)",
      [kid, A, "Test", 5, "mt", now],
    );
    await db.run(
      "INSERT INTO consents(id,parent_id,child_id,policy_version,purpose,verification_method,granted_at) VALUES(?,?,?,?,?,?,?)",
      [randomUUID(), A, kid, "1.0", "maths_tutoring", "test", now],
    );
    await db.run(
      "INSERT INTO tutor_sessions(id,child_id,topic_id,status,started_at) VALUES(?,?,?,?,?)",
      [session, kid, "Y5-FRACTIONS", "active", now],
    );
  });
});
describe("family boundaries and bounded usage", () => {
  it("denies another family’s child and lesson", async () => {
    await expect(
      transaction((db) => ownedChild(db, B, kid)),
    ).rejects.toMatchObject({ status: 403 });
    await expect(
      transaction((db) => ownedSession(db, B, session)),
    ).rejects.toMatchObject({ status: 403 });
  });
  it("checks authorisation again during an active session", async () => {
    await transaction((db) =>
      db.run("UPDATE consents SET revoked_at=? WHERE child_id=?", [
        new Date().toISOString(),
        kid,
      ]),
    );
    await expect(
      transaction((db) => ownedSession(db, A, session)),
    ).rejects.toMatchObject({ code: "PARENT_CONSENT_REQUIRED" });
  });
  it("allows exactly one competing reservation for the last available minutes", async () => {
    const results = await Promise.allSettled(
      [randomUUID(), randomUUID()].map((id) =>
        transaction((db) =>
          reserveVoice(db, A, session, id, "synthesis", 30000),
        ),
      ),
    );
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    const sub = await transaction((db) =>
      db.all<Subscription>("SELECT * FROM subscriptions WHERE parent_id=?", [
        A,
      ]),
    );
    expect((await transaction((db) => usage(db, A, sub[0]))).remainingMs).toBe(
      0,
    );
  });
  it("rejects a duplicate voice charge", async () => {
    const request = randomUUID();
    await transaction((db) =>
      reserveVoice(db, A, session, request, "synthesis", 30000),
    );
    await expect(
      transaction((db) =>
        reserveVoice(db, A, session, request, "synthesis", 30000),
      ),
    ).rejects.toMatchObject({ code: "REQUEST_ALREADY_PROCESSED" });
  });
  it("permits retry after a failed request releases its reservation", async () => {
    const request = randomUUID();
    await transaction((db) =>
      reserveVoice(db, A, session, request, "synthesis", 30000),
    );
    await transaction((db) =>
      db.run("UPDATE usage_events SET status='failed',units=0 WHERE id=?", [
        request,
      ]),
    );
    await expect(
      transaction((db) =>
        reserveVoice(db, A, session, request, "synthesis", 30000),
      ),
    ).resolves.toBeUndefined();
  });
  it("denies an expired trial", async () => {
    await transaction((db) =>
      db.run("UPDATE subscriptions SET period_end=? WHERE parent_id=?", [
        "2000-01-01T00:00:00.000Z",
        A,
      ]),
    );
    await expect(
      transaction((db) => ownedSession(db, A, session)),
    ).rejects.toMatchObject({ code: "SUBSCRIPTION_REQUIRED" });
  });
  it("preserves completed older short lessons without resetting progress when programmes expand", async () => {
    await transaction((db) =>
      db.run("UPDATE tutor_sessions SET status='complete',step=4 WHERE id=?", [
        session,
      ]),
    );
    const old = await transaction((db) => ownedSession(db, A, session, true));
    expect(old.topic.legacy).toBe(true);
    expect(old.topic.exercises).toHaveLength(4);
    expect(old.session.step).toBe(4);
  });
  it("removes dependent learning records when a parent is erased", async () => {
    await transaction((db) => db.run("DELETE FROM parents WHERE id=?", [A]));
    expect(
      await transaction((db) =>
        db.all("SELECT * FROM children WHERE id=?", [kid]),
      ),
    ).toHaveLength(0);
    expect(
      await transaction((db) =>
        db.all("SELECT * FROM tutor_sessions WHERE id=?", [session]),
      ),
    ).toHaveLength(0);
  });
  it("salts passwords and checks them using scrypt", () => {
    const a = passwordHash("secure test password"),
      b = passwordHash("secure test password");
    expect(a).not.toBe(b);
    expect(checkPassword("secure test password", a)).toBe(true);
    expect(checkPassword("wrong password", a)).toBe(false);
  });
});
