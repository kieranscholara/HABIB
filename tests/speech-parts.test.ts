import { expect, it } from "vitest";
import { playSpeechQueue, speechParts } from "../src/lib/speech-parts";
it("keeps every word, decimal and numbered step of a long explanation", () => {
  const text = Array.from(
    { length: 15 },
    (_, i) =>
      `${i + 1}. Divide 20 by 4 to get 5. Then 5 × 3 = 15. One quarter is 0.25.`,
  ).join("\n\n");
  const parts = speechParts(text);
  expect(parts.length).toBeGreaterThan(3);
  expect(parts.every((part) => part.length <= 200)).toBe(true);
  expect(parts.join(" ")).toBe(text.replace(/\s+/g, " "));
  expect(parts.join(" ")).toContain("0.25");
});
it("prefetches each following part before playback ends and plays the whole reply in order", async () => {
  const events: string[] = [];
  await playSpeechQueue(
    3,
    new Blob(["0"]),
    async (i) => {
      events.push(`load${i}`);
      return new Blob([String(i)]);
    },
    async (blob) => {
      events.push(`play${await blob.text()}`);
    },
    () => true,
  );
  expect(events).toEqual(["load1", "play0", "load2", "play1", "play2"]);
});
it("an interruption prevents queued audio from resuming, including a failed prefetch", async () => {
  let active = true,
    played = 0;
  await playSpeechQueue(
    4,
    new Blob(["first"]),
    async () => {
      throw new Error("request cancelled");
    },
    async () => {
      played++;
      active = false;
    },
    () => active,
  );
  expect(played).toBe(1);
});
it("reports a failed next part rather than silently presenting a partial reply as complete", async () => {
  await expect(
    playSpeechQueue(
      2,
      new Blob(["first"]),
      async () => {
        throw new Error("provider offline");
      },
      async () => {},
      () => true,
    ),
  ).rejects.toThrow("provider offline");
});
