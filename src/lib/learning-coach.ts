import { z } from "zod";
import {
  numericAnswer,
  equivalent,
  teaching,
  type Topic,
  type Language,
} from "./curriculum";
import { calculate } from "./verified-maths";
import { workedExplanation } from "./worked-explanation";

export const helpAttemptLimit = 4;
const stateSchema = z.object({
  questionStep: z.number().int().nonnegative(),
  scaffoldStep: z.number().int().nonnegative(),
  failures: z.number().int().min(0).max(helpAttemptLimit),
  strategy: z.number().int().min(0).max(3),
  active: z.boolean(),
});
export type CoachingState = z.infer<typeof stateSchema>;
export type Activity =
  | { kind: "sketch" }
  | { kind: "scene"; compare: boolean }
  | { kind: "fraction-bar"; numerator: number; denominator: number }
  | { kind: "reading"; passage: string; choices: string[] }
  | { kind: "plant"; seed: boolean }
  | { kind: "circuit" }
  | { kind: "particles" }
  | { kind: "sharing"; total: number; groups: number }
  | { kind: "array"; rows: number; columns: number }
  | { kind: "number-line"; start: number; change: number }
  | { kind: "shape"; sides: number }
  | { kind: "choices"; question: string; choices: string[] };
interface SmallStep {
  question: string;
  answers: (string | number)[];
  explanations: string[];
  choices?: string[];
}
export interface CoachingGuide {
  question: string;
  explanation: string;
  strategy: number;
  scaffoldStep: number;
  failures: number;
  activity: Activity | null;
}
const clean = (text: string) =>
  text
    .trim()
    .toLowerCase()
    .normalize("NFKC")
    .replace(/[.!?]$/, "");
export function coachingState(
  turns: { coaching?: unknown }[],
  step: number,
): CoachingState {
  for (const turn of [...turns].reverse()) {
    const parsed = stateSchema.safeParse(turn.coaching);
    if (parsed.success && parsed.data.questionStep === step) return parsed.data;
  }
  return {
    questionStep: step,
    scaffoldStep: 0,
    failures: 0,
    strategy: 0,
    active: false,
  };
}

