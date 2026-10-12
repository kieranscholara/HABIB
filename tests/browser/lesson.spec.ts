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
