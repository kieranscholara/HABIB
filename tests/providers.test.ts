import { it, expect, vi, beforeEach, afterEach } from "vitest";
import { randomUUID } from "node:crypto";
import { NextRequest } from "next/server";
process.env.HABIB_DATABASE_PATH =
  "/tmp/habib-provider-" + randomUUID() + ".sqlite";
process.env.AZURE_SPEECH_KEY = "fixture_not_a_credential";
process.env.AZURE_SPEECH_REGION = "westeurope";
const fetchProvider = vi.hoisted(() => vi.fn());
vi.mock("../src/lib/server", () => ({
  azure: () => ({ key: "fixture_not_a_credential", region: "westeurope" }),
  providerFetch: fetchProvider,
}));
import {
  transcribeRequest,
  speechRequest,
  homeworkRequest,
} from "../src/lib/providers";
afterEach(() => vi.unstubAllEnvs());
import { transaction } from "../src/lib/data/db";
const parentId = randomUUID(),
  childId = randomUUID(),
  sessionId = randomUUID();
beforeEach(async () => {
  fetchProvider.mockReset();
  await transaction(async (db) => {
    await db.run("DELETE FROM parents");
    const now = new Date().toISOString();
    await db.run(
      "INSERT INTO parents(id,email,display_name,created_at) VALUES(?,?,?,?)",
      [parentId, parentId + "@example.invalid", "Test", now],
    );
    await db.run(
      "INSERT INTO subscriptions(parent_id,status,period_start,period_end,voice_limit_ms,updated_at) VALUES(?,?,?,?,?,?)",
      [
        parentId,
        "trial",
        now,
        new Date(Date.now() + 86400000).toISOString(),
        300000,
        now,
      ],
    );
    await db.run(
      "INSERT INTO children(id,parent_id,nickname,school_year,language,created_at) VALUES(?,?,?,?,?,?)",
      [childId, parentId, "Test", 5, "mt", now],
    );
    await db.run(
      "INSERT INTO consents(id,parent_id,child_id,policy_version,purpose,verification_method,granted_at) VALUES(?,?,?,?,?,?,?)",
      [randomUUID(), parentId, childId, "1.0", "maths_tutoring", "test", now],
    );
    await db.run(
      "INSERT INTO tutor_sessions(id,child_id,topic_id,status,started_at) VALUES(?,?,?,?,?)",
      [sessionId, childId, "Y5-FRACTIONS", "active", now],
    );
  });
});
function wav() {
  const b = new Uint8Array(32044),
    v = new DataView(b.buffer);
  function text(i: number, s: string) {
    for (let j = 0; j < s.length; j++) b[i + j] = s.charCodeAt(j);
  }
  text(0, "RIFF");
  v.setUint32(4, 32036, true);
  text(8, "WAVE");
  text(12, "fmt ");
  v.setUint32(16, 16, true);
  v.setUint16(20, 1, true);
  v.setUint16(22, 1, true);
  v.setUint32(24, 16000, true);
  v.setUint32(28, 32000, true);
  v.setUint16(32, 2, true);
  v.setUint16(34, 16, true);
  text(36, "data");
  v.setUint32(40, 32000, true);
  return b;
}
function recording(requestId = randomUUID(), bytes = wav()) {
  return new NextRequest("http://localhost:3000", {
    method: "POST",
    headers: { "x-request-id": requestId, "Content-Type": "audio/wav" },
    body: bytes,
  });
}
it("reads only the current trusted English listening stimulus, even for a Maltese profile, and recognises the task language", async () => {
  await transaction(async (db) => {
    await db.run(
      "UPDATE consents SET purpose='school_tutoring',policy_version='1.1' WHERE child_id=?",
      [childId],
    );
    await db.run(
      "UPDATE tutor_sessions SET topic_id='Y5-ENGLISH-LISTENING' WHERE id=?",
      [sessionId],
    );
  });
  fetchProvider.mockResolvedValueOnce(new Response(wav()));
  const response = await speechRequest(
    new NextRequest("http://localhost:3000", {
      method: "POST",
      body: JSON.stringify({
        requestId: randomUUID(),
        turnId: null,
        source: "stimulus",
      }),
    }),
    parentId,
    sessionId,
  );
  expect(response.status).toBe(200);
  const ssml = fetchProvider.mock.calls[0][1].body;
  expect(ssml).toContain("en-GB-SoniaNeural");
  expect(ssml).toContain("Welcome to the school garden club");
  expect(ssml).not.toContain("On which day");
  fetchProvider.mockResolvedValueOnce(
    new Response(
      JSON.stringify({
        RecognitionStatus: "Success",
        NBest: [{ Display: "The club meets on Tuesday.", Confidence: 0.95 }],
      }),
    ),
  );
  await transcribeRequest(recording(), parentId, sessionId);
  expect(fetchProvider.mock.calls[1][0]).toContain("language=en-GB");
  await transaction((db) =>
    db.run(
      "UPDATE tutor_sessions SET step=0,topic_id='Y5-FRACTIONS' WHERE id=?",
      [sessionId],
    ),
  );
  await expect(
    speechRequest(
      new NextRequest("http://localhost:3000", {
        method: "POST",
        body: JSON.stringify({
          requestId: randomUUID(),
          turnId: null,
          source: "stimulus",
        }),
      }),
      parentId,
      sessionId,
    ),
  ).rejects.toMatchObject({ code: "STIMULUS_UNAVAILABLE" });
});
it("sends homework image bytes to the vision provider and returns only confirmed supported parameters", async () => {
  vi.stubEnv("HABIB_OPENAI_KEY", "fixture_not_a_credential");
  const bytes = new Uint8Array([255, 216, 255, 224, 0, 1, 255, 217]);
  fetchProvider.mockResolvedValue(
    new Response(
      JSON.stringify({
        choices: [
          {
            message: {
              content: JSON.stringify({
                supported: true,
                questions: [
                  {
                    question: "One quarter of 20",
                    kind: "fraction_of",
                    a: 20,
                    b: 4,
                    c: 1,
                    operator: "+",
                  },
                ],
              }),
            },
          },
        ],
      }),
    ),
  );
  const result = await homeworkRequest(
    new NextRequest("http://localhost:3000", {
      method: "POST",
      headers: { "Content-Type": "image/jpeg" },
      body: bytes,
    }),
    parentId,
    sessionId,
  );
  const data = await result.json();
  expect(data.requiresConfirmation).toBe(true);
  expect(data.questions[0]).toMatchObject({
    a: 20,
    b: 4,
    c: 1,
    problem: "1/4 of 20",
  });
  const payload = JSON.parse(fetchProvider.mock.calls[0][1].body);
  expect(payload.messages[1].content[0].image_url.url).toBe(
    `data:image/jpeg;base64,${Buffer.from(bytes).toString("base64")}`,
  );
  expect(payload.messages[0].content).toContain("Never guess");
  const session = await transaction((db) =>
    db.all<{ homework_json: string | null }>(
      "SELECT homework_json FROM tutor_sessions WHERE id=?",
      [sessionId],
    ),
  );
  expect(session[0].homework_json).toBeNull();
});
it("rejects unreadable or unsupported photo data instead of presenting a guessed question", async () => {
  vi.stubEnv("HABIB_OPENAI_KEY", "fixture_not_a_credential");
  const req = (bytes: Uint8Array) =>
    new NextRequest("http://localhost:3000", {
      method: "POST",
      headers: { "Content-Type": "image/jpeg" },
      body: new Uint8Array(bytes),
    });
  await expect(
    homeworkRequest(req(new Uint8Array([1, 2, 3])), parentId, sessionId),
  ).rejects.toMatchObject({ code: "IMAGE_INVALID" });
  expect(fetchProvider).not.toHaveBeenCalled();
  fetchProvider.mockResolvedValue(
    new Response(
      JSON.stringify({
        choices: [
          {
            message: {
              content: JSON.stringify({ supported: false, questions: [] }),
            },
          },
        ],
      }),
    ),
  );
  await expect(
    homeworkRequest(req(new Uint8Array([255, 216, 255])), parentId, sessionId),
  ).rejects.toMatchObject({ code: "HOMEWORK_UNSUPPORTED" });
});
it("rejects invalid recordings before consuming quota", async () => {
  await expect(
    transcribeRequest(
      recording(randomUUID(), new Uint8Array(10)),
      parentId,
      sessionId,
    ),
  ).rejects.toMatchObject({ code: "RECORDING_INVALID" });
  expect(fetchProvider).not.toHaveBeenCalled();
  expect(
    await transaction((db) => db.all("SELECT id FROM usage_events")),
  ).toHaveLength(0);
});
it("returns recognition with confidence and charges actual input duration once", async () => {
  const requestId = randomUUID();
  fetchProvider.mockResolvedValue(
    new Response(
      JSON.stringify({
        RecognitionStatus: "Success",
        NBest: [{ Display: "ħamsa", Confidence: 0.96 }],
      }),
    ),
  );
  const a = await transcribeRequest(recording(requestId), parentId, sessionId);
  expect((await a.json()).text).toBe("ħamsa");
  await transcribeRequest(recording(requestId), parentId, sessionId);
  expect(fetchProvider).toHaveBeenCalledTimes(1);
  expect(
    (
      await transaction((db) =>
        db.all<{ units: number }>("SELECT units FROM usage_events"),
      )
    )[0].units,
  ).toBe(1000);
});
it("releases quota after a provider failure", async () => {
  fetchProvider.mockRejectedValue(new Error("Unavailable"));
  await expect(
    transcribeRequest(recording(), parentId, sessionId),
  ).rejects.toThrow();
  expect(
    (
      await transaction((db) =>
        db.all<{ status: string; units: number }>(
          "SELECT status,units FROM usage_events",
        ),
      )
    )[0],
  ).toMatchObject({ status: "failed", units: 0 });
});
it("rechecks withdrawn consent before returning an external result", async () => {
  fetchProvider.mockImplementation(async () => {
    await transaction((db) =>
      db.run("UPDATE consents SET revoked_at=? WHERE child_id=?", [
        new Date().toISOString(),
        childId,
      ]),
    );
    return new Response(
      JSON.stringify({
        RecognitionStatus: "Success",
        NBest: [{ Display: "5" }],
      }),
    );
  });
  await expect(
    transcribeRequest(recording(), parentId, sessionId),
  ).rejects.toMatchObject({ code: "PARENT_CONSENT_REQUIRED" });
  expect(
    (
      await transaction((db) =>
        db.all<{ units: number }>("SELECT units FROM usage_events"),
      )
    )[0].units,
  ).toBe(0);
});
it("synthesises only a saved tutor caption, not arbitrary browser text", async () => {
  const req = new NextRequest("http://localhost:3000", {
    method: "POST",
    body: JSON.stringify({
      requestId: randomUUID(),
      turnId: null,
      text: "Arbitrary injected speech",
    }),
  });
  await expect(speechRequest(req, parentId, sessionId)).rejects.toMatchObject({
    code: "VALIDATION_ERROR",
  });
  expect(fetchProvider).not.toHaveBeenCalled();
});
it("uses formatted speech while retaining the original lesson caption", async () => {
  fetchProvider.mockResolvedValue(new Response(wav()));
  const req = new NextRequest("http://localhost:3000", {
    method: "POST",
    body: JSON.stringify({ requestId: randomUUID(), turnId: null }),
  });
  const response = await speechRequest(req, parentId, sessionId);
  expect(response.status).toBe(200);
  const options = fetchProvider.mock.calls[0][1];
  expect(options.body).toContain('rate="-5%"');
  expect(options.body).toContain("għoxrin maqsum b’erbgħa");
  expect(options.body).not.toContain("20 ÷ 4");
  expect(response.headers.get("Content-Type")).toBe("audio/wav");
});
it("synthesises every part of a long stored reply and reports the total without truncating the end", async () => {
  const turnId = randomUUID();
  const text =
    "First identify the given amount and divide it into equal parts. Now combine the required parts and check the calculation. ".repeat(
      8,
    ) + "This is the final check at the end of the complete explanation.";
  await transaction((db) =>
    db.run(
      "INSERT INTO tutor_turns(id,session_id,client_turn_id,turn_index,response_json,created_at) VALUES(?,?,?,?,?,?)",
      [
        turnId,
        sessionId,
        randomUUID(),
        0,
        JSON.stringify({ text }),
        new Date().toISOString(),
      ],
    ),
  );
  fetchProvider.mockImplementation(async () => new Response(wav()));
  const req = (part: number) =>
    new NextRequest("http://localhost:3000", {
      method: "POST",
      body: JSON.stringify({ requestId: randomUUID(), turnId, part }),
    });
  const first = await speechRequest(req(0), parentId, sessionId);
  const total = Number(first.headers.get("X-Speech-Parts"));
  expect(total).toBeGreaterThan(3);
  for (let part = 1; part < total; part++)
    expect((await speechRequest(req(part), parentId, sessionId)).status).toBe(
      200,
    );
  expect(fetchProvider.mock.calls.at(-1)![1].body).toContain(
    "final check at the end",
  );
  expect(fetchProvider.mock.calls[0][1].body).not.toContain(
    "final check at the end",
  );
  const before = await transaction((db) =>
    db.all("SELECT id FROM usage_events"),
  );
  await expect(
    speechRequest(req(total), parentId, sessionId),
  ).rejects.toMatchObject({ code: "SPEECH_PART_INVALID" });
  expect(
    await transaction((db) => db.all("SELECT id FROM usage_events")),
  ).toHaveLength(before.length);
});
it("extracts multiple questions without persisting the photo or exposing answers", async () => {
  const { homeworkRequest } = await import("../src/lib/providers");
  const { vi } = await import("vitest");
  vi.stubEnv("HABIB_OPENAI_KEY", "fixture_not_a_credential");
  fetchProvider.mockResolvedValue(
    new Response(
      JSON.stringify({
        choices: [
          {
            message: {
              content: JSON.stringify({
                supported: true,
                questions: [
                  {
                    question: "Find three quarters of twenty.",
                    kind: "fraction_of",
                    a: 20,
                    b: 4,
                    c: 3,
                    operator: "+",
                  },
                  {
                    question: "Calculate 12 × 6.",
                    kind: "arithmetic",
                    a: 12,
                    b: 6,
                    c: 1,
                    operator: "*",
                  },
                ],
              }),
            },
          },
        ],
      }),
    ),
  );
  const req = new NextRequest("http://localhost:3000", {
    method: "POST",
    headers: { "Content-Type": "image/jpeg" },
    body: new Uint8Array([255, 216, 255, 217]),
  });
  const result = await (await homeworkRequest(req, parentId, sessionId)).json();
  expect(result.questions).toHaveLength(2);
  expect(result.requiresConfirmation).toBe(true);
  expect(result.questions[0]).not.toHaveProperty("answer");
  expect(result.questions[0].problem).toBe("3/4 of 20");
  vi.unstubAllEnvs();
});
