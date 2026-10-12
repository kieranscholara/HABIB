import { z } from "zod";
import type { Topic, Exercise } from "./curriculum";
export const homeworkKinds = [
  "arithmetic",
  "fraction_of",
  "percentage_of",
  "rectangle_area",
  "rectangle_perimeter",
] as const;
export const homeworkSchema = z
  .object({
    kind: z.enum(homeworkKinds).default("arithmetic"),
    a: z.number().finite().min(0).max(10000),
    b: z.number().finite().min(0).max(10000),
    c: z.number().finite().min(0).max(100).default(1),
    operator: z.enum(["+", "-", "*", "/"]).default("+"),
  })
  .strict()
  .superRefine((v, ctx) => {
    if (v.kind === "arithmetic" && v.operator === "/" && v.b === 0)
      ctx.addIssue({
        code: "custom",
        message: "Division by zero is unsupported.",
      });
    if (
      v.kind === "fraction_of" &&
      (!Number.isInteger(v.b) ||
        v.b < 1 ||
        v.b > 100 ||
        !Number.isInteger(v.c) ||
        v.c < 1 ||
        v.c > v.b)
    )
      ctx.addIssue({
        code: "custom",
        message: "Use a proper fraction with a denominator from 1 to 100.",
      });
    if (v.kind === "percentage_of" && v.b > 100)
      ctx.addIssue({
        code: "custom",
        message: "Use a percentage from 0 to 100.",
      });
  });
export type Homework = z.infer<typeof homeworkSchema>;
const symbol = (op: string) => (op === "*" ? "×" : op === "/" ? "÷" : op);
export function homeworkLabel(input: Homework): string {
  if (input.kind === "fraction_of")
    return `${input.c}/${input.b} of ${input.a}`;
  if (input.kind === "percentage_of") return `${input.b}% of ${input.a}`;
  if (input.kind === "rectangle_area")
    return `Rectangle area: ${input.a} × ${input.b}`;
  if (input.kind === "rectangle_perimeter")
    return `Rectangle perimeter: ${input.a} by ${input.b}`;
  return `${input.a} ${symbol(input.operator)} ${input.b}`;
}
function exercise(
  a: number,
  b: number,
  op: "+" | "-" | "*" | "/",
  introEn: string,
  introMt: string,
): Exercise {
  const answer =
      op === "+" ? a + b : op === "-" ? a - b : op === "*" ? a * b : a / b,
    sign = symbol(op);
  return {
    answer,
    prompt: {
      en: `${introEn} What is ${a} ${sign} ${b}?`,
      mt: `${introMt} Kemm hu ${a} ${sign} ${b}?`,
    },
    hint: {
      en:
        op === "*"
          ? `Think of ${b} equal groups of ${a}.`
          : op === "/"
            ? `Share ${a} into ${b} equal groups.`
            : op === "+"
              ? `Start at ${a} and add ${b}.`
              : `Start at ${a} and take away ${b}.`,
      mt:
        op === "*"
          ? `Aħseb f’${b} gruppi ta’ ${a}.`
          : op === "/"
            ? `Aqsam ${a} f’${b} gruppi ndaqs.`
            : op === "+"
              ? `Ibda minn ${a} u żid ${b}.`
              : `Ibda minn ${a} u naqqas ${b}.`,
    },
    worked: {
      en: `${a} ${sign} ${b} = ${answer}. Check the step and try again.`,
      mt: `${a} ${sign} ${b} = ${answer}. Iċċekkja dan il-pass u erġa’ pprova.`,
    },
  };
}
export function homeworkTopic(base: Topic, value: unknown): Topic {
  const input = homeworkSchema.parse(value),
    { a, b, c, operator, kind } = input;
  let exercises: Exercise[];
  if (kind === "fraction_of") {
    exercises = [
      exercise(
        a,
        b,
        "/",
        `First find one of ${b} equal parts.`,
        `L-ewwel sib parti waħda minn ${b} partijiet indaqs.`,
      ),
    ];
    if (c > 1)
      exercises.push(
        exercise(
          a / b,
          c,
          "*",
          `Now combine ${c} of those parts.`,
          `Issa għaqqad ${c} minn dawk il-partijiet.`,
        ),
      );
  } else if (kind === "percentage_of") {
    exercises = [
      exercise(
        a,
        100,
        "/",
        "First find one percent of the whole.",
        "L-ewwel sib wieħed fil-mija mit-total.",
      ),
      exercise(
        a / 100,
        b,
        "*",
        `Now find ${b} percent.`,
        `Issa sib ${b} fil-mija.`,
      ),
    ];
  } else if (kind === "rectangle_area")
    exercises = [
      exercise(
        a,
        b,
        "*",
        "Area is length multiplied by width.",
        "L-erja hija t-tul immultiplikat bil-wisa’.",
      ),
    ];
  else if (kind === "rectangle_perimeter")
    exercises = [
      exercise(
        a,
        b,
        "+",
        "First add the length and width.",
        "L-ewwel żid it-tul u l-wisa’.",
      ),
      exercise(
        a + b,
        2,
        "*",
        "A rectangle has two pairs of equal sides. Double this sum.",
        "Rettangolu għandu żewġ pari ta’ naħat indaqs. Irduppja din is-somma.",
      ),
    ];
  else if (
    operator === "*" &&
    Number.isInteger(a) &&
    Number.isInteger(b) &&
    a >= 10 &&
    a % 10 !== 0
  ) {
    const tens = Math.floor(a / 10) * 10,
      ones = a % 10;
    exercises = [
      exercise(
        tens,
        b,
        "*",
        `Split ${a} into ${tens} and ${ones}. Start with the tens.`,
        `Aqsam ${a} f’${tens} u ${ones}. Ibda bl-għexieren.`,
      ),
      exercise(
        ones,
        b,
        "*",
        "Now multiply the remaining part.",
        "Issa immoltiplika l-parti li fadal.",
      ),
      exercise(
        tens * b,
        ones * b,
        "+",
        "Combine the two results.",
        "Għaqqad iż-żewġ riżultati.",
      ),
    ];
  } else
    exercises = [
      exercise(
        a,
        b,
        operator,
        "Let’s work through your question together.",
        "Ejja naħdmu l-mistoqsija tiegħek flimkien.",
      ),
    ];
  return {
    ...base,
    title: { en: "Homework helper", mt: "Għajnuna fix-Xogħol tad-Dar" },
    description: homeworkLabel(input),
    exercises,
  };
}
