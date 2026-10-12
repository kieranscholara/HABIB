import { it, expect, vi, afterEach } from "vitest";
import { calculate, verifiedClaims } from "../src/lib/verified-maths";
import { conversationalReply } from "../src/lib/tutor-provider";
import { topicById } from "../src/lib/curriculum";
const provider = vi.hoisted(() => vi.fn());
vi.mock("../src/lib/server", () => ({ providerFetch: provider }));
afterEach(() => {
  vi.unstubAllEnvs();
  provider.mockReset();
});
it("checks arithmetic without evaluating arbitrary code", () => {
  expect(calculate("(20 / 4) * 3")).toBe(15);
  expect(calculate("20/0")).toBeNull();
  expect(calculate("process.exit()")).toBeNull();
  expect(calculate("2+3*4")).toBe(14);
});
it("rejects false declared claims, visible equations and too many questions", () => {
  expect(verifiedClaims("20 ÷ 4 = 6. Why?", [])).toBe(false);
  expect(verifiedClaims("Try this.", [{ expression: "20/4", value: 6 }])).toBe(
    false,
  );
  expect(verifiedClaims("Why? How?", [])).toBe(false);
  expect(
    verifiedClaims("20 ÷ 4 = 5. What next?", [
      { expression: "20/4", value: 5 },
    ]),
  ).toBe(true);
});
it("passes bounded conversation history and verified homework context to the model", async () => {
  vi.stubEnv("HABIB_OPENAI_KEY", "fixture_not_a_credential");
  provider.mockResolvedValue(
    new Response(
      JSON.stringify({
        choices: [
          {
            message: {
              content: JSON.stringify({
                reply:
                  "We divide by 4 because a quarter is one of four equal parts. What is 20 ÷ 4?",
                mathClaims: [{ expression: "20/4", value: 5 }],
                safetyState: "normal",
              }),
            },
          },
        ],
      }),
    ),
  );
  const reply = await conversationalReply(
    "Why divide by four?",
    topicById("Y5-FRACTIONS")!,
    0,
    "en",
    [{ role: "user", text: "I am confused about quarters." }],
  );
  expect(reply?.reply).toContain("four equal parts");
  const payload = JSON.parse(provider.mock.calls[0][1].body);
  expect(
    payload.messages.some(
      (message: { content: string }) =>
        message.content === "I am confused about quarters.",
    ),
  ).toBe(true);
  expect(
    payload.messages
      .filter((message: { role: string }) => message.role === "system")
      .map((message: { content: string }) => message.content)
      .join(" "),
  ).toContain("Only the server grades");
});
it("rejects a repeated model reply and explicitly asks for a new representation when confused", async () => {
  vi.stubEnv("HABIB_OPENAI_KEY", "fixture_not_a_credential");
  const old =
    "Draw four circles. Share twenty counters between them, one at a time.";
  provider.mockResolvedValue(
    new Response(
      JSON.stringify({
        choices: [
          {
            message: {
              content: JSON.stringify({
                reply: old,
                mathClaims: [],
                safetyState: "normal",
              }),
            },
          },
        ],
      }),
    ),
  );
  expect(
    await conversationalReply(
      "I still don't understand",
      topicById("Y5-FRACTIONS")!,
      0,
      "en",
      [],
      false,
      [old],
    ),
  ).toBeNull();
  const payload = JSON.parse(provider.mock.calls[0][1].body);
  expect(payload.messages[0].content).toContain("one tiny action");
  expect(payload.messages[0].content).toContain("different one");
});
it("rejects parroting the original question on the first request for help", async () => {
  vi.stubEnv("HABIB_OPENAI_KEY", "fixture_not_a_credential");
  const topic = topicById("Y5-FRACTIONS")!;
  provider.mockResolvedValue(
    new Response(
      JSON.stringify({
        choices: [
          {
            message: {
              content: JSON.stringify({
                reply: topic.exercises[0].prompt.en,
                mathClaims: [],
                safetyState: "normal",
              }),
            },
          },
        ],
      }),
    ),
  );
  expect(
    await conversationalReply("I do not understand", topic, 0, "en", []),
  ).toBeNull();
});
it("falls back when model arithmetic is wrong or the provider fails", async () => {
  vi.stubEnv("HABIB_OPENAI_KEY", "fixture_not_a_credential");
  provider.mockResolvedValue(
    new Response(
      JSON.stringify({
        choices: [
          {
            message: {
              content: JSON.stringify({
                reply: "20 ÷ 4 = 6.",
                mathClaims: [],
                safetyState: "normal",
              }),
            },
          },
        ],
      }),
    ),
  );
  expect(
    await conversationalReply(
      "Explain",
      topicById("Y5-FRACTIONS")!,
      0,
      "en",
      [],
    ),
  ).toBeNull();
  provider.mockRejectedValue(new Error("Unavailable"));
  expect(
    await conversationalReply(
      "Explain",
      topicById("Y5-FRACTIONS")!,
      0,
      "en",
      [],
    ),
  ).toBeNull();
});
