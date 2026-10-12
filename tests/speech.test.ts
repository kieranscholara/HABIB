import { describe, it, expect, afterEach, vi } from "vitest";
import { spokenMath, speechMarkup } from "../src/lib/speech";
afterEach(() => vi.unstubAllEnvs());
describe("spoken maths and safe delivery", () => {
  it("verbalises the fraction lesson in Maltese", () => {
    expect(spokenMath("Kemm hu 20 ÷ 4?", "mt")).toBe(
      "Kemm hu għoxrin maqsum b’erbgħa?",
    );
    expect(spokenMath("5 × 3 = 15.", "mt")).toBe(
      "ħamsa immultiplikat bi tlieta huwa ħmistax.",
    );
  });
  it("preserves decimal meaning and places pauses only between sentences", () => {
    const xml = speechMarkup("1 ÷ 4 = 0.25. Erġa’ pprova.", "mt");
    expect(xml).toContain("żero punt tnejn ħamsa");
    expect(xml.match(/<break /g)).toHaveLength(1);
    expect(xml).toContain('rate="-5%"');
  });
  it("handles chained operations, units and percentages", () => {
    expect(spokenMath("6 + 4 + 6 + 4 = 20 cm.", "en")).toBe(
      "6 plus 4 plus 6 plus 4 equals 20 centimetres.",
    );
    expect(spokenMath("10% ta’ 80. 24 ċm².", "mt")).toBe(
      "għaxra fil-mija ta’ tmenin. erbgħa u għoxrin ċentimetri kwadri.",
    );
  });
  it("escapes captions rather than interpreting them as SSML", () => {
    const xml = speechMarkup('Read <voice> & "hello".', "en");
    expect(xml).toContain("&lt;voice&gt; &amp; &quot;hello&quot;");
    expect(xml.match(/<voice name=/g)).toHaveLength(1);
  });
  it("allows Joseph and caps unsafe or excessive pace settings", () => {
    vi.stubEnv("HABIB_MALTESE_VOICE", "mt-MT-JosephNeural");
    vi.stubEnv("HABIB_SPEECH_RATE_PERCENT", "-100");
    expect(speechMarkup("Bongu.", "mt")).toContain("mt-MT-JosephNeural");
    expect(speechMarkup("Bongu.", "mt")).toContain('rate="-15%"');
  });
  it("falls back safely for invalid configuration and retains the English voice", () => {
    vi.stubEnv("HABIB_MALTESE_VOICE", '"><break time="10s"/>');
    vi.stubEnv("HABIB_SPEECH_RATE_PERCENT", "invalid");
    expect(speechMarkup("Bongu.", "mt")).toContain("mt-MT-GraceNeural");
    expect(speechMarkup("Hello.", "en")).toContain("en-GB-SoniaNeural");
    expect(speechMarkup("Hello.", "en")).toContain('rate="0%"');
  });
});
