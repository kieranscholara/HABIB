import type { Topic, Language } from "./curriculum";
import { teaching } from "./curriculum";
export interface CheckResult {
  questionStep: number;
  correct: boolean;
  skipped: boolean;
}
export interface CheckSummary {
  correct: number;
  total: number;
  review: {
    question: string;
    questionStep: number;
    working: string;
    correct: boolean;
    skipped: boolean;
  }[];
}
export function isTopicCheck(topic: Topic, step: number) {
  return !topic.homework && topic.exercises[step]?.stage === "check";
}
export function checkTurn(
  topic: Topic,
  step: number,
  text: string,
  language: Language,
) {
  const result = teaching(topic, step, 0, text, language);
  if (result.safetyState !== "normal") return { ...result, checkResult: null };
  const skip =
    /^(?:(?:i\s+)?(?:still\s+)?(?:don.?t|do not)\s+(?:know|understand)|ma\s+(?:nafx|nifhimx|fhimtx)|skip|pass|aqbeż|idk|dunno)(?:\b|[.!?]|$)/i.test(
      text.trim(),
    );
  if (result.correct === null && !skip)
    return {
      ...result,
      text:
        language === "mt"
          ? "Din hija prova mingħajr ħjiel. Agħti t-tweġiba tiegħek, jew għid ‘ma nafx’ biex taqbeż din il-mistoqsija."
          : "This is a check without hints. Give your answer, or say ‘I don’t know’ to skip this question.",
      checkResult: null,
    };
  const next = topic.exercises[step + 1];
  return {
    ...result,
    correct: skip ? false : result.correct,
    nextStep: step + 1,
    nextMistakes: 0,
    type: next ? "check_question" : "check_complete",
    text:
      (language === "mt"
        ? "It-tweġiba ġiet irreġistrata. "
        : "Your answer is saved. ") +
      (next
        ? next.prompt[language]
        : language === "mt"
          ? "Lestejt il-prova tas-suġġett. Issa tista’ tara l-passi u t-tweġibiet."
          : "You finished the topic check. Now review the answers and working."),
    checkResult: {
      questionStep: step,
      correct: !skip && result.correct === true,
      skipped: skip,
    },
  };
}
export function checkSummary(
  topic: Topic,
  results: CheckResult[],
  language: Language,
): CheckSummary {
  const checks = topic.exercises
    .map((exercise, index) => ({ exercise, index }))
    .filter(({ exercise }) => exercise.stage === "check");
  const review = checks.map(({ exercise, index }) => {
    const result = results.find((r) => r.questionStep === index);
    return {
      questionStep: index,
      question: exercise.prompt[language],
      working: exercise.worked[language],
      correct: result?.correct || false,
      skipped: result?.skipped || false,
    };
  });
  return {
    correct: review.filter((r) => r.correct).length,
    total: review.length,
    review,
  };
}
