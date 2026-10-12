import { it, expect } from "vitest";
import { VoiceActivity, ConversationActivity } from "../src/lib/voice-activity";
it("sends only after sustained speech followed by a pause", () => {
  const vad = new VoiceActivity();
  expect(vad.sample(0.04, 200)).toBe("speech");
  expect(vad.sample(0, 600)).toBe("speech");
  expect(vad.sample(0, 600)).toBe("end");
  expect(vad.sample(0.04, 200)).toBeNull();
});
it("interrupts sustained speech during playback and sends the same utterance after its pause", () => {
  const vad = new ConversationActivity();
  expect(vad.sample(0.06, 150, true)).toBeNull();
  expect(vad.sample(0.06, 150, true)).toBe("interrupt");
  expect(vad.sample(0.06, 150, false)).toBeNull();
  expect(vad.sample(0, 1200, false)).toBe("end");
});
it("ignores clicks and low residual echo during playback; natural playback completion resets silence", () => {
  const vad = new ConversationActivity();
  expect(vad.sample(0.06, 60, true)).toBeNull();
  expect(vad.sample(0.018, 10000, true)).toBeNull();
  expect(vad.sample(0, 7000, false)).toBeNull();
  expect(vad.sample(0, 1000, false)).toBe("quiet");
});
it("does not send silence or a short noise burst", () => {
  const vad = new VoiceActivity();
  expect(vad.sample(0.04, 50)).toBeNull();
  expect(vad.sample(0, 7950)).toBe("quiet");
});
it("resets the pause when the learner continues speaking", () => {
  const vad = new VoiceActivity();
  vad.sample(0.04, 200);
  vad.sample(0, 800);
  expect(vad.sample(0.04, 200)).toBe("speech");
  expect(vad.sample(0, 800)).toBe("speech");
  expect(vad.sample(0, 400)).toBe("end");
});
it("ignores separated brief noise bursts instead of accumulating false speech", () => {
  const vad = new VoiceActivity();
  for (let i = 0; i < 7; i++) {
    expect(vad.sample(0.04, 50)).toBeNull();
    expect(vad.sample(0, 950)).toBeNull();
  }
  vad.sample(0.04, 50);
  expect(vad.sample(0, 950)).toBe("quiet");
});