// Every small answer is derived from the current checked exercise, never from
// model output or client history. Changing representation does not change the problem.
export function learningPlan(topic: Topic, step: number, language: Language) {
  const e = topic.exercises[step];
  const mt = language === "mt";
  const pair = (en: string, maltese: string) => (mt ? maltese : en);
  const main: SmallStep = {
    question: e.prompt[language],
    answers: [e.answer, ...(e.acceptedAnswers || [])],
    explanations: [],
    choices: e.choices?.[language],
  };
  let steps: SmallStep[] = [];
  let activity: Activity | null = null;
  const expression = e.worked.en.split("=")[0].trim();
  const equation = expression.match(
    /^(-?\d+(?:\.\d+)?)\s*([+−×÷-])\s*(-?\d+(?:\.\d+)?)$/,
  );
  const checked =
    typeof e.answer === "number" &&
    calculate(expression) !== null &&
    equivalent(calculate(expression)!, e.answer);
  const small = (
    question: string,
    answer: number,
    explanations: string[],
  ): SmallStep => ({ question, answers: [answer], explanations });
  if (equation && checked) {
    const a = Number(equation[1]),
      b = Number(equation[3]),
      op = equation[2];
    if (op === "÷") {
      steps.push(
        small(
          pair(
            `How many equal parts are we sharing into?`,
            `F’kemm-il parti ndaqs se naqsmu?`,
          ),
          b,
          [
            pair(
              `Start with just the divisor. In ${a} ÷ ${b}, ${b} tells us the number of equal parts. We are not calculating each part yet.`,
              `Ibda minn numru wieħed biss. F’${a} ÷ ${b}, ${b} jgħid f’kemm-il parti ndaqs se naqsmu. Għadna mhux qed insibu kemm hemm f’kull parti.`,
            ),
            pair(
              `Draw one empty box for each part named by ${b}. We will share ${a} between those boxes later. First count the empty boxes.`,
              `Pinġi kaxxa vojta għal kull parti msemmija minn ${b}. Wara nqassmu ${a} bejn il-kaxxi. L-ewwel għodd il-kaxxi vojta.`,
            ),
            pair(
              `Read ÷ as “share equally”. The number after that sign, ${b}, answers “between how many parts”. Focus only on that number.`,
              `Aqra ÷ bħala “aqsam indaqs”. In-numru wara s-sinjal, ${b}, jgħid kemm-il parti għandna. Ħares biss lejn dak in-numru.`,
            ),
          ],
        ),
      );
      main.explanations = [
        pair(
          `Now find the amount in one part. Each of the ${b} parts must have the same amount, and all parts together must make ${a}.`,
          `Issa sib l-ammont f’parti waħda. Kull waħda mill-${b} partijiet għandu jkollha l-istess ammont; flimkien għandhom jagħtu ${a}.`,
        ),
        pair(
          `Think backwards using multiplication: ${b} equal groups of the missing amount must give ${a}. Try an amount and multiply it by ${b} to check.`,
          `Aħseb bil-maqlub: ${b} gruppi tal-ammont nieqes għandhom jagħtu ${a}. Ipprova ammont u mmultiplikah b’${b} biex tiċċekkja.`,
        ),
        pair(
          `Use the sharing picture. Put the items into the groups evenly, then count only one group, not the total.`,
          `Uża t-tpinġija tal-qsim. Qassam l-oġġetti indaqs bejn il-gruppi, imbagħad għodd grupp wieħed biss, mhux it-total.`,
        ),
      ];
      if (
        a > 0 &&
        a <= 80 &&
        b >= 1 &&
        b <= 10 &&
        Number.isInteger(a) &&
        Number.isInteger(b) &&
        a % b === 0
      )
        activity = { kind: "sharing", total: a, groups: b };
      else if (
        a > 0 &&
        a < b &&
        Number.isInteger(a) &&
        Number.isInteger(b) &&
        b <= 12
      )
        activity = { kind: "fraction-bar", numerator: a, denominator: b };
    } else if (op === "×") {
      steps.push(
        small(
          pair(
            `How many groups does ${a} tell us to make?`,
            `Kemm-il grupp jgħidilna nagħmlu ${a}?`,
          ),
          a,
          [
            pair(
              `Separate the two jobs in ${a} × ${b}. First make ${a} groups. Later each group will contain ${b}. For now we only count groups.`,
              `Aqsam ${a} × ${b} f’żewġ biċċiet. L-ewwel nagħmlu ${a} gruppi. Wara, kull grupp ikollu ${b}. Għalissa ngħoddu l-gruppi biss.`,
            ),
            pair(
              `Picture ${a} empty rows. Each row represents a group; filling each row with ${b} comes next.`,
              `Immaġina ${a} ringiela vojta. Kull ringiela hija grupp; wara nimlew kull waħda b’${b}.`,
            ),
            pair(
              `The first number, ${a}, counts groups in this model. The second, ${b}, counts items in each group. Point to the first number.`,
              `L-ewwel numru, ${a}, jgħodd il-gruppi f’dan il-mudell. It-tieni, ${b}, jgħodd l-oġġetti f’kull grupp. Ħares lejn l-ewwel numru.`,
            ),
          ],
        ),
      );
      main.explanations = [
        pair(
          `Now count the total: there are ${a} groups with ${b} in each. Add ${b} once for every group.`,
          `Issa għodd it-total: hemm ${a} gruppi b’${b} f’kull wieħed. Żid ${b} darba għal kull grupp.`,
        ),
        pair(
          `Use rows and columns. Make ${a} rows of ${b} items, then count every item once.`,
          `Uża ringieli u kolonni. Agħmel ${a} ringiela ta’ ${b} oġġett, imbagħad għodd kull oġġett darba.`,
        ),
        pair(
          `Skip-count by ${b}, keeping track of ${a} groups. The last total is the amount we need.`,
          `Għodd f’passi ta’ ${b}, għal ${a} gruppi. L-aħħar total huwa l-ammont li għandna bżonn.`,
        ),
      ];
      if (
        a >= 1 &&
        a <= 12 &&
        b >= 1 &&
        b <= 12 &&
        Number.isInteger(a) &&
        Number.isInteger(b)
      )
        activity = { kind: "array", rows: a, columns: b };
    } else {
      const add = op === "+";
      steps.push(
        small(
          pair(`What amount do we start with?`, `Minn liema ammont nibdew?`),
          a,
          [
            pair(
              `Look at only the starting amount, ${a}. We will ${add ? "add" : "take away"} ${b} later.`,
              `Ħares biss lejn l-ammont tal-bidu, ${a}. Wara ${add ? "inżidu" : "innaqqsu"} ${b}.`,
            ),
            pair(
              `On a number line, our starting point is ${a}. Do not move along the line yet.`,
              `Fuq linja tan-numri, nibdew minn ${a}. Għadek timxix fuq il-linja.`,
            ),
            pair(
              `Cover the sign and the second number. The number left visible is ${a}, our starting amount.`,
              `Għatti s-sinjal u t-tieni numru. In-numru li tibqa’ tara huwa ${a}, l-ammont tal-bidu.`,
            ),
          ],
        ),
      );
      if (Number.isInteger(b) && b >= 10 && b % 10 !== 0) {
        const tens = Math.floor(b / 10) * 10,
          ones = b % 10,
          intermediate = add ? a + tens : a - tens;
        steps.push(
          small(
            pair(
              `What is ${a} ${add ? "+" : "−"} ${tens}?`,
              `Kemm hu ${a} ${add ? "+" : "−"} ${tens}?`,
            ),
            intermediate,
            [
              pair(
                `Split ${b} into ${tens} and ${ones}. Work with the ${tens} first; leave the ${ones} for the next step.`,
                `Aqsam ${b} f’${tens} u ${ones}. Aħdem b’${tens} l-ewwel; ħalli ${ones} għall-pass ta’ wara.`,
              ),
              pair(
                `Move in steps of ten from ${a}, ${add ? "forward" : "backward"}. We are moving ${tens}, not the whole ${b} yet.`,
                `Imxi f’passi ta’ għaxra minn ${a}, ${add ? "’il quddiem" : "lura"}. Qed nimxu ${tens}, mhux ${b} kollu.`,
              ),
              pair(
                `Only the tens part changes in this small calculation. Keep the remaining ${ones} aside.`,
                `F’dan il-kalkolu żgħir naħdmu bil-parti tal-għexieren biss. Ħalli ${ones} fil-ġenb.`,
              ),
            ],
          ),
        );
      }
      main.explanations = [
        pair(
          `Return to ${a} ${op} ${b}. ${add ? "Add" : "Remove"} the whole ${b}, including any ones left from the smaller calculation.`,
          `Erġa’ ħares lejn ${a} ${op} ${b}. ${add ? "Żid" : "Naqqas"} ${b} kollu, inklużi l-unitajiet li fadal mill-kalkolu ż-żgħir.`,
        ),
        pair(
          `On a number line start at ${a} and move ${b} ${add ? "forward" : "backward"}. Where do you finish?`,
          `Fuq linja tan-numri ibda minn ${a} u imxi ${b} ${add ? "’il quddiem" : "lura"}. Fejn tasal?`,
        ),
        pair(
          `Check the direction: ${add ? "addition increases" : "subtraction reduces"} the starting amount. Work with the exact numbers ${a} and ${b}.`,
          `Iċċekkja d-direzzjoni: ${add ? "iż-żieda tkabbar" : "it-tnaqqis inaqqas"} l-ammont tal-bidu. Uża n-numri ${a} u ${b}.`,
        ),
      ];
      if (Math.abs(a) <= 100 && Math.abs(b) <= 100)
        activity = { kind: "number-line", start: a, change: add ? b : -b };
    }
  }
  if (!main.explanations.length) {
    const answerWords = [String(e.answer), ...(e.acceptedAnswers || [])].map(
      clean,
    );
    const clues = e.worked[language]
      .split(/(?<=[.!])\s+/)
      .filter(
        (sentence) =>
          !answerWords.some((answer) =>
            ` ${clean(sentence).replace(/[^\p{L}\p{N}]+/gu, " ")} `.includes(
              ` ${answer.replace(/[^\p{L}\p{N}]+/gu, " ")} `,
            ),
          ),
      );
    const safeHint = answerWords.some((answer) =>
      clean(e.hint[language]).includes(answer),
    )
      ? ""
      : e.hint[language];
    main.explanations = [
      pair(
        `Focus on one clue in this question. ${safeHint || clues[0] || "Read the words that tell us what to find."}`,
        `Ħares lejn ħjiel wieħed f’din il-mistoqsija. ${safeHint || clues[0] || "Aqra l-kliem li jgħid x’għandna nsibu."}`,
      ),
      pair(
        `Try a different route: ${clues[1] || "Look at the information given and match it to what the question asks. Use only this question’s details."}`,
        `Ipprova mod ieħor: ${clues[1] || "Ħares lejn it-tagħrif mogħti u qabblu ma’ dak li titlob il-mistoqsija. Uża biss id-dettalji tagħha."}`,
      ),
      pair(
        `Make the choice smaller. ${e.choices ? "Compare just two possible answers and look for the clue supporting one." : "Point to the relevant number, word or shape, then use the hint to decide what to do with it."}`,
        `Agħmel il-biċċa iżgħar. ${e.choices ? "Qabbel żewġ tweġibiet possibbli biss u fittex il-ħjiel għal waħda minnhom." : "Sib in-numru, il-kelma jew il-forma importanti, imbagħad uża l-ħjiel biex tagħżel il-pass."}`,
      ),
    ];
    const prompt = e.prompt.en.replace(/^Read: '.*?' /, "");
    let concept: {
      answer: string;
      aliases: string[];
      question: string;
      clues: string[];
    } | null = null;
    if (/plural/i.test(prompt))
      concept = {
        answer: "more than one",
        aliases: ["plural", "many", "several", "aktar minn wieħed", "ħafna"],
        question: pair(
          "Does plural mean one or more than one?",
          "Il-plural ifisser wieħed jew aktar minn wieħed?",
        ),
        clues: [
          pair(
            "Start with the meaning of plural, not the spelling. Plural is used when we mean several people or things.",
            "Ibda mit-tifsira ta’ plural, mhux mill-kitba tal-kelma. Nużaw il-plural meta nitkellmu fuq diversi persuni jew affarijiet.",
          ),
          pair(
            "Picture one item, then a group of items. We use the plural form for the group.",
            "Immaġina oġġett wieħed, imbagħad grupp ta’ oġġetti. Għall-grupp nużaw il-forma tal-plural.",
          ),
          pair(
            "The question changes from a single example to a group. Decide what plural tells us about the quantity.",
            "Il-mistoqsija tibdel minn eżempju wieħed għal grupp. Aħseb x’jgħidilna l-plural dwar il-kwantità.",
          ),
        ],
      };
    else if (
      /\bverb\b|action word|word.*action|action in/i.test(prompt) &&
      !/\badverb\b|tells?.{0,12}\bhow\b|how an action/i.test(prompt)
    )
      concept = {
        answer: "verb",
        aliases: ["a verb", "verbu"],
        question: pair(
          "What kind of word tells us an action?",
          "X’tip ta’ kelma turi azzjoni?",
        ),
        clues: [
          pair(
            "First identify the job of the word. An action word tells what somebody does. We call this kind of word a verb.",
            "L-ewwel aħseb x’tagħmel il-kelma. Kelma ta’ azzjoni tgħid x’jagħmel xi ħadd. Dan it-tip ta’ kelma nsejħulu verb.",
          ),
          pair(
            "Act out a movement such as walking. The word for that action is a verb; a person’s name has a different job.",
            "Immaġina azzjoni, bħal li timxi. Il-kelma għal dik l-azzjoni hija verb; isem ta’ persuna għandu xogħol ieħor.",
          ),
          pair(
            "Ask “what is being done”, before finding the word in the sentence. That points to the verb.",
            "L-ewwel staqsi x’qed isir, qabel issib il-kelma fis-sentenza. Dan iwasslek għall-verb.",
          ),
        ],
      };
    else if (
      /\bnoun\b|names (?:an object|a thing|a place)|word names|names a thing/i.test(
        prompt,
      )
    )
      concept = {
        answer: "noun",
        aliases: ["a noun", "nom"],
        question: pair(
          "What kind of word names a person, place or thing?",
          "X’tip ta’ kelma ssemmi persuna, post jew ħaġa?",
        ),
        clues: [
          pair(
            "Separate a name from an action. A noun is the word we use to name a person, a place or a thing.",
            "Aqsam bejn isem u azzjoni. Nom huwa kelma li nużaw biex insemmu persuna, post jew ħaġa.",
          ),
          pair(
            "Imagine pointing to an object and naming it. The naming word is a noun.",
            "Immaġina li qed turi oġġett u ssemmih. Il-kelma li ssemmih hija nom.",
          ),
          pair(
            "Find the category first: naming words are nouns, while action words are verbs.",
            "L-ewwel sib il-kategorija: kliem li jsemmi huwa nomi; kliem li juri azzjoni huwa verbi.",
          ),
        ],
      };
    else if (
      /adjective|describ|describing word/i.test(prompt) &&
      (topic.subject === "english" || topic.subject === "maltese")
    )
      concept = {
        answer: "adjective",
        aliases: ["an adjective", "aġġettiv"],
        question: pair(
          "What kind of word describes a noun?",
          "X’tip ta’ kelma tiddeskrivi nom?",
        ),
        clues: [
          pair(
            "An adjective adds a detail about a noun, such as its colour or size. First focus on that describing job.",
            "Aġġettiv iżid dettall dwar nom, bħall-kulur jew id-daqs. L-ewwel aħseb f’dak ix-xogħol li jiddeskrivi.",
          ),
          pair(
            "A naming word tells us the thing; a describing word tells us what the thing is like. The describing word is an adjective.",
            "Nom jgħidilna x’inhi l-ħaġa; kelma li tiddeskrivi tgħid kif inhi. Dik il-kelma hija aġġettiv.",
          ),
          pair(
            "Look for an extra detail, rather than an action. Colour and size are examples of details an adjective can give.",
            "Fittex dettall żejjed, mhux azzjoni. Il-kulur u d-daqs huma eżempji ta’ dettalji li jista’ jagħti aġġettiv.",
          ),
        ],
      };
    else if (/adverb|tells?.{0,12}\bhow\b/i.test(prompt))
      concept = {
        answer: "adverb",
        aliases: ["an adverb", "avverbju"],
        question: pair(
          "What kind of word can tell us how an action happens?",
          "X’tip ta’ kelma tista’ tgħid kif issir azzjoni?",
        ),
        clues: [
          pair(
            "An adverb can tell us how an action happens. Focus on how, rather than who did it.",
            "Avverbju jista’ jgħid kif issir azzjoni. Aħseb f’kif issir, mhux f’min għamilha.",
          ),
          pair(
            "Separate the action from the way it is done. The word giving that extra information can be an adverb.",
            "Aqsam bejn l-azzjoni u l-mod kif issir. Il-kelma li tagħti dak it-tagħrif tista’ tkun avverbju.",
          ),
          pair(
            "Ask about the manner of the action. The category to look for is an adverb.",
            "Aħseb dwar il-mod kif issir l-azzjoni. Il-kategorija li għandna nfittxu hija avverbju.",
          ),
        ],
      };
    else if (/synonym|means the same/i.test(prompt))
      concept = {
        answer: "same",
        aliases: ["same meaning", "the same", "l-istess", "l-istess tifsira"],
        question: pair(
          "Do synonyms have the same or opposite meanings?",
          "Is-sinonimi għandhom l-istess tifsira jew tifsira opposta?",
        ),
        clues: [
          pair(
            "A synonym is another word with a similar meaning. Start with what that relationship means.",
            "Sinonimu huwa kelma oħra b’tifsira simili. Ibda minn x’tfisser dik ir-relazzjoni.",
          ),
          pair(
            "Two synonyms can often describe the same idea in different words. Opposites do a different job.",
            "Żewġ sinonimi jistgħu jesprimu l-istess idea bi kliem differenti. Il-kliem oppost jagħmel xogħol ieħor.",
          ),
          pair(
            "Compare meanings, not spelling. Synonyms are linked by a similar meaning.",
            "Qabbel it-tifsira, mhux il-kitba. Is-sinonimi għandhom tifsira simili.",
          ),
        ],
      };
    else if (topic.subject === "science" && /shape|state.*shape/i.test(prompt))
      concept = {
        answer: "shape",
        aliases: ["form", "forma", "il-forma"],
        question: pair(
          "Are we comparing shape or colour here?",
          "Hawn qed inqabblu l-forma jew il-kulur?",
        ),
        clues: [
          pair(
            "First identify the property in the question. Shape means the outline or form an object keeps.",
            "L-ewwel sib il-proprjetà fil-mistoqsija. Forma tfisser id-dehra ta’ barra li jżomm oġġett.",
          ),
          pair(
            "Think of a block and water in a cup. Look at their form rather than their colour.",
            "Immaġina blokka u ilma f’tazza. Ħares lejn il-forma tagħhom, mhux lejn il-kulur.",
          ),
          pair(
            "The question uses the word shape. We are deciding whether the form stays the same.",
            "Il-mistoqsija tuża l-kelma forma. Irridu naraw jekk dik il-forma tibqax l-istess.",
          ),
        ],
      };
    if (concept) {
      const options: Record<string, string[]> = {
        noun: ["noun", "verb", "adjective"],
        verb: ["noun", "verb", "adverb"],
        adjective: ["noun", "adjective", "verb"],
        adverb: ["verb", "adverb", "noun"],
        "more than one": ["one", "more than one"],
        same: ["same", "opposite"],
        shape: ["shape", "colour"],
      };
      const mtWords: Record<string, string> = {
        noun: "nom",
        verb: "verb",
        adjective: "aġġettiv",
        adverb: "avverbju",
        one: "wieħed",
        "more than one": "aktar minn wieħed",
        same: "l-istess",
        opposite: "oppost",
        shape: "forma",
        colour: "kulur",
      };
      steps.push({
        question: concept.question,
        answers: [concept.answer, ...concept.aliases],
        explanations: concept.clues,
        choices: options[concept.answer]?.map((word) =>
          mt ? mtWords[word] : word,
        ),
      });
      main.explanations[0] = pair(
        "Now apply the idea to this question’s words. Look at each option and decide which fits the job or property we just identified.",
        "Issa applika l-idea għall-kliem f’din il-mistoqsija. Ħares lejn kull għażla u ara liema taqbel max-xogħol jew mal-proprjetà li għadna kif identifikajna.",
      );
    }
  }
  if (e.choices)
    activity = {
      kind: "choices",
      question: e.prompt[language],
      choices: e.choices[language],
    };
  const passage =
    e.passage ||
    topic.exercises
      .slice(0, step + 1)
      .reverse()
      .map(
        (exercise) =>
          exercise.prompt[language].match(/(?:Read|Aqra): '(.*?)' /)?.[1],
      )
      .find(Boolean);
  if (passage)
    activity = {
      kind: "reading",
      passage,
      choices: e.choices?.[language] || [],
    };
  if (topic.id.endsWith("SCIENCE-PLANTS"))
    activity = { kind: "plant", seed: /seed|germinat/i.test(e.prompt.en) };
  if (topic.id.endsWith("SCIENCE-CIRCUITS")) activity = { kind: "circuit" };
  if (
    topic.id.endsWith("SCIENCE-MATERIALS") &&
    !/magnet|material|kalamit|materjal/i.test(e.prompt.en)
  )
    activity = { kind: "particles" };
  if (topic.id.endsWith("SHAPES") && typeof e.answer === "number")
    activity = { kind: "shape", sides: e.answer };
  if (e.scene) activity = { kind: "scene", compare: e.scene === "compare" };
  if (!activity && topic.subject === "maths") activity = { kind: "sketch" };
  steps.push(main);
  for (const smallStep of steps)
    smallStep.explanations.push(
      pair(
        `Set the other steps aside. We only need this part: ${smallStep.question.replace(/\?/g, ".")} Use the picture or underline the relevant detail before trying it.`,
        `Ħalli l-passi l-oħra għal wara. Għandna bżonn din il-biċċa biss: ${smallStep.question.replace(/\?/g, ".")} Uża t-tpinġija jew immarka d-dettall importanti qabel tipprova.`,
      ),
    );
  return { steps, activity };
}

