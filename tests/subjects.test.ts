import { expect, it } from "vitest";
import { curriculum, teaching, topicById } from "../src/lib/curriculum";
import { subjects, nationalCurriculum } from "../src/lib/subjects";
import { homeworkTopic } from "../src/lib/homework";
import { workedExplanation } from "../src/lib/worked-explanation";
import { verifiedClaims } from "../src/lib/verified-maths";
it("grades checked words and Maltese aliases but never treats help or arbitrary prose as a wrong numeric answer", () => {
  const plants = topicById("Y4-SCIENCE-PLANTS")!;
  expect(teaching(plants, 0, 0, "roots", "en").correct).toBe(true);
  expect(teaching(plants, 0, 0, "għeruq", "mt").correct).toBe(true);
  expect(teaching(plants, 0, 0, "petals", "en").correct).toBe(false);
  expect(
    teaching(plants, 0, 0, "I think roots absorb the water", "en").correct,
  ).toBeNull();
  expect(teaching(plants, 0, 0, "ma nafx", "mt").correct).toBeNull();
});
it("provides uniquely identified, answerable courses for every subject and supported year", () => {
  expect(new Set(curriculum.map((topic) => topic.id)).size).toBe(
    curriculum.length,
  );
  for (const subject of subjects)
    for (const year of [4, 5, 6]) {
      const topics = curriculum.filter(
        (topic) => topic.year === year && topic.subject === subject.id,
      );
      expect(topics.length).toBeGreaterThan(0);
      for (const topic of topics)
        for (let step = 0; step < topic.exercises.length; step++)
          expect(
            teaching(topic, step, 0, String(topic.exercises[step].answer), "en")
              .correct,
          ).toBe(true);
    }
});
it("shows all the worked steps and final answer for confirmed homework without advancing the lesson", () => {
  const topic = homeworkTopic(topicById("Y5-FRACTIONS")!, {
    kind: "fraction_of",
    a: 20,
    b: 4,
    c: 3,
  });
  const text = workedExplanation(topic, 1, "en");
  expect(text.length).toBeGreaterThan(420);
  expect(text).toContain("20 ÷ 4 = 5");
  expect(text).toContain("5 × 3 = 15");
  expect(verifiedClaims(text, [])).toBe(true);
});
it("does not falsely mark inaccessible official outcome mappings as verified", () => {
  expect(nationalCurriculum.name).toBe("Malta national curriculum");
  expect(nationalCurriculum.verification).toBe("pending");
});
it("does not repeat the curated subject explanation twice within one reply", () => {
  const topic = topicById("Y4-SCIENCE-PLANTS")!;
  const explanation = topic.exercises[0].worked.en;
  const text = workedExplanation(topic, 0, "en");
  expect(text.split(explanation).length).toBe(2);
  expect(text).toContain("Compare the choices");
});
