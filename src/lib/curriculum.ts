export type Language = "mt" | "en";
export interface Exercise {
  prompt: Record<Language, string>;
  hint: Record<Language, string>;
  worked: Record<Language, string>;
  answer: number;
}
export interface Topic {
  id: string;
  year: number;
  title: Record<Language, string>;
  icon: string;
  description: string;
  exercises: Exercise[];
}
const exercise = (
  en: string,
  mt: string,
  answer: number,
  hintEn: string,
  hintMt: string,
  workedEn: string,
  workedMt: string,
): Exercise => ({
  prompt: { en, mt },
  answer,
  hint: { en: hintEn, mt: hintMt },
  worked: { en: workedEn, mt: workedMt },
});
const arithmetic = (a: number, b: number, op: "+" | "-" | "×" | "÷") => {
  const answer =
    op === "+" ? a + b : op === "-" ? a - b : op === "×" ? a * b : a / b;
  return exercise(
    `What is ${a} ${op} ${b}?`,
    `Kemm hu ${a} ${op} ${b}?`,
    answer,
    op === "÷"
      ? `Find a number that gives ${a} when multiplied by ${b}.`
      : "Work one small step at a time.",
    op === "÷"
      ? `Sib numru li meta timmultiplikah b’${b} jagħti ${a}.`
      : "Aħdem pass żgħir kull darba.",
    `${a} ${op} ${b} = ${answer}. Try the step again.`,
    `${a} ${op} ${b} = ${answer}. Erġa’ pprova dan il-pass.`,
  );
};
const fraction = (whole: number, den: number, num = 1) => [
  exercise(
    `First find one part: what is ${whole} ÷ ${den}?`,
    `L-ewwel sib parti waħda: kemm hu ${whole} ÷ ${den}?`,
    whole / den,
    `Share ${whole} into ${den} equal groups.`,
    `Aqsam ${whole} f’${den} gruppi ndaqs.`,
    `${whole} ÷ ${den} = ${whole / den}.`,
    `${whole} ÷ ${den} = ${whole / den}.`,
  ),
  ...(num === 1
    ? []
    : [
        exercise(
          `One part is ${whole / den}. What is ${whole / den} × ${num}?`,
          `Parti waħda hija ${whole / den}. Kemm hu ${whole / den} × ${num}?`,
          (whole / den) * num,
          `Combine ${num} groups of ${whole / den}.`,
          `Għaqqad ${num} gruppi ta’ ${whole / den}.`,
          `${whole / den} × ${num} = ${(whole / den) * num}.`,
          `${whole / den} × ${num} = ${(whole / den) * num}.`,
        ),
      ]),
];
const shape = (sides: number, nameEn: string, nameMt: string) =>
  exercise(
    `How many sides does a ${nameEn} have?`,
    `Kemm-il naħa għandu ${nameMt}?`,
    sides,
    "Imagine the shape and count its edges.",
    "Immaġina l-forma u għodd in-naħat tagħha.",
    `A ${nameEn} has ${sides} sides.`,
    `Il-forma għandha ${sides} naħat.`,
  );
