import { z } from "zod";
import type { Topic, Exercise } from "./curriculum";
export const homeworkSchema = z
  .object({
    a: z.number().finite().min(0).max(10000),
    b: z.number().finite().min(0).max(10000),
    operator: z.enum(["+", "-", "*", "/"]),
  })
  .strict()
  .refine((v) => v.operator !== "/" || v.b !== 0, {
    message: "Division by zero is unsupported.",
  });
export function homeworkTopic(base: Topic, value: unknown): Topic {
  const { a, b, operator } = homeworkSchema.parse(value);
  const answer =
    operator === "+"
      ? a + b
      : operator === "-"
        ? a - b
        : operator === "*"
          ? a * b
          : a / b;
  const sign = operator === "*" ? "×" : operator === "/" ? "÷" : operator;
  const e: Exercise = {
    answer,
    prompt: {
      en: `What is ${a} ${sign} ${b}?`,
      mt: `Kemm hu ${a} ${sign} ${b}?`,
    },
    hint: {
      en:
        operator === "*"
          ? `Think of ${b} equal groups of ${a}.`
          : operator === "/"
            ? `Find a number that gives ${a} when multiplied by ${b}.`
            : "Work with the whole numbers first, then the smaller parts.",
      mt:
        operator === "*"
          ? `Aħseb f’${b} gruppi ta’ ${a}.`
          : operator === "/"
            ? `Sib numru li meta timmultiplikah b’${b} jagħti ${a}.`
            : "Aħdem pass żgħir kull darba.",
    },
    worked: {
      en: `${a} ${sign} ${b} = ${answer}. Check this calculation and try again.`,
      mt: `${a} ${sign} ${b} = ${answer}. Iċċekkja dan il-kalkolu u erġa’ pprova.`,
    },
  };
  return {
    ...base,
    title: { en: "Homework practice", mt: "Prattika tax-Xogħol tad-Dar" },
    exercises: [e],
  };
}
