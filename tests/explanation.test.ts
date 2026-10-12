import { expect, it } from "vitest";
import { curriculum, topicById, teaching } from "../src/lib/curriculum";
import {
  needsSimplerExplanation,
  repeatedExplanation,
  simplerExplanation,
} from "../src/lib/explanation";
import { verifiedClaims } from "../src/lib/verified-maths";

it("recognises confusion in English and Maltese", () => {
  for (const text of [
    "I don't understand",
    "break it down",
    "still confused",
    "ma fhimtx",
    "aktar sempliċi",
  ])
    expect(needsSimplerExplanation(text)).toBe(true);
  expect(needsSimplerExplanation("5")).toBe(false);
});
it("changes representation across repeated requests while keeping the same verified step", () => {
  const topic = topicById("Y5-FRACTIONS")!;
  for (const language of ["en", "mt"] as const) {
    const previous = [teaching(topic, 0, 0, "Explain", language).text];
    for (let turn = 0; turn < 8; turn++) {
      const reply = simplerExplanation(topic, 0, language, previous);
      expect(repeatedExplanation(reply, previous)).toBe(false);
      expect(reply.length).toBeLessThanOrEqual(420);
      expect(verifiedClaims(reply, [])).toBe(true);
      previous.push(reply);
    }
    expect(previous[1]).not.toBe(previous[2]);
    expect(previous[3]).not.toBe(previous[2]);
  }
});
it("detects repetition despite punctuation and case, and preserves distinct representations", () => {
  expect(
    repeatedExplanation("SHARE 20 into four equal groups!", [
      "Share 20 into four equal groups.",
    ]),
  ).toBe(true);
  expect(
    repeatedExplanation("Draw four circles and spread the dots between them.", [
      "Think of sharing counters fairly between four boxes.",
    ]),
  ).toBe(false);
});
it("keeps fallback equations correct across the curriculum without repeating the original question", () => {
  for (const topic of curriculum)
    for (let step = 0; step < topic.exercises.length; step++)
      for (const language of ["en", "mt"] as const) {
        const previous: string[] = [];
        for (let attempt = 0; attempt < 4; attempt++) {
          const reply = simplerExplanation(topic, step, language, previous);
          expect(reply).not.toContain(topic.exercises[step].prompt[language]);
          expect(
            verifiedClaims(reply, []),
            `${topic.id} / step ${step} / ${language}: ${reply}`,
          ).toBe(true);
          previous.push(reply);
        }
      }
});
