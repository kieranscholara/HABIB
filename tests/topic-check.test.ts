import { expect, it } from "vitest";
import { curriculum, topicById } from "../src/lib/curriculum";
import { isTopicCheck, checkTurn, checkSummary } from "../src/lib/topic-check";
import { homeworkTopic } from "../src/lib/homework";
it("provides at least nine preparation steps before three checks in every existing topic", () => {
  for (const topic of curriculum.filter((topic) =>
    topic.exercises.some((e) => e.stage === "check"),
  )) {
    const first = topic.exercises.findIndex((e) => e.stage === "check");
    expect(first).toBeGreaterThanOrEqual(9);
    expect(topic.exercises.slice(first).every((e) => e.stage === "check")).toBe(
      true,
    );
    expect(topic.exercises.length - first).toBe(3);
  }
});
it("checks a held-out fraction problem, keeps answers hidden until review and treats skipping as unsuccessful", () => {
  const topic = topicById("Y5-FRACTIONS")!;
  const first = checkTurn(topic, 10, "24", "en");
  expect(first.correct).toBe(true);
  expect(first.nextStep).toBe(11);
  expect(first.text).not.toContain("= 24");
  const second = checkTurn(topic, 11, "17", "en");
  expect(second.correct).toBe(false);
  expect(second.nextStep).toBe(12);
  const third = checkTurn(topic, 12, "I don't know", "en");
  expect(third.correct).toBe(false);
  expect(third.checkResult!.skipped).toBe(true);
  const summary = checkSummary(
    topic,
    [first.checkResult!, second.checkResult!, third.checkResult!],
    "en",
  );
  expect(summary.correct).toBe(1);
  expect(summary.total).toBe(3);
  expect(summary.review[0].working).toBe("32 ÷ 4 × 3 = 24.");
});
it("does not disclose hints on an ungraded question and never makes homework a topic check", () => {
  const topic = topicById("Y5-FRACTIONS")!;
  const reply = checkTurn(topic, 10, "explain", "en");
  expect(reply.checkResult).toBeNull();
  expect(reply.nextStep).toBe(10);
  expect(reply.text).not.toContain("24");
  expect(
    isTopicCheck(homeworkTopic(topic, { a: 10, b: 5, operator: "+" }), 0),
  ).toBe(false);
});
