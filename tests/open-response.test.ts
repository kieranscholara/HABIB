import { expect, it } from "vitest";
import { topicById, teaching } from "../src/lib/curriculum";
import { openPractice, taskDetails } from "../src/lib/open-response";
it("never automatically grades open drafts and requires a trusted current-task submission before advancing", () => {
  const topic = topicById("Y5-ENGLISH-WRITING")!;
  expect(teaching(topic, 0, 0, "anything", "en").correct).toBeNull();
  expect(
    openPractice(
      topic,
      0,
      0,
      "next",
      "en",
      [{ questionStep: 1, submissionReceived: true }],
      "continue",
    ).nextStep,
  ).toBe(0);
  const draft = openPractice(
    topic,
    0,
    0,
    "I will invite a classmate and explain where to meet.",
    "en",
    [],
    "feedback",
  );
  expect(draft.correct).toBeNull();
  expect(draft.nextStep).toBe(0);
  expect(draft.submissionReceived).toBe(true);
  expect(
    openPractice(
      topic,
      0,
      0,
      "The simple message invited the classmate to come again next week.",
      "en",
      [],
      "feedback",
    ).submissionReceived,
  ).toBe(true);
  const next = openPractice(
    topic,
    0,
    0,
    "next",
    "en",
    [{ ...draft, questionStep: 0 }],
    "continue",
  );
  expect(next.nextStep).toBe(1);
  expect(next.correct).toBeNull();
  expect(next.needsReview).toBe(true);
});
it("treats confusion as help even when the client requests feedback and changes approaches before a worked example", () => {
  const topic = topicById("Y4-ENGLISH-SPEAKING")!;
  const turns: ReturnType<typeof openPractice>[] = [];
  for (let i = 0; i < 4; i++)
    turns.push(
      openPractice(topic, 0, 0, "I don't know", "en", turns, "feedback"),
    );
  expect(new Set(turns.map((t) => t.text)).size).toBe(4);
  expect(turns.every((t) => !t.submissionReceived && t.correct === null)).toBe(
    true,
  );
  expect(turns.at(-1)!.nextStep).toBe(1);
});
it("keeps listening transcripts out of independent checks and makes all English tasks explicitly English", () => {
  const topic = topicById("Y6-ENGLISH-LISTENING")!;
  expect(taskDetails(topic, 0, "mt")!.stimulusText).toContain(
    "school garden club",
  );
  expect(taskDetails(topic, 9, "mt")!.stimulusText).toBeNull();
  expect(taskDetails(topic, 9, "mt")!.language).toBe("en");
  expect(taskDetails(topic, 9, "mt")!.stimulusAvailable).toBe(true);
});
