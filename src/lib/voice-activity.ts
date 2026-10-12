export class VoiceActivity {
  private spokenMs = 0;
  private quietMs = 0;
  private elapsedMs = 0;
  private hasSpeech = false;
  private finished = false;
  constructor(
    private silenceMs = 1200,
    private quietLimitMs = 8000,
  ) {}
  sample(level: number, durationMs: number): "speech" | "end" | "quiet" | null {
    if (this.finished) return null;
    this.elapsedMs += durationMs;
    if (level >= 0.015) {
      this.spokenMs += durationMs;
      this.quietMs = 0;
      if (this.spokenMs >= 180) this.hasSpeech = true;
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