const topics: Topic[] = [];
function add(
  year: number,
  id: string,
  en: string,
  mt: string,
  icon: string,
  description: string,
  exercises: Exercise[],
) {
  topics.push({
    year,
    id: `Y${year}-${id}`,
    title: { en, mt },
    icon,
    description,
    exercises,
  });
}
add(
  4,
  "PLACE",
  "Place value",
  "Il-Valur tal-Pożizzjoni",
  "123",
  "Discover what each digit means.",
  [
    exercise(
      "What is the value of 3 in 345?",
      "X’inhu l-valur ta’ 3 fin-numru 345?",
      300,
      "The 3 is in the hundreds column.",
      "It-3 qiegħed fil-kolonna tal-mijiet.",
      "3 hundreds = 300.",
      "3 mijiet = 300.",
    ),
    arithmetic(300, 40, "+"),
    arithmetic(340, 5, "+"),
  ],
);
add(
  4,
  "ADD",
  "Addition & subtraction",
  "Żieda u Tnaqqis",
  "+",
  "Build confidence with everyday numbers.",
  [arithmetic(24, 13, "+"), arithmetic(48, 16, "-"), arithmetic(37, 25, "+")],
);
add(
  4,
  "TABLES",
  "Times tables",
  "It-Tabelli",
  "×",
  "Find patterns in equal groups.",
  [arithmetic(4, 6, "×"), arithmetic(7, 3, "×"), arithmetic(8, 5, "×")],
);
add(
  4,
  "DIVISION",
  "Division",
  "Il-Qsim",
  "÷",
  "Share things into equal groups.",
  [arithmetic(24, 4, "÷"), arithmetic(35, 5, "÷"), arithmetic(48, 6, "÷")],
);
add(
  4,
  "TIME",
  "Time & money",
  "Il-Ħin u l-Flus",
  "€",
  "Make sense of minutes and euros.",
  [
    exercise(
      "How many minutes are in 2 hours?",
      "Kemm-il minuta hemm f’sagħtejn?",
      120,
      "One hour has 60 minutes.",
      "Siegħa għandha 60 minuta.",
      "2 × 60 = 120 minutes.",
      "2 × 60 = 120 minuta.",
    ),
    arithmetic(5, 3, "+"),
    arithmetic(10, 4, "-"),
  ],
);
add(4, "SHAPES", "Shapes", "Il-Forom", "△", "Get to know familiar shapes.", [
  shape(3, "triangle", "trijanglu"),
  shape(4, "square", "kwadru"),
  shape(6, "hexagon", "eżagonu"),
]);
add(
  5,
  "NUMBERS",
  "Larger numbers",
  "Numri Kbar",
  "123",
  "Explore thousands, hundreds and tens.",
  [
    arithmetic(2400, 1300, "+"),
    arithmetic(5000, 1750, "-"),
    arithmetic(3200, 8, "÷"),
  ],
);
add(
  5,
  "MULTIPLY",
  "Multiply & divide",
  "Multiplikazzjoni u Qsim",
  "×",
  "Take bigger calculations one step at a time.",
  [arithmetic(12, 6, "×"), arithmetic(84, 7, "÷"), arithmetic(15, 8, "×")],
);
add(
  5,
  "FRACTIONS",
  "Fractions",
  "Il-Frazzjonijiet",
  "¾",
  "Discover how small parts make a whole.",
  [...fraction(20, 4, 3), ...fraction(18, 3, 2)],
);
add(
  5,
  "DECIMALS",
  "Decimals",
  "Id-Deċimali",
  "0.5",
  "Explore numbers between whole numbers.",
  [
    arithmetic(0.5, 0.25, "+"),
    arithmetic(1, 0.4, "-"),
    exercise(
      "Write one quarter as a decimal.",
      "Ikteb kwart wieħed bħala deċimali.",
      0.25,
      "Divide 1 by 4.",
      "Aqsam 1 b’4.",
      "1 ÷ 4 = 0.25.",
      "1 ÷ 4 = 0.25.",
    ),
  ],
);
add(
  5,
  "MEASURES",
  "Measurement",
  "Il-Kejl",
  "↔",
  "Compare lengths and amounts.",
  [
    exercise(
      "How many centimetres are in 2 metres?",
      "Kemm-il ċentimetru hemm f’2 metri?",
      200,
      "1 metre = 100 centimetres.",
      "Metru = 100 ċentimetru.",
      "2 × 100 = 200.",
      "2 × 100 = 200.",
    ),
    exercise(
      "How many grams are in half a kilogram?",
      "Kemm-il gramma hemm f’nofs kilogramma?",
      500,
      "1 kilogram = 1000 grams.",
      "Kilogramma = 1000 gramma.",
      "1000 ÷ 2 = 500.",
      "1000 ÷ 2 = 500.",
    ),
    arithmetic(150, 75, "+"),
  ],
);
add(
  5,
  "AREA",
  "Perimeter & area",
  "Perimetru u Erja",
  "□",
  "Measure around and inside a shape.",
  [
    exercise(
      "A rectangle is 6 cm long and 4 cm wide. What is its area in cm²?",
      "Rettangolu għandu tul 6 ċm u wisa’ 4 ċm. Kemm hi l-erja f’ċm²?",
      24,
      "Area = length × width.",
      "Erja = tul × wisa’.",
      "6 × 4 = 24 cm².",
      "6 × 4 = 24 ċm².",
    ),
    exercise(
      "What is its perimeter in cm?",
      "Kemm hu l-perimetru tiegħu f’ċm?",
      20,
      "Add all four sides.",
      "Żid l-erba’ naħat kollha.",
      "6 + 4 + 6 + 4 = 20 cm.",
      "6 + 4 + 6 + 4 = 20 ċm.",
    ),
    arithmetic(8, 8, "×"),
  ],
);
add(
  6,
  "FRACTIONS",
  "Fractions & decimals",
  "Frazzjonijiet u Deċimali",
  "¾",
  "Connect parts of a whole to decimal numbers.",
  [
    ...fraction(30, 5, 3),
    exercise(
      "Write three quarters as a decimal.",
      "Ikteb tliet kwarti bħala deċimali.",
      0.75,
      "Divide 3 by 4.",
      "Aqsam 3 b’4.",
      "3 ÷ 4 = 0.75.",
      "3 ÷ 4 = 0.75.",
    ),
  ],
);
add(
  6,
  "PERCENT",
  "Percentages",
  "Il-Perċentwali",
  "%",
  "Think in parts out of one hundred.",
  [
    exercise(
      "What is 10% of 80?",
      "Kemm hu 10% ta’ 80?",
      8,
      "10% is one tenth.",
      "10% huwa wieħed minn għaxra.",
      "80 ÷ 10 = 8.",
      "80 ÷ 10 = 8.",
    ),
    exercise(
      "What is 25% of 60?",
      "Kemm hu 25% ta’ 60?",
      15,
      "25% is one quarter.",
      "25% huwa kwart.",
      "60 ÷ 4 = 15.",
      "60 ÷ 4 = 15.",
    ),
    exercise(
      "What is 50% of 90?",
      "Kemm hu 50% ta’ 90?",
      45,
      "50% is one half.",
      "50% huwa nofs.",
      "90 ÷ 2 = 45.",
      "90 ÷ 2 = 45.",
    ),
  ],
);
add(
  6,
  "RATIO",
  "Ratio basics",
  "Il-Proporzjon",
  "2:3",
  "Compare groups and their sizes.",
  [
    exercise(
      "There are 2 red beads for every 3 blue beads. How many blue beads go with 4 red beads?",
      "Hemm 2 żibeġ ħomor għal kull 3 blu. Kemm-il żibġa blu tmur ma’ 4 ħomor?",
      6,
      "The number of red beads doubled.",
      "In-numru tal-ħomor rdoppja.",
      "3 × 2 = 6 blue beads.",
      "3 × 2 = 6 żibeġ blu.",
    ),
    arithmetic(3, 3, "×"),
    arithmetic(20, 5, "÷"),
  ],
);
add(
  6,
  "PROBLEMS",
  "Word problems",
  "Problemi bil-Kliem",
  "?",
  "Break a story into manageable steps.",
  [
    exercise(
      "Four boxes each hold 6 pencils. How many pencils are there?",
      "Erba’ kaxxi għandhom 6 lapsijiet kull waħda. Kemm hemm lapsijiet?",
      24,
      "Multiply the number of boxes by pencils per box.",
      "Immoltiplika l-kaxxi bil-lapsijiet f’kull kaxxa.",
      "4 × 6 = 24.",
      "4 × 6 = 24.",
    ),
    exercise(
      "8 pencils are given away. How many remain?",
      "Jingħataw 8 lapsijiet. Kemm jibqa’?",
      16,
      "Subtract 8 from 24.",
      "Naqqas 8 minn 24.",
      "24 − 8 = 16.",
      "24 − 8 = 16.",
    ),
    exercise(
      "Share the remaining pencils between 4 children. How many does each get?",
      "Aqsam il-lapsijiet li fadal bejn 4 itfal. Kemm jieħu kull wieħed?",
      4,
      "Divide 16 by 4.",
      "Aqsam 16 b’4.",
      "16 ÷ 4 = 4.",
      "16 ÷ 4 = 4.",
    ),
  ],
);
add(
  6,
  "AREA",
  "Area & perimeter",
  "Erja u Perimetru",
  "□",
  "Use dimensions to solve shape problems.",
  [
    exercise(
      "A square has side length 7 cm. What is its area in cm²?",
      "Kwadru għandu naħa ta’ 7 ċm. Kemm hi l-erja f’ċm²?",
      49,
      "Multiply the side length by itself.",
      "Immoltiplika t-tul tan-naħa bih innifsu.",
      "7 × 7 = 49.",
      "7 × 7 = 49.",
    ),
    exercise(
      "What is its perimeter in cm?",
      "Kemm hu l-perimetru tiegħu f’ċm?",
      28,
      "A square has four equal sides.",
      "Kwadru għandu erba’ naħat indaqs.",
      "4 × 7 = 28.",
      "4 × 7 = 28.",
    ),
    arithmetic(12, 5, "×"),
  ],
);
add(
  6,
  "DATA",
  "Data interpretation",
  "Interpretazzjoni tad-Data",
  "▥",
  "Read numbers and find useful patterns.",
  [
    exercise(
      "The values are 2, 4 and 6. What is their total?",
      "Il-valuri huma 2, 4 u 6. Kemm hu t-total?",
      12,
      "Add the three values.",
      "Żid it-tliet valuri.",
      "2 + 4 + 6 = 12.",
      "2 + 4 + 6 = 12.",
    ),
    exercise(
      "What is the mean of 2, 4 and 6?",
      "Kemm hi l-medja ta’ 2, 4 u 6?",
      4,
      "Divide the total by the number of values.",
      "Aqsam it-total bin-numru ta’ valuri.",
      "12 ÷ 3 = 4.",
      "12 ÷ 3 = 4.",
    ),
    exercise(
      "What is the range of 2, 4 and 6?",
      "Kemm hi l-firxa ta’ 2, 4 u 6?",
      4,
      "Subtract the smallest value from the largest.",
      "Naqqas l-iżgħar valur mill-akbar.",
      "6 − 2 = 4.",
      "6 − 2 = 4.",
    ),
  ],
);
export const curriculum = topics;
export function topicById(id: string) {
  return curriculum.find((t) => t.id === id);
}
export function publicTopic(topic: Topic, approved: boolean) {
  return {
    id: topic.id,
    year: topic.year,
    title: topic.title,
    icon: topic.icon,
    description: topic.description,
    steps: topic.exercises.length,
    approved,
  };
}
const words: Record<string, number> = {
  zero: 0,
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  fifteen: 15,
  twenty: 20,
  żero: 0,
  wieħed: 1,
  wiehed: 1,
  tnejn: 2,
  tlieta: 3,
  erbgħa: 4,
  erbgha: 4,
  ħamsa: 5,
  hamsa: 5,
  sitta: 6,
  sebgħa: 7,
  sebgha: 7,
  tmienja: 8,
  disgħa: 9,
  disgha: 9,
  għaxra: 10,
  ghaxra: 10,
  ħdax: 11,
  tnax: 12,
  tlettax: 13,
  erbatax: 14,
  ħmistax: 15,
  hmistax: 15,
  sittax: 16,
  sbatax: 17,
  tmintax: 18,
  dsatax: 19,
  għoxrin: 20,
  ghoxrin: 20,
  nofs: 0.5,
  kwart: 0.25,
  tletin: 30,
  erbgħin: 40,
  ħamsin: 50,
  sittin: 60,
  sebgħin: 70,
  tmenin: 80,
  disgħin: 90,
  mija: 100,
  thirty: 30,
  forty: 40,
  fifty: 50,
  sixty: 60,
  seventy: 70,
  eighty: 80,
  ninety: 90,
  hundred: 100,
};
export function numericAnswer(input: string): number | null {
  const t = input
    .trim()
    .toLowerCase()
    .replace(/[.!?]$/, "")
    .replace(
      /^(?:it is|the answer is|hu|hija|it-tweġiba hija|naħseb li)\s+/,
      "",
    )
    .replace(
      /\s+(?:cm|ċm|metres|metri|grams|grammi|minutes|minuti|euros|ewro)$/,
      "",
    );
  const compound = t.match(/^([\p{L}]+)\s+u\s+([\p{L}]+)$/u);
  if (
    compound &&
    words[compound[1]] > 0 &&
    words[compound[1]] < 10 &&
    words[compound[2]] >= 20
  )
    return words[compound[1]] + words[compound[2]];
  const english = t.match(/^([a-z]+)[ -]([a-z]+)$/);
  if (
    english &&
    words[english[1]] >= 20 &&
    words[english[2]] > 0 &&
    words[english[2]] < 10
  )
    return words[english[1]] + words[english[2]];
  if (t in words) return words[t];
  if (/^[-+]?\d+(?:[.,]\d+)?$/.test(t)) return Number(t.replace(",", "."));
  const m = t.match(/^([-+]?\d+)\s*\/\s*(\d+)$/);
  if (m && Number(m[2]) !== 0) return Number(m[1]) / Number(m[2]);
  return null;
}
export const equivalent = (answer: number, expected: number) =>
  Math.abs(answer - expected) < 1e-8;
