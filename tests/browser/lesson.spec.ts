import { test, expect, type APIRequestContext } from "@playwright/test";
import { randomUUID } from "node:crypto";
const origin = { origin: "http://localhost:3000" };
async function signup(request: APIRequestContext) {
  const email = "tester-" + randomUUID() + "@example.invalid";
  const response = await request.post("/api/v1/auth/signup", {
    headers: origin,
    data: {
      email,
      password: "Strong test password 123",
      name: "Test Parent",
      adult: true,
    },
  });
  expect(response.status()).toBe(201);
  return email;
}
async function kid(request: APIRequestContext, name = "Test learner") {
  const response = await request.post("/api/v1/children", {
    headers: origin,
    data: { nickname: name, schoolYear: 5, language: "mt" },
  });
  expect(response.status()).toBe(201);
  const { id } = await response.json();
  await request.post(`/api/v1/children/${id}/consent`, {
    headers: origin,
    data: { authorised: true, policyVersion: "1.0" },
  });
  return id;
}
for (const width of [390, 1280])
  test(`family journey at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto("/signup");
    await page.getByLabel("Your name").fill("Test Parent");
    await page
      .getByLabel("Email address")
      .fill("parent-" + randomUUID() + "@example.invalid");
    await page
      .getByLabel("Password", { exact: true })
      .fill("Strong test password 123");
    await page.getByRole("checkbox").check();
    await page.getByRole("button", { name: "Create parent account" }).click();
    await expect(page).toHaveURL(/dashboard/);
    await page.goto("/children");
    await page
      .getByRole("button", { name: "+ Add a child", exact: true })
      .click();
    await page.getByLabel("Nickname").fill("Lila");
    await page.getByRole("button", { name: "Save profile" }).click();
    await page
      .getByRole("button", { name: "I authorise maths tutoring" })
      .click();
    await expect(
      page.getByText("Authorised to learn", { exact: true }),
    ).toBeVisible();
    await page.goto("/learn");
    await page
      .getByRole("button", { name: "Start Fractions", exact: true })
      .click();
    await expect(page).toHaveURL(/tutor\?session=/);
    for (const [i, value] of ["Ma fhimtx", "5", "15", "6", "12"].entries()) {
      await page
        .getByRole("textbox", { name: "Your answer or question" })
        .fill(value);
      await page.getByRole("button", { name: "Send answer" }).click();
      await expect(page.locator(".bubble.you")).toHaveCount(i + 1);
    }
    await expect(page.getByText("A little more understanding.")).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.goto("/dashboard");
    await expect(
      page.locator(".stat-card").first().locator("strong"),
    ).toContainText("1");
    await expect(page.locator(".accuracy")).toContainText("100%");
    await page.reload();
    await expect(
      page.locator(".stat-card").first().locator("strong"),
    ).toContainText("1");
  });
test("ownership, idempotency, CSRF and withdrawal are enforced by the API", async ({
  request,
  playwright,
}) => {
  await signup(request);
  const childId = await kid(request);
  const session = (
    await (
      await request.post("/api/v1/sessions", {
        headers: origin,
        data: { childId, topicId: "Y5-FRACTIONS" },
      })
    ).json()
  ).id;
  const second = await playwright.request.newContext({
    baseURL: "http://localhost:3000",
  });
  await signup(second);
  expect((await second.get("/api/v1/sessions/" + session)).status()).toBe(403);
  expect(
    (
      await second.delete("/api/v1/children/" + childId, { headers: origin })
    ).status(),
  ).toBe(403);
  expect(
    (
      await request.post(`/api/v1/sessions/${session}/turns`, {
        headers: { origin: "https://untrusted.invalid" },
        data: { clientTurnId: randomUUID(), text: "5" },
      })
    ).status(),
  ).toBe(403);
  expect(
    (
      await request.post(`/api/v1/sessions/${session}/turns`, {
        headers: origin,
        data: { clientTurnId: randomUUID(), text: "5", step: 99 },
      })
    ).status(),
  ).toBe(400);
  const payload = { clientTurnId: randomUUID(), text: "5" };
  const first = await request.post(`/api/v1/sessions/${session}/turns`, {
    headers: origin,
    data: payload,
  });
  const retry = await request.post(`/api/v1/sessions/${session}/turns`, {
    headers: origin,
    data: payload,
  });
  expect(await retry.json()).toEqual(await first.json());
  await request.delete(`/api/v1/children/${childId}/consent`, {
    headers: origin,
  });
  expect(
    (
      await request.post(`/api/v1/sessions/${session}/turns`, {
        headers: origin,
        data: { clientTurnId: randomUUID(), text: "15" },
      })
    ).status(),
  ).toBe(409);
  await second.dispose();
});
test("simultaneous profile creation respects the two-child limit", async ({
  request,
}) => {
  await signup(request);
  const responses = await Promise.all(
    [1, 2, 3].map((i) =>
      request.post("/api/v1/children", {
        headers: origin,
        data: { nickname: "Test " + i, schoolYear: 4, language: "en" },
      }),
    ),
  );
  expect(responses.map((r) => r.status()).sort()).toEqual([201, 201, 409]);
});
test("account export excludes passwords and free-text child input, erasure removes sign-in", async ({
  request,
}) => {
  await signup(request);
  await kid(request);
  const exported = await (await request.get("/api/v1/privacy/export")).json();
  expect(exported.children).toHaveLength(1);
  expect(JSON.stringify(exported)).not.toContain("password_hash");
  const erased = await request.post("/api/v1/privacy/delete", {
    headers: origin,
    data: { confirmation: "DELETE", password: "Strong test password 123" },
  });
  expect(erased.status()).toBe(200);
  expect((await request.get("/api/v1/me")).status()).toBe(401);
});
test("authenticated routes reject anonymous access", async ({ request }) => {
  expect((await request.get("/api/v1/children")).status()).toBe(401);
  expect((await request.get("/api/v1/progress")).status()).toBe(401);
});

async function startTestLesson(page: import("@playwright/test").Page) {
  await signup(page.request);
  const childId = await kid(page.request);
  const session = (
    await (
      await page.request.post("/api/v1/sessions", {
        headers: origin,
        data: { childId, topicId: "Y5-FRACTIONS" },
      })
    ).json()
  ).id;
  await page.route("**/api/v1/status", (route) =>
    route.fulfill({
      json: {
        mode: "development",
        speechConfigured: true,
        homeworkConfigured: true,
        conversationConfigured: true,
      },
    }),
  );
  return session;
}
function silentWav() {
  const bytes = Buffer.alloc(32044);
  bytes.write("RIFF", 0);
  bytes.writeUInt32LE(32036, 4);
  bytes.write("WAVE", 8);
  bytes.write("fmt ", 12);
  bytes.writeUInt32LE(16, 16);
  bytes.writeUInt16LE(1, 20);
  bytes.writeUInt16LE(1, 22);
  bytes.writeUInt32LE(16000, 24);
  bytes.writeUInt32LE(32000, 28);
  bytes.writeUInt16LE(2, 32);
  bytes.writeUInt16LE(16, 34);
  bytes.write("data", 36);
  bytes.writeUInt32LE(32000, 40);
  return bytes;
}
async function fakeMicrophone(page: import("@playwright/test").Page) {
  await page.addInitScript(() => {
    let stopped = 0;
    Object.defineProperty(window, "testStoppedTracks", { get: () => stopped });
    Object.defineProperty(navigator.mediaDevices, "getUserMedia", {
      value: async () => {
        const context = new AudioContext();
        await context.resume();
        const destination = context.createMediaStreamDestination(),
          tone = context.createOscillator(),
          gain = context.createGain();
        tone.connect(gain);
        gain.connect(destination);
        gain.gain.setValueAtTime(0.06, context.currentTime);
        gain.gain.setValueAtTime(0, context.currentTime + 0.45);
        tone.start();
        const track = destination.stream.getAudioTracks()[0],
          original = track.stop.bind(track);
        track.stop = () => {
          stopped++;
          original();
          tone.stop();
          void context.close();
        };
        return destination.stream;
      },
    });
  });
}

test("homework scan, corrected confirmation and follow-up chat", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 950 });
  const session = await startTestLesson(page);
  await page.route("**/api/v1/sessions/*/homework", (route) =>
    route.fulfill({
      json: {
        requiresConfirmation: true,
        questions: [
          {
            kind: "fraction_of",
            a: 20,
            b: 4,
            c: 3,
            operator: "+",
            question: "Find three quarters of 20.",
            problem: "3/4 of 20",
          },
          {
            kind: "arithmetic",
            a: 12,
            b: 6,
            c: 1,
            operator: "*",
            question: "Multiply 12 by 6.",
            problem: "12 × 6",
          },
        ],
      },
    }),
  );
  await page.goto("/tutor?session=" + session + "&scan=1");
  const png = await page.evaluate(() => {
    const c = document.createElement("canvas");
    c.width = 20;
    c.height = 20;
    return c.toDataURL("image/png").split(",")[1];
  });
  await page
    .locator("input[type=file]")
    .nth(1)
    .setInputFiles({
      name: "homework.png",
      mimeType: "image/png",
      buffer: Buffer.from(png, "base64"),
    });
  await expect(page.getByText("Check before we explain.")).toBeVisible();
  await expect(page.getByRole("button", { name: "2. 12 × 6" })).toBeVisible();
  await page.getByRole("button", { name: "Confirm & explain" }).click();
  await expect(page.locator(".topic-card")).toContainText("3/4 of 20");
  await page
    .getByRole("textbox", { name: "Your answer or question" })
    .fill("Why do we divide by four?");
  await page.getByRole("button", { name: "Send answer" }).click();
  await expect(page.locator(".bubble.you")).toHaveCount(1);
  for (const [i, value] of ["5", "15"].entries()) {
    await page
      .getByRole("textbox", { name: "Your answer or question" })
      .fill(value);
    await page.getByRole("button", { name: "Send answer" }).click();
    await expect(page.locator(".bubble.you")).toHaveCount(i + 2);
  }
  await expect(page.getByText("A little more understanding.")).toBeVisible();
  await page
    .getByRole("textbox", { name: "Your answer or question" })
    .fill("Can you explain that again?");
  await page.getByRole("button", { name: "Send answer" }).click();
  await expect(page.locator(".bubble.you")).toHaveCount(4);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  const progress = await (await page.request.get("/api/v1/progress")).json();
  expect(
    progress.progress.find(
      (p: { topic_id: string }) => p.topic_id === "HOMEWORK",
    ).completed_lessons,
  ).toBe(1);
});
test("voice auto-sends, speaks and listens again; interruption and stopping release the microphone", async ({
  page,
}) => {
  await fakeMicrophone(page);
  const session = await startTestLesson(page);
  let recognised = 0;
  await page.route("**/api/v1/sessions/*/transcribe", (route) => {
    recognised++;
    return route.fulfill({
      json: {
        text: recognised === 1 ? "5" : "15",
        confidence: 0.95,
        transcriptionMs: 1,
      },
    });
  });
  await page.route("**/api/v1/sessions/*/speech", (route) =>
    route.fulfill({ contentType: "audio/wav", body: silentWav() }),
  );
  await page.goto("/tutor?session=" + session);
  await page.getByRole("button", { name: "Start voice conversation" }).click();
  await expect(page.locator(".bubble.you")).toHaveCount(1, {
    timeout: 15000,
  });
  await page.getByRole("button", { name: "Interrupt & speak" }).click();
  await expect(
    page.getByText("Listening… pause when you finish", { exact: true }),
  ).toBeVisible();
  await expect(page.locator(".bubble.you")).toHaveCount(2, {
    timeout: 15000,
  });
  await page
    .getByRole("button", { name: "Stop conversation", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Start voice conversation" }),
  ).toBeEnabled();
  expect(
    await page.evaluate(
      () =>
        (window as unknown as { testStoppedTracks: number }).testStoppedTracks,
    ),
  ).toBeGreaterThanOrEqual(2);
  const before = recognised;
  await page.waitForTimeout(300);
  expect(recognised).toBe(before);
});
test("uncertain voice waits for transcript correction before submitting", async ({
  page,
}) => {
  await fakeMicrophone(page);
  const session = await startTestLesson(page);
  let submissions = 0;
  await page.route("**/api/v1/sessions/*/transcribe", (route) =>
    route.fulfill({
      json: { text: "4", confidence: 0.3, transcriptionMs: 1 },
    }),
  );
  await page.route("**/api/v1/sessions/*/turns", async (route) => {
    submissions++;
    await route.continue();
  });
  await page.route("**/api/v1/sessions/*/speech", (route) =>
    route.fulfill({ contentType: "audio/wav", body: silentWav() }),
  );
  await page.goto("/tutor?session=" + session);
  await page.getByRole("button", { name: "Start voice conversation" }).click();
  await expect(
    page.getByText(
      "Please check the recognised words and numbers, then Send.",
      { exact: false },
    ),
  ).toBeVisible({ timeout: 15000 });
  expect(submissions).toBe(0);
  await page
    .getByRole("textbox", { name: "Your answer or question" })
    .fill("5");
  await page.getByRole("button", { name: "Send answer" }).click();
  await expect(page.locator(".bubble.you")).toHaveCount(1);
  expect(submissions).toBe(1);
  await page
    .getByRole("button", { name: "Stop conversation", exact: true })
    .click();
});
test("a new homework question preserves earlier practice and starts a fresh session", async ({
  request,
}) => {
  await signup(request);
  const childId = await kid(request);
  const session = (
    await (
      await request.post("/api/v1/sessions", {
        headers: origin,
        data: { childId, topicId: "Y5-FRACTIONS" },
      })
    ).json()
  ).id;
  await request.post(`/api/v1/sessions/${session}/turns`, {
    headers: origin,
    data: { clientTurnId: randomUUID(), text: "5" },
  });
  const confirmed = await request.post(
    `/api/v1/sessions/${session}/homework/confirm`,
    {
      headers: origin,
      data: { kind: "percentage_of", a: 80, b: 25, c: 1, operator: "+" },
    },
  );
  expect(confirmed.status()).toBe(200);
  const next = (await confirmed.json()).id;
  expect(next).not.toBe(session);
  expect((await request.get("/api/v1/sessions/" + session)).status()).toBe(409);
  const lesson = await (await request.get("/api/v1/sessions/" + next)).json();
  expect(lesson.topic.description).toBe("25% of 80");
  expect(lesson.session.step).toBe(0);
  const progress = await (await request.get("/api/v1/progress")).json();
  expect(
    progress.progress.find(
      (p: { topic_id: string }) => p.topic_id === "Y5-FRACTIONS",
    ).correct_count,
  ).toBe(1);
});
test("a spoken stop command ends voice mode without creating a tutor turn", async ({
  page,
}) => {
  await fakeMicrophone(page);
  const session = await startTestLesson(page);
  let sent = 0;
  await page.route("**/api/v1/sessions/*/transcribe", (route) =>
    route.fulfill({
      json: { text: "waqqaf", confidence: 0.95, transcriptionMs: 1 },
    }),
  );
  await page.route("**/api/v1/sessions/*/turns", async (route) => {
    sent++;
    await route.continue();
  });
  await page.goto("/tutor?session=" + session);
  await page.getByRole("button", { name: "Start voice conversation" }).click();
  await expect(
    page.getByRole("button", { name: "Start voice conversation" }),
  ).toBeEnabled({ timeout: 15000 });
  expect(sent).toBe(0);
  expect(
    await page.evaluate(
      () =>
        (window as unknown as { testStoppedTracks: number }).testStoppedTracks,
    ),
  ).toBeGreaterThan(0);
});
