import { test, expect } from "@playwright/test";
import { randomUUID } from "node:crypto";
const headers = { origin: "http://localhost:3000" };
async function lesson(
  page: import("@playwright/test").Page,
  topicId = "Y5-FRACTIONS",
) {
  expect(
    (
      await page.request.post("/api/v1/auth/signup", {
        headers,
        data: {
          email: `coach-${randomUUID()}@example.invalid`,
          password: "Strong test password 123",
          name: "Test Parent",
          adult: true,
        },
      })
    ).status(),
  ).toBe(201);
  const child = await (
    await page.request.post("/api/v1/children", {
      headers,
      data: { nickname: "Practice learner", schoolYear: 5, language: "en" },
    })
  ).json();
  await page.request.post(`/api/v1/children/${child.id}/consent`, {
    headers,
    data: { authorised: true, policyVersion: "1.1" },
  });
  return (
    await (
      await page.request.post("/api/v1/sessions", {
        headers,
        data: { childId: child.id, topicId },
      })
    ).json()
  ).id as string;
}
test("small-step coaching survives a reload, checks the small answer separately and makes retries idempotent", async ({
  page,
}) => {
  const id = await lesson(page);
  const turn = {
    clientTurnId: randomUUID(),
    text: "I don't know",
    conversation: true,
  };
  const url = `/api/v1/sessions/${id}/turns`;
  const first = await (
    await page.request.post(url, { headers, data: turn })
  ).json();
  expect(first.coaching.failures).toBe(1);
  expect(
    await (await page.request.post(url, { headers, data: turn })).json(),
  ).toEqual(first);
  await page.goto(`/tutor?session=${id}`);
  await page.reload();
  await expect(page.locator(".bubble.tutor").last()).toContainText(
    "How many equal parts",
  );
  const second = await (
    await page.request.post(url, {
      headers,
      data: { clientTurnId: randomUUID(), text: "4", conversation: true },
    })
  ).json();
  expect(second.correct).toBeNull();
  expect(second.step).toBe(0);
  expect(second.coaching.failures).toBe(0);
  expect(second.coaching.scaffoldStep).toBe(1);
  const final = await (
    await page.request.post(url, {
      headers,
      data: { clientTurnId: randomUUID(), text: "5", conversation: true },
    })
  ).json();
  expect(final.correct).toBe(true);
  expect(final.step).toBe(1);
  const data = await (await page.request.get("/api/v1/progress")).json();
  expect(data.progress[0].questions_attempted).toBe(1);
  expect(data.progress[0].correct_count).toBe(1);
});
test("sharing counters is interactive on mobile and an answer revealed after four failures is recorded as assisted", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 1000 });
  const id = await lesson(page);
  await page.goto(`/tutor?session=${id}`);
  const activity = page.getByRole("region", { name: "Explore the question" });
  await activity
    .getByRole("button", { name: "Share one to each group" })
    .click();
  await expect(
    activity.getByRole("button", { name: "Group 1: 1 counters", exact: true }),
  ).toBeVisible();
  await activity
    .getByRole("button", { name: "Group 1: 1 counters", exact: true })
    .click();
  await expect(
    activity.getByRole("button", { name: "Group 1: 0 counters", exact: true }),
  ).toBeVisible();
  await activity.getByRole("button", { name: "Sketch your idea" }).click();
  await expect(activity.getByLabel("Drawing space")).toBeVisible();
  const pad = await activity.getByLabel("Drawing space").boundingBox();
  await page.mouse.move(pad!.x + 20, pad!.y + 20);
  await page.mouse.down();
  await page.mouse.move(pad!.x + 90, pad!.y + 55, { steps: 5 });
  await page.mouse.up();
  await expect(
    activity.getByLabel("Drawing space").locator("polyline"),
  ).toHaveCount(1);
  await activity.getByRole("button", { name: "Clear drawing" }).click();
  await expect(
    activity.getByLabel("Drawing space").locator("polyline"),
  ).toHaveCount(0);
  for (let i = 0; i < 4; i++) {
    await page
      .getByRole("textbox", { name: "Your answer or question" })
      .fill("I don't know");
    await page.getByRole("button", { name: "Send answer" }).click();
    await expect(page.locator(".bubble.you")).toHaveCount(i + 1);
  }
  await expect(page.locator(".bubble.tutor").last()).toContainText(
    "20 ÷ 4 = 5",
  );
  await expect(page.locator(".bubble.tutor").last()).toContainText(
    "Let’s try the next question",
  );
  const data = await (await page.request.get("/api/v1/privacy/export")).json();
  expect(data.attempts).toHaveLength(1);
  expect(data.attempts[0].is_correct).toBe(0);
  expect(data.attempts[0].question_id).toContain(":assisted");
  expect(data.progress[0].correct_count).toBe(0);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
