type Language = "mt" | "en";

const units = [
  "żero",
  "wieħed",
  "tnejn",
  "tlieta",
  "erbgħa",
  "ħamsa",
  "sitta",
  "sebgħa",
  "tmienja",
  "disgħa",
  "għaxra",
  "ħdax",
  "tnax",
  "tlettax",
  "erbatax",
  "ħmistax",
  "sittax",
  "sbatax",
  "tmintax",
  "dsatax",
];
const tens = [
  "",
  "",
  "għoxrin",
  "tletin",
  "erbgħin",
  "ħamsin",
  "sittin",
  "sebgħin",
  "tmenin",
  "disgħin",
];

function spokenNumber(value: string): string {
  const [whole, fraction] = value.split(".");
  const n = Number(whole);
  // Larger values remain numeric: let Azure pronounce them rather than guess inflections.
  const integer =
    n < 20
      ? units[n]
      : n < 100
        ? n % 10
          ? `${units[n % 10]} u ${tens[Math.floor(n / 10)]}`
          : tens[n / 10]
        : whole;
  return fraction
    ? `${integer} punt ${[...fraction].map((d) => units[Number(d)]).join(" ")}`
    : integer;
}

export function spokenMath(text: string, language: Language): string {
  const operations: Record<string, string> =
    language === "mt"
      ? {
          "+": "miżjud ma’",
          "-": "nieqes",
          "−": "nieqes",
          "×": "immultiplikat bi",
          "÷": "maqsum bi",
          "=": "huwa",
          "/": "fuq",
          ":": "għal",
        }
      : {
          "+": "plus",
          "-": "minus",
          "−": "minus",
          "×": "times",
          "÷": "divided by",
          "=": "equals",
          "/": "over",
          ":": "to",
        };
  let result = text.replace(
    /(?<=\d)\s*([+−×÷=/:\-])\s*(?=[\d?])/g,
    (_, operation: string) => ` ${operations[operation]} `,
  );
  result = result.replace(
    /(\d)%/g,
    language === "mt" ? "$1 fil-mija" : "$1 percent",
  );
  result = result.replace(
    /cm²|ċm²/g,
    language === "mt" ? "ċentimetri kwadri" : "square centimetres",
  );
  result = result.replace(
    /(?<![\p{L}])(?:cm|ċm)(?![\p{L}])/gu,
    language === "mt" ? "ċentimetri" : "centimetres",
  );
  if (language === "mt") {
    result = result.replace(/\d+(?:\.\d+)?/g, spokenNumber);
    result = result.replace(
      /\bbi (?=(?:erbgħa|ħamsa|għaxra|ħdax|erbatax|ħmistax|għoxrin|erbgħin|ħamsin)\b)/g,
      "b’",
    );
  }
  return result;
}

function escapeXml(text: string): string {
  return text.replace(
    /[<>&"']/g,
    (c) =>
      ({
        "<": "&lt;",
        ">": "&gt;",
        "&": "&amp;",
        '"': "&quot;",
        "'": "&apos;",
      })[c]!,
  );
}

export function speechMarkup(text: string, language: Language): string {
  const voices = ["mt-MT-GraceNeural", "mt-MT-JosephNeural"];
  const requestedVoice = process.env.HABIB_MALTESE_VOICE;
  const voice =
    language === "mt"
      ? requestedVoice && voices.includes(requestedVoice)
        ? requestedVoice
        : voices[0]
      : "en-GB-SoniaNeural";
  const configuredRate = process.env.HABIB_SPEECH_RATE_PERCENT;
  const parsedRate = configuredRate?.trim() ? Number(configuredRate) : NaN;
  const rate = Number.isFinite(parsedRate)
    ? Math.max(-15, Math.min(5, Math.round(parsedRate)))
    : language === "mt"
      ? -5
      : 0;
  // Split only after punctuation followed by whitespace: decimal points stay intact.
  const sentences = spokenMath(text, language)
    .trim()
    .split(/(?<=[.!?])\s+/);
  const speech = sentences.map(escapeXml).join('<break time="180ms"/>');
  return `<speak version="1.0" xml:lang="${language === "mt" ? "mt-MT" : "en-GB"}"><voice name="${voice}"><prosody rate="${rate}%">${speech}</prosody></voice></speak>`;
}
