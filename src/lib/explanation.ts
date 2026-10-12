import type { Language, Topic } from "./curriculum";
import { calculate } from "./verified-maths";

const normalise = (text: string) =>
  text
    .toLocaleLowerCase()
    .normalize("NFKC")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
export function repeatedExplanation(reply: string, previous: string[]) {
  const words = normalise(reply).split(" ");
  const current = new Set(words);
  return previous.some((text) => {
    if (normalise(text) === normalise(reply)) return true;
    if (
      words.length >= 5 &&
      ` ${normalise(text)} `.includes(` ${normalise(reply)} `)
    )
      return true;
    const old = new Set(normalise(text).split(" "));
    const overlap = [...current].filter((word) => old.has(word)).length;
    return (
      current.size >= 8 && overlap / new Set([...current, ...old]).size >= 0.82
    );
  });
}
export function needsSimplerExplanation(text: string) {
  return /don.?t understand|do not understand|confus|simpler|simple|break.*down|again|stuck|not sure|no idea|ma (?:fhimtx|nifhimx)|mhux ċar|aktar sempliċi|għadni/i.test(
    text,
  );
}

// These alternatives use only the verified current exercise. They also work
// without a model key and never advance or grade a lesson on their own.
export function simplerExplanation(
  topic: Topic,
  step: number,
  language: Language,
  previous: string[],
) {
  const exercise = topic.exercises[Math.min(step, topic.exercises.length - 1)];
  const mt = language === "mt";
  const pair = (en: string, maltese: string) => (mt ? maltese : en);
  const candidates: string[] = [];
  const equation = exercise.worked.en.match(
    /(-?\d+(?:\.\d+)?)\s*([+×*÷/−-])\s*(-?\d+(?:\.\d+)?)\s*=/,
  );
  const answer = equation
    ? calculate(`${equation[1]}${equation[2]}${equation[3]}`)
    : null;
  if (equation && answer !== null) {
    const a = Number(equation[1]),
      b = Number(equation[3]),
      op = equation[2];
    if (
      (op === "÷" || op === "/") &&
      Number.isInteger(a) &&
      Number.isInteger(b) &&
      a >= b &&
      a % b === 0 &&
      b > 0
    ) {
      candidates.push(
        pair(
          `Think of ${a} counters shared fairly between ${b} boxes. Each box gets the same amount. Start by putting one counter in each box.`,
          `Immaġina ${a} oġġett f’${b} kaxxi. Kull kaxxa tieħu l-istess ammont. Ibda billi tpoġġi oġġett wieħed f’kull kaxxa.`,
        ),
        pair(
          `Draw ${b} circles. They stand for the equal parts. Spread ${a} dots between the circles, one at a time. Count the dots in just one circle.`,
          `Pinġi ${b} ċrieki għall-partijiet indaqs. Qassam ${a} tikka bejn iċ-ċrieki, waħda waħda. Għodd it-tikek f’ċirku wieħed biss.`,
        ),
        pair(
          `Work backwards: every group must be the same size. Which number, repeated ${b} times, makes ${a}?`,
          `Aħdem bil-maqlub: kull grupp għandu jkun tal-istess daqs. Liema numru, ripetut ${b} darbiet, jagħti ${a}?`,
        ),
        pair(
          `Here is one worked step: ${a} ÷ ${b} = ${answer}. That is the amount in one equal part. We only need to understand this part before moving on.`,
          `Hawn pass wieħed: ${a} ÷ ${b} = ${answer}. Dan huwa l-ammont f’parti waħda. Nifhmu din il-parti qabel nimxu ’l quddiem.`,
        ),
      );
    } else if (
      (op === "×" || op === "*") &&
      Number.isInteger(a) &&
      Number.isInteger(b) &&
      a >= 0 &&
      b >= 0
    ) {
      candidates.push(
        pair(
          `Multiplication means equal groups. Picture ${b} bags, with ${a} counters in each. Focus on one bag first.`,
          `Il-multiplikazzjoni tfisser gruppi ndaqs. Immaġina ${b} borża, b’${a} oġġett f’kull waħda. Ibda minn borża waħda.`,
        ),
        pair(
          `Make a drawing with ${b} rows and ${a} dots in each row. Counting all the dots gives the total.`,
          `Pinġi ${b} ringiela b’${a} tikka f’kull ringiela. Għodd it-tikek kollha biex issib it-total.`,
        ),
        pair(
          `Use a number line. Start at zero and make ${b} jumps of ${a}. Each jump adds one more group.`,
          `Uża linja tan-numri. Ibda minn żero u agħmel ${b} qabża ta’ ${a}. Kull qabża żżid grupp ieħor.`,
        ),
        pair(
          `One worked part is ${a} × ${b} = ${answer}. That counts these equal groups. Which part of the grouping feels unclear?`,
          `Parti waħda maħduma hija ${a} × ${b} = ${answer}. Din tgħodd il-gruppi ndaqs. Liema parti mhix ċara?`,
        ),
      );
    } else if (op === "+" || op === "−" || op === "-") {
      const add = op === "+";
      candidates.push(
        pair(
          `Start with ${a}. ${add ? "Increase it by" : "Reduce it by"} ${b}. We want the new amount.`,
          `Ibda minn ${a}. ${add ? "Żid" : "Naqqas"} ${b}. Irridu nsibu l-ammont il-ġdid.`,
        ),
        pair(
          `Put your finger on ${a} on a number line. Move ${b} spaces ${add ? "forward" : "backward"}, one space at a time.`,
          `Poġġi subgħajk fuq ${a} fuq linja tan-numri. Imxi ${b} pass ${add ? "’il quddiem" : "lura"}, pass wieħed kull darba.`,
        ),
        pair(
          `Here is one part of the calculation: ${a} ${add ? "+" : "−"} ${b} = ${answer}. ${add ? "We combined the two amounts." : "We found the amount remaining."} What does that operation mean in the question?`,
          `Hawn parti waħda mill-kalkolu: ${a} ${add ? "+" : "−"} ${b} = ${answer}. ${add ? "Għaqqadna ż-żewġ ammonti." : "Sibna l-ammont li jibqa’."} Xi tfisser l-operazzjoni fil-mistoqsija?`,
        ),
      );
    }
    // Decimal amounts can be lengths or quantities; do not describe half a
    // counter or a fractional number of bags as physical objects.
    if (
      !Number.isInteger(a) ||
      !Number.isInteger(b) ||
      ((op === "÷" || op === "/") && a % b !== 0)
    ) {
      candidates.push(
        pair(
          `Think of the numbers as lengths on a ruler. We can measure parts of a unit too. Here is the one calculation we need: ${exercise.worked.en}`,
          `Aħseb fin-numri bħala tulijiet fuq riga. Nistgħu nkejlu partijiet ta’ unità wkoll. Hawn il-kalkolu li għandna bżonn: ${exercise.worked.mt}`,
        ),
      );
    }
  }
  candidates.push(
    pair(
      "Put the calculation aside for a moment. First find what the question gives you. Tell me one number or shape you can see.",
      "Inħallu l-kalkolu għal mument. L-ewwel sib x’tagħtik il-mistoqsija. Għidli numru jew forma li tara.",
    ),
    exercise.hint[language],
    pair(
      `We can try a different approach. Would a drawing or a small worked example help more?`,
      `Nistgħu nippruvaw mod ieħor. Tgħinek aktar tpinġija jew eżempju żgħir?`,
    ),
    exercise.worked[language],
    pair(
      "Draw just the things mentioned in the question and label what you know. What are we trying to find?",
      "Pinġi biss l-affarijiet imsemmija fil-mistoqsija u ikteb dak li taf. X’qegħdin nippruvaw insibu?",
    ),
  );
  // If several representations have already been tried, ask about a precise
  // part of the question instead of cycling back to an old explanation.
  const words = exercise.prompt[language].replace(/[?!.]/g, "").split(/\s+/);
  for (let length = 2; length <= Math.min(words.length, 5); length++) {
    for (let index = 0; index <= words.length - length; index++) {
      const phrase = words.slice(index, index + length).join(" ");
      candidates.push(
        pair(
          `When you read “${phrase}”, what do you think it means? We can start with those words.`,
          `Meta taqra “${phrase}”, x’taħseb li tfisser? Nistgħu nibdew minn dawn il-kelmiet.`,
        ),
      );
    }
  }
  return (
    candidates.find((candidate) => !repeatedExplanation(candidate, previous)) ??
    pair(
      "Tell me the exact word or step that is confusing, so we can try a new approach together.",
      "Għidli l-kelma jew il-pass li mhux ċar, biex nippruvaw mod ġdid flimkien.",
    )
  );
}
