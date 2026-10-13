import { expect, it } from "vitest";
import { curriculum, topicById } from "../src/lib/curriculum";
import {
  coachPractice,
  coachingState,
  learningPlan,
} from "../src/lib/learning-coach";
import { verifiedClaims } from "../src/lib/verified-maths";

it("gives three distinct small hints, then reveals the worked answer and moves on without marking it correct", () => {
  const topic = topicById("Y5-FRACTIONS")!;
  const turns: ReturnType<typeof coachPractice>[] = [];
  for (let i = 0; i < 4; i++) {
    const reply = coachPractice(
      topic,
      0,
      0,
      "I don't know",
      "en",
      coachingState(turns, 0),
    );
    expect(reply.coaching!.failures).toBe(i + 1);
    expect(reply.correct).toBeNull();
    expect(reply.nextStep).toBe(i < 3 ? 0 : 1);
    expect(reply.revealed).toBe(i === 3);
    if (i < 3) {
      expect(reply.text).not.toContain("20 ÷ 4 = 5");
      expect(reply.guide!.question).toContain("equal parts");
    }
    turns.push(reply);
  }
  expect(new Set(turns.map((turn) => turn.text)).size).toBe(4);
  expect(turns[3].text).toContain("20 ÷ 4 = 5");
  expect(turns[3].text).toContain(topic.exercises[1].prompt.en);
});
it("checks the small answer separately, resets unsuccessful attempts and resumes the original calculation", () => {
  const topic = topicById("Y5-FRACTIONS")!;
  const first = coachPractice(
    topic,
    0,
    0,
    "ma nafx",
    "mt",
    coachingState([], 0),
  );
  const second = coachPractice(topic, 0, 0, "4", "mt", first.coaching!);
  expect(second.correct).toBeNull();
  expect(second.nextStep).toBe(0);
  expect(second.coaching!.scaffoldStep).toBe(1);
  expect(second.coaching!.failures).toBe(0);
  expect(second.text).toContain("20 ÷ 4");
  expect(
    coachPractice(topic, 0, 0, "ħamsa", "mt", second.coaching!).correct,
  ).toBe(true);
});
it("does not mistake a small-step answer for completing the whole exercise when both answers coincide", () => {
  const topic = {
    ...topicById("Y5-FRACTIONS")!,
    exercises: [
      {
        ...topicById("Y5-FRACTIONS")!.exercises[0],
        answer: 4,
        prompt: { en: "What is 16 ÷ 4?", mt: "Kemm hu 16 ÷ 4?" },
        worked: { en: "16 ÷ 4 = 4.", mt: "16 ÷ 4 = 4." },
      },
    ],
  };
  const help = coachPractice(
    topic,
    0,
    0,
    "I don't know",
    "en",
    coachingState([], 0),
  );
  const small = coachPractice(topic, 0, 0, "4", "en", help.coaching!);
  expect(small.correct).toBeNull();
  expect(small.nextStep).toBe(0);
  expect(coachPractice(topic, 0, 0, "4", "en", small.coaching!).correct).toBe(
    true,
  );
});
it("keeps equations correct and stays on the same exercise across every subject and supported year", () => {
  for (const topic of curriculum)
    for (let step = 0; step < topic.exercises.length; step++)
      for (const language of ["en", "mt"] as const) {
        const turns: ReturnType<typeof coachPractice>[] = [];
        for (let i = 0; i < 4; i++) {
          const turn = coachPractice(
            topic,
            step,
            0,
            "I don't know",
            language,
            coachingState(turns, step),
          );
          expect(
            verifiedClaims(turn.text, []),
            `${topic.id}:${step}:${language}:${i}`,
          ).toBe(true);
          if (i < 3) expect(turn.nextStep).toBe(step);
          turns.push(turn);
        }
        expect(
          learningPlan(topic, step, language).steps.at(-1)!.answers,
        ).toContain(topic.exercises[step].answer);
      }
});
it("ignores stale or malformed coaching state and redirects concerning disclosures without skipping", () => {
  expect(
    coachingState(
      [
        {
          coaching: {
            questionStep: 1,
            failures: 3,
            scaffoldStep: 0,
            strategy: 2,
            active: true,
          },
        },
      ],
      0,
    ).failures,
  ).toBe(0);
  const state = coachingState([], 0);
  state.failures = 3;
  const reply = coachPractice(
    topicById("Y5-FRACTIONS")!,
    0,
    0,
    "I am in danger",
    "en",
    state,
  );
  expect(reply.safetyState).toBe("escalate");
  expect(reply.revealed).toBe(false);
  expect(reply.nextStep).toBe(0);
});
it("models fractional division with split wholes instead of indivisible counters", () => {
  const topic = topicById("Y5-DECIMALS")!;
  expect(learningPlan(topic, 2, "en").activity).toEqual({
    kind: "fraction-bar",
    numerator: 1,
    denominator: 4,
  });
});
it("breaks a language question into a checked word-category step and never confuses adverb with verb", () => {
  const topic = topicById("Y5-ENGLISH-GRAMMAR")!;
  const help = coachPractice(
    topic,
    1,
    0,
    "I don't know",
    "en",
    coachingState([], 1),
  );
  expect(help.guide!.question).toContain("how an action");
  const small = coachPractice(topic, 1, 0, "adverb", "en", help.coaching!);
  expect(small.correct).toBeNull();
  expect(small.nextStep).toBe(1);
  expect(
    coachPractice(topic, 1, 0, "softly", "en", small.coaching!).correct,
  ).toBe(true);
});
