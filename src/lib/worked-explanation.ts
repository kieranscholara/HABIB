import type { Language, Topic } from "./curriculum";
import { simplerExplanation } from "./explanation";

export function workedExplanation(
  topic: Topic,
  step: number,
  language: Language,
  previous: string[] = [],
) {
  const index = Math.min(step, topic.exercises.length - 1),
    current = topic.exercises[index];
  const exercises = topic.homework ? topic.exercises : [current];
  const mt = language === "mt";
  const question = topic.homework
    ? topic.description
    : current.prompt[language].replace(/\?/g, ".");
  const representation = simplerExplanation(topic, index, language, [
    ...previous,
    ...exercises.map((exercise) => exercise.worked[language]),
  ]).replace(/\?/g, ".");
  const steps = exercises
    .map((exercise, i) => {
      const method = topic.homework
        ? exercise.prompt[language]
            .replace(/(?:What is|Kemm hu) .*/, "")
            .trim() + " "
        : "";
      return `${i + 1}. ${method}${exercise.worked[language]}`;
    })
    .join("\n\n");
  return mt
    ? `Ejja naħdmuha mill-bidu sat-tmiem.\n\nIl-mistoqsija: ${question}\n\nMod kif nifhmuha: ${representation}\n\nIl-passi maħduma:\n${steps}\n\nIssa qabbel dawn il-passi mal-mistoqsija. ${topic.homework ? "Kull pass juża r-riżultat tal-pass ta’ qablu." : "It-tweġiba taqbel mat-tagħrif u mal-metodu fil-passi."}\n\nLiema pass tixtieq li nuru b’eżempju ieħor?`
    : `Let’s work through this from the question to the result.\n\nThe question: ${question}\n\nA way to understand it: ${representation}\n\nThe worked steps:\n${steps}\n\nNow check those steps against the question. ${topic.homework ? "Each step uses the result of the previous one; the final step gives the answer to the whole question." : "The result follows from the given information and the method above."}\n\nWhich step would you like to see with another example?`;
}