export function coachPractice(
  topic: Topic,
  step: number,
  mistakes: number,
  text: string,
  language: Language,
  state: CoachingState,
) {
  const baseline = teaching(topic, step, mistakes, text, language);
  if (baseline.safetyState !== "normal")
    return {
      ...baseline,
      coaching: null,
      guide: null,
      revealed: false,
      activity: null,
      choices: [],
    };
  const plan = learningPlan(topic, step, language);
  const index = Math.min(state.scaffoldStep, plan.steps.length - 1);
  const current = plan.steps[index];
  const microCorrect =
    state.active &&
    index < plan.steps.length - 1 &&
    current.answers.some((answer) =>
      typeof answer === "number"
        ? numericAnswer(text) !== null &&
          equivalent(numericAnswer(text)!, answer)
        : clean(text) === clean(answer),
    );
  const answeringSmallStep = state.active && index < plan.steps.length - 1;
  if (baseline.correct === true && !(answeringSmallStep && microCorrect))
    return {
      ...baseline,
      coaching: null,
      guide: null,
      revealed: false,
      activity: null,
      choices: topic.exercises[baseline.nextStep]?.choices?.[language] || [],
    };
  const nextIndex = microCorrect
    ? Math.min(index + 1, plan.steps.length - 1)
    : index;
  const failures = microCorrect ? 0 : state.failures + 1;
  if (failures >= helpAttemptLimit) {
    const next = topic.exercises[step + 1];
    const worked = workedExplanation(topic, step, language).replace(
      /\n\n[^\n]*\?$/,
      "",
    );
    return {
      ...baseline,
      correct: null,
      nextStep: step + 1,
      nextMistakes: 0,
      text:
        worked +
        "\n\n" +
        (language === "mt"
          ? "Għamilt diversi tentattivi. Din kienet tweġiba bl-għajnuna. "
          : "You tried several approaches. This answer was shown with help. ") +
        (next
          ? (language === "mt"
              ? "Ejja nippruvaw il-mistoqsija li jmiss:\n"
              : "Let’s try the next question:\n") + next.prompt[language]
          : language === "mt"
            ? "Lestejna din il-lezzjoni. Tista’ tagħżel suġġett ieħor biex tkompli tipprattika."
            : "This lesson is complete. Choose another topic to keep practising."),
      type: "worked_answer",
      coaching: { ...state, failures, active: false },
      guide: null,
      revealed: true,
      activity: next ? learningPlan(topic, step + 1, language).activity : null,
      choices: next?.choices?.[language] || [],
    };
  }
  const strategy =
    microCorrect || !state.active ? 0 : Math.min(state.strategy + 1, 3);
  const smallStep = plan.steps[nextIndex];
  const guide: CoachingGuide = {
    question: smallStep.question,
    explanation: smallStep.explanations[strategy].replace(/\?/g, "."),
    strategy,
    scaffoldStep: nextIndex,
    failures,
    activity: plan.activity,
  };
  const prefix = microCorrect
    ? language === "mt"
      ? "Iva, dan il-pass żgħir huwa tajjeb. "
      : "Yes, that small step is right. "
    : "";
  return {
    ...baseline,
    correct: microCorrect || answeringSmallStep ? null : baseline.correct,
    nextStep: step,
    nextMistakes: microCorrect ? 0 : Math.max(failures, baseline.nextMistakes),
    text: prefix + guide.explanation + "\n\n" + guide.question,
    type: "guided_step",
    coaching: {
      questionStep: step,
      scaffoldStep: nextIndex,
      failures,
      strategy,
      active: true,
    },
    guide,
    revealed: false,
    activity: plan.activity,
    choices: smallStep.choices || [],
  };
}
