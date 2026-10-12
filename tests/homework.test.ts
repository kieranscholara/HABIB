import { describe, it, expect } from "vitest";
import { homeworkSchema, homeworkTopic } from "../src/lib/homework";
import { topicById } from "../src/lib/curriculum";
const base = topicById("Y5-FRACTIONS")!;
describe("confirmed homework tutoring", () => {
  it("builds independently checked unit-fraction steps", () => {
    const t = homeworkTopic(base, { kind: "fraction_of", a: 20, b: 4, c: 3 });
    expect(t.exercises.map((e) => e.answer)).toEqual([5, 15]);
    expect(t.description).toBe("3/4 of 20");
  });
  it("explains percentages and rectangle perimeter in small steps", () => {
    expect(
      homeworkTopic(base, {
        kind: "percentage_of",
        a: 80,
        b: 25,
      }).exercises.map((e) => e.answer),
    ).toEqual([0.8, 20]);
    expect(
      homeworkTopic(base, {
        kind: "rectangle_perimeter",
        a: 6,
        b: 4,
      }).exercises.map((e) => e.answer),
    ).toEqual([10, 20]);
  });
  it("splits multiplication into checked parts", () => {
    expect(
      homeworkTopic(base, { a: 24, b: 6, operator: "*" }).exercises.map(
        (e) => e.answer,
      ),
    ).toEqual([120, 24, 144]);
  });
  it("supports existing saved arithmetic homework", () => {
    expect(
      homeworkTopic(base, { a: 24, b: 6, operator: "/" }).exercises[0].answer,
    ).toBe(4);
  });
  it("rejects invalid denominator, percentages and injected operations", () => {
    expect(
      homeworkSchema.safeParse({ kind: "fraction_of", a: 20, b: 0, c: 3 })
        .success,
    ).toBe(false);
    expect(
      homeworkSchema.safeParse({ kind: "percentage_of", a: 80, b: 120 })
        .success,
    ).toBe(false);
    expect(
      homeworkSchema.safeParse({ a: 4, b: 2, operator: "eval" }).success,
    ).toBe(false);
  });
});
