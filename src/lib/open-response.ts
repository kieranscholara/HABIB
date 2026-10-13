import type { Topic, Language } from "./curriculum";
import { teaching } from "./curriculum";
import { coachPractice, coachingState, learningPlan } from "./learning-coach";
import { isTopicCheck } from "./topic-check";

export type ResponseIntent = "answer" | "feedback" | "continue";
export interface ReviewTurn {
  questionStep?: number;
  submissionReceived?: boolean;
  coaching?: unknown;
}
export function taskDetails(topic: Topic, step: number, language: Language) {
  const e = topic.exercises[step];
  if (!e) return null;
  const activity = learningPlan(topic, step, language).activity;
  return {
    material:
      activity?.kind === "reading" || activity?.kind === "scene"
        ? activity
        : null,
    mode: e.responseMode || "closed",
    kind: e.responseKind || null,
    language: e.taskLanguage || language,
    rubric: e.rubric?.[language] || [],
    stimulusAvailable: !!e.stimulus,
    stimulusText: isTopicCheck(topic, step) ? null : e.stimulus || null,
    stimulusId: e.stimulus ? `${topic.id}:${step}` : null,
  };
}
export function openPractice(
  topic: Topic,
  step: number,
  mistakes: number,
  text: string,
  language: Language,
  turns: ReviewTurn[],
  intent: ResponseIntent,
) {
  const e = topic.exercises[step];
  const baseline = teaching(topic, step, mistakes, text, language);
  const empty = {
    ...baseline,
    coaching: null,
    guide: null,
    revealed: false,
    activity: null,
    choices: [],
    submissionReceived: false,
    needsReview: true,
  };
  if (baseline.safetyState !== "normal") return empty;
  const submitted = turns.some(
    (turn) => turn.questionStep === step && turn.submissionReceived,
  );
  const nextRequested =
    intent === "continue" ||
    /^(?:next(?: activity)?|continue|kompli|li jmiss)[.!]?$/i.test(text.trim());
  if (nextRequested) {
    if (!submitted)
      return {
        ...empty,
        text:
          language === "mt"
            ? "L-ewwel ipprova l-attività. Tista’ titlob għajnuna biex tibda."
            : "Try this activity before moving on. You can ask for help getting started.",
      };
    const next = topic.exercises[step + 1];
    return {
      ...empty,
      nextStep: step + 1,
      nextMistakes: 0,
      type: next ? "ask_question" : "conclude",
      text:
        (language === "mt"
          ? "Din l-attività għandha bżonn reviżjoni, mhux marka awtomatika. "
          : "This activity needs review, rather than an automatic mark. ") +
        (next?.prompt[language] ||
          (language === "mt"
            ? "Lestejna l-prattika. Agħżel lezzjoni oħra."
            : "Practice complete. Choose another lesson.")),
    };
  }
  const help =
    /^(?:(?:i\s+)?(?:still\s+)?(?:don.?t|do not)\s+(?:know|understand)|i am (?:stuck|confused)|ma\s+(?:nafx|nifhimx|fhimtx)|help|explain|how do I|għinni|spjega|kif|again|simpler)(?:\b|[\s.!?]|$)/i.test(
      text.trim(),
    ) && text.trim().split(/\s+/).length <= 15;
  if (help || text.trim().split(/\s+/).length < 3)
    return {
      ...coachPractice(
        topic,
        step,
        mistakes,
        text,
        language,
        coachingState(turns, step),
      ),
      needsReview: true,
      submissionReceived: false,
    };
  return {
    ...empty,
    type: "response_review",
    coaching: {
      questionStep: step,
      scaffoldStep: 0,
      failures: 0,
      strategy: 0,
      active: false,
    },
    submissionReceived: true,
    nextMistakes: 0,
    text:
      (language === "mt"
        ? "Id-draft wasal. Qabblu ma’ dawn il-kriterji:\n"
        : "Draft received. Review it against these criteria:\n") +
      (e.rubric?.[language] || []).map((r) => "• " + r).join("\n") +
      "\n\n" +
      (language === "mt"
        ? "Eżempju biex tqabbel:\n"
        : "An example to compare:\n") +
      e.worked[language] +
      "\n\n" +
      (language === "mt"
        ? "Irranġa d-draft tiegħek u erġa’ ibagħtu, jew agħżel l-attività li jmiss wara r-reviżjoni. Din mhijiex marka tal-eżami."
        : "Revise your draft and send it again, or choose Next activity after reviewing it. This is not an exam mark."),
  };
}
export function practiceTurn(
  topic: Topic,
  step: number,
  mistakes: number,
  text: string,
  language: Language,
  turns: ReviewTurn[],
  intent: ResponseIntent,
) {
  return topic.exercises[step].responseMode === "open"
    ? openPractice(topic, step, mistakes, text, language, turns, intent)
    : {
        ...coachPractice(
          topic,
          step,
          mistakes,
          text,
          language,
          coachingState(turns, step),
        ),
        needsReview: false,
        submissionReceived: false,
      };
}