export function teaching(
  topic: Topic,
  step: number,
  mistakes: number,
  input: string,
  lang: Language,
) {
  const exercise = topic.exercises[step];
  if (!exercise)
    return {
      text:
        lang === "mt"
          ? "Lestejna! Grazzi talli pprattikajt."
          : "Lesson complete! Thank you for practising.",
      nextStep: step,
      nextMistakes: 0,
      correct: null,
      type: "conclude",
      safetyState: "normal",
    };
  if (
    /\b(suicide|kill myself|hurt me|in danger|abuse)\b|periklu|weġġagħni/i.test(
      input,
    )
  )
    return {
      text:
        lang === "mt"
          ? "Waqqaf il-lezzjoni u kellem adult li tafda. Jekk hemm periklu immedjat, itlob għajnuna ta’ emerġenza."
          : "Stop the lesson and speak to a trusted adult. If you are in immediate danger, seek emergency help.",
      nextStep: step,
      nextMistakes: mistakes,
      correct: null,
      type: "redirect",
      safetyState: "escalate",
    };
  const value = numericAnswer(input);
  if (value === null)
    return {
      text: exercise.hint[lang] + " " + exercise.prompt[lang],
      nextStep: step,
      nextMistakes: mistakes,
      correct: null,
      type: "give_hint",
      safetyState: "normal",
    };
  if (equivalent(value, exercise.answer)) {
    const next = topic.exercises[step + 1];
    return {
      text:
        (lang === "mt" ? "Iva, tajjeb! " : "Yes, that’s correct! ") +
        (next
          ? next.prompt[lang]
          : lang === "mt"
            ? "Lestejna l-lezzjoni. Grazzi talli pprattikajt!"
            : "You completed the lesson. Thank you for practising!"),
      nextStep: step + 1,
      nextMistakes: 0,
      correct: true,
      type: next ? "ask_question" : "conclude",
      safetyState: "normal",
    };
  }
  return {
    text:
      (lang === "mt" ? "Erġa’ pprova. " : "Try again. ") +
      (mistakes >= 1 ? exercise.worked[lang] : exercise.hint[lang]) +
      " " +
      exercise.prompt[lang],
    nextStep: step,
    nextMistakes: Math.min(2, mistakes + 1),
    correct: false,
    type: "give_hint",
    safetyState: "normal",
  };
}
