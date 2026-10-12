export class VoiceActivity {
  private spokenMs = 0;
  private quietMs = 0;
  private elapsedMs = 0;
  private hasSpeech = false;
  private finished = false;
  constructor(
    private silenceMs = 1200,
    private quietLimitMs = 8000,
    private threshold = 0.015,
    private speechStartMs = 180,
  ) {}
  sample(level: number, durationMs: number): "speech" | "end" | "quiet" | null {
    if (this.finished) return null;
    this.elapsedMs += durationMs;
    if (level >= this.threshold) {
      this.spokenMs += durationMs;
      this.quietMs = 0;
      if (this.spokenMs >= this.speechStartMs) this.hasSpeech = true;
    } else {
      this.quietMs += durationMs;
      if (!this.hasSpeech) this.spokenMs = 0;
    }
    if (this.hasSpeech && this.quietMs >= this.silenceMs) {
      this.finished = true;
      return "end";
    }
    if (!this.hasSpeech && this.elapsedMs >= this.quietLimitMs) {
      this.finished = true;
      return "quiet";
    }
    return this.hasSpeech ? "speech" : null;
  }
}

export class ConversationActivity {
  private vad = new VoiceActivity();
  private playing = false;
  private interrupted = false;
  sample(
    level: number,
    durationMs: number,
    playing: boolean,
  ): "interrupt" | "end" | "quiet" | null {
    if (playing && !this.playing) {
      // Sustained near-end speech, rather than a click or a breath, interrupts.
      this.vad = new VoiceActivity(1200, Infinity, 0.03, 280);
      this.interrupted = false;
    } else if (!playing && this.playing && !this.interrupted) {
      // Do not count the tutor's playback as a child turn when it ends.
      this.vad = new VoiceActivity();
    }
    this.playing = playing;
    const result = this.vad.sample(level, durationMs);
    if (playing) {
      if (result === "speech" && !this.interrupted) {
        this.interrupted = true;
        return "interrupt";
      }
      return null;
    }
    return result === "end" || result === "quiet" ? result : null;
  }
}