test("a topic has varied preparation then a check without hints, with a saved review score", async ({
  page,
}) => {
  const id = await lesson(page),
    url = `/api/v1/sessions/${id}/turns`;
  for (const answer of [
    "5",
    "15",
    "6",
    "12",
    "7",
    "21",
    "8",
    "16",
    "7",
    "28",
  ]) {
    const reply = await (
      await page.request.post(url, {
        headers,
        data: { clientTurnId: randomUUID(), text: answer, conversation: true },
      })
    ).json();
    expect(reply.correct).toBe(true);
  }
  await page.goto(`/tutor?session=${id}`);
  await expect(
    page.getByText("Topic check: try without hints.", { exact: false }),
  ).toBeVisible();
  await expect(
    page.getByRole("region", { name: "Explore the question" }),
  ).toHaveCount(0);
  await page
    .getByRole("textbox", { name: "Write your working (optional)" })
    .fill("32 divided by 4 is 8. Three groups of 8 make 24.");
  for (const answer of ["24", "17", "I don't know"]) {
    await page
      .getByRole("textbox", { name: "Your answer or question" })
      .fill(answer);
    await page.getByRole("button", { name: "Send answer" }).click();
  }
  await expect(
    page.getByRole("region", { name: "Topic check review" }),
  ).toContainText("1/3");
  const last = await (await page.request.get(`/api/v1/sessions/${id}`)).json();
  expect(last.turns.at(-1).checkSummary.correct).toBe(1);
  expect(last.turns.at(-1).checkSummary.total).toBe(3);
  await page.reload();
  await expect(
    page.getByRole("region", { name: "Topic check review" }),
  ).toContainText("1/3");
  await page
    .getByRole("region", { name: "Topic check review" })
    .locator("details summary")
    .first()
    .click();
  await page
    .getByRole("button", { name: "Explain this question" })
    .first()
    .click();
  await expect(page.locator(".bubble.tutor").last()).toContainText(
    "32 ÷ 4 × 3 = 24",
  );
  const reviewed = await (
    await page.request.get(`/api/v1/sessions/${id}`)
  ).json();
  expect(reviewed.turns.at(-1).reviewQuestion).toBe(10);
  expect(reviewed.session.step).toBe(13);
});
test("English drafts receive review without a correctness score, require a submission before continuing and retain the draft for revision", async ({
  page,
}) => {
  const id = await lesson(page, "Y5-ENGLISH-WRITING");
  const url = `/api/v1/sessions/${id}/turns`;
  const early = await (
    await page.request.post(url, {
      headers,
      data: {
        clientTurnId: randomUUID(),
        text: "Next activity",
        intent: "continue",
        conversation: true,
      },
    })
  ).json();
  expect(early.step).toBe(0);
  expect(early.correct).toBeNull();
  await page.goto(`/tutor?session=${id}`);
  await expect(
    page.getByRole("region", { name: "Review criteria" }),
  ).toBeVisible();
  const draft =
    "I will invite a classmate to the garden club. The reader needs the day, time, place and what to bring.";
  await page
    .getByRole("textbox", { name: "Your answer or question" })
    .fill(draft);
  await page.getByRole("button", { name: "Submit for feedback" }).click();
  await expect(page.locator(".bubble.tutor").last()).toContainText(
    "Draft received",
  );
  await expect(
    page.getByRole("textbox", { name: "Your answer or question" }),
  ).toHaveValue(draft);
  let data = await (await page.request.get(`/api/v1/sessions/${id}`)).json();
  expect(data.turns.at(-1).submissionReceived).toBe(true);
  expect(data.turns.at(-1).correct).toBeNull();
  expect(data.session.step).toBe(0);
  await page
    .getByRole("button", { name: "Next activity", exact: true })
    .click();
  await expect(page.locator(".bubble.tutor").last()).toContainText(
    "opening sentence",
  );
  const exported = await (
    await page.request.get("/api/v1/privacy/export")
  ).json();
  expect(exported.attempts).toHaveLength(0);
  expect(exported.progress).toHaveLength(0);
  for (let i = 1; i < 9; i++) {
    const draft = await (
      await page.request.post(url, {
        headers,
        data: {
          clientTurnId: randomUUID(),
          text: "My draft gives a useful detail and explains the idea.",
          intent: "feedback",
          conversation: true,
        },
      })
    ).json();
    expect(draft.correct).toBeNull();
    expect(draft.step).toBe(i);
    const next = await (
      await page.request.post(url, {
        headers,
        data: {
          clientTurnId: randomUUID(),
          text: "Next activity",
          intent: "continue",
          conversation: true,
        },
      })
    ).json();
    expect(next.correct).toBeNull();
    expect(next.step).toBe(i + 1);
  }
  const progress = await (await page.request.get("/api/v1/progress")).json();
  expect(progress.progress[0].completed_lessons).toBe(1);
  expect(progress.progress[0].questions_attempted).toBe(0);
  await page.goto("/dashboard");
  await expect(page.locator(".progress-row").first()).toContainText("Review");
  await expect(page.locator("body")).not.toContainText("NaN");
});
test("English listening has a recording control and practice transcript, with transcripts hidden during the independent check", async ({
  page,
}) => {
  const id = await lesson(page, "Y5-ENGLISH-LISTENING");
  await page.route("**/api/v1/status", (route) =>
    route.fulfill({
      json: {
        version: "0.6.0",
        speechConfigured: true,
        homeworkConfigured: false,
        conversationConfigured: false,
      },
    }),
  );
  const audio = Buffer.alloc(3244);
  audio.write("RIFF", 0);
  audio.writeUInt32LE(3236, 4);
  audio.write("WAVE", 8);
  audio.write("fmt ", 12);
  audio.writeUInt32LE(16, 16);
  audio.writeUInt16LE(1, 20);
  audio.writeUInt16LE(1, 22);
  audio.writeUInt32LE(16000, 24);
  audio.writeUInt32LE(32000, 28);
  audio.writeUInt16LE(2, 32);
  audio.writeUInt16LE(16, 34);
  audio.write("data", 36);
  audio.writeUInt32LE(3200, 40);
  const sources: string[] = [];
  await page.route(`**/api/v1/sessions/${id}/speech`, (route) => {
    sources.push(route.request().postDataJSON().source);
    return route.fulfill({
      contentType: "audio/wav",
      headers: { "X-Speech-Parts": "1" },
      body: audio,
    });
  });
  await page.goto(`/tutor?session=${id}`);
  await expect(
    page.getByRole("button", { name: "Play task recording" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Play task recording" }).click();
  await expect.poll(() => sources).toEqual(["stimulus"]);
  await expect(
    page.getByRole("button", { name: "Play task recording" }),
  ).toBeEnabled();
  await page.getByText("Practice transcript", { exact: true }).click();
  await expect(
    page.getByRole("region", { name: "Listening recording" }),
  ).toContainText("Welcome to the school garden club");
  for (const text of [
    "Tuesday",
    "library",
    "notebook",
    "teacher",
    "first",
    "bigger pot",
    "water",
    "notebook",
    "water",
  ]) {
    const result = await (
      await page.request.post(`/api/v1/sessions/${id}/turns`, {
        headers,
        data: { clientTurnId: randomUUID(), text, conversation: true },
      })
    ).json();
    expect(result.correct).toBe(true);
  }
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Play task recording" }),
  ).toBeVisible();
  await expect(
    page.getByText("Practice transcript", { exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("region", { name: "Explore the question" }),
  ).toHaveCount(0);
});
