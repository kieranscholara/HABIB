import type { Exercise, Topic } from "./curriculum";
import { calculate } from "./verified-maths";

const math = (expression: string, en?: string, mt?: string): Exercise => {
  const value = calculate(expression);
  if (value === null) throw new Error("Invalid authored practice calculation");
  const answer = Number(value.toFixed(10));
  return {
    answer,
    prompt: {
      en: en || `What is ${expression}?`,
      mt: mt || `Kemm hu ${expression}?`,
    },
    hint: {
      en: `Work with the given numbers using ${expression}.`,
      mt: `Aħdem bin-numri mogħtija: ${expression}.`,
    },
    worked: {
      en: `${expression} = ${answer}.`,
      mt: `${expression} = ${answer}.`,
    },
  };
};
const fact = (
  en: string,
  mt: string,
  answer: number,
  hintEn: string,
  hintMt: string,
  workedEn: string,
  workedMt: string,
): Exercise => ({
  answer,
  prompt: { en, mt },
  hint: { en: hintEn, mt: hintMt },
  worked: { en: workedEn, mt: workedMt },
});
const word = (
  en: string,
  mt: string,
  answer: string,
  choices: string[],
  workedEn: string,
  workedMt: string,
  aliases: string[] = [],
): Exercise => ({
  answer,
  acceptedAnswers: aliases,
  prompt: { en, mt },
  choices: { en: choices, mt: choices },
  hint: { en: workedEn.split(".")[0] + ".", mt: workedMt.split(".")[0] + "." },
  worked: { en: workedEn, mt: workedMt },
});
function mathsPractice(topic: Topic): Exercise[] {
  const id = topic.id.split("-").slice(1).join("-");
  switch (id) {
    case "PLACE":
      return [
        fact(
          "What is the value of 7 in 758?",
          "X’inhu l-valur ta’ 7 f’758?",
          700,
          "Find the hundreds column.",
          "Sib il-kolonna tal-mijiet.",
          "7 hundreds = 700.",
          "7 mijiet = 700.",
        ),
        math("700 + 50"),
        math("750 + 8"),
        fact(
          "What is the value of 6 in 263?",
          "X’inhu l-valur ta’ 6 f’263?",
          60,
          "The middle digit is in the tens column.",
          "Iċ-ċifra tan-nofs hija fil-kolonna tal-għexieren.",
          "6 tens = 60.",
          "6 għexieren = 60.",
        ),
        math("200 + 60"),
        math("260 + 3"),
        fact(
          "What is the value of 5 in 507?",
          "X’inhu l-valur ta’ 5 f’507?",
          500,
          "Look at the hundreds.",
          "Ħares lejn il-mijiet.",
          "5 hundreds = 500.",
          "5 mijiet = 500.",
        ),
        math("400 + 80"),
        math("480 + 9"),
      ];
    case "ADD":
      return [
        "32 + 15",
        "56 − 24",
        "28 + 16",
        "73 − 18",
        "45 + 27",
        "90 − 36",
        "38 + 24",
        "65 − 29",
        "47 + 18",
      ].map((s, i) =>
        math(
          s,
          i >= 3
            ? `A game score changes by this calculation: ${s}. What is the new score?`
            : undefined,
          i >= 3
            ? `Il-punteġġ ta’ logħba jinbidel hekk: ${s}. Kemm hu l-punteġġ il-ġdid?`
            : undefined,
        ),
      );
    case "TABLES":
      return [
        "3 × 7",
        "5 × 6",
        "4 × 8",
        "6 × 3",
        "7 × 4",
        "8 × 2",
        "5 × 4",
        "6 × 7",
        "3 × 8",
      ].map((s, i) =>
        math(
          s,
          i >= 6
            ? `${s.split(" × ")[0]} boxes each contain ${s.split(" × ")[1]} pencils. How many pencils altogether?`
            : undefined,
          i >= 6
            ? `${s.split(" × ")[0]} kaxxa fihom ${s.split(" × ")[1]} lapsijiet kull waħda. Kemm hemm lapsijiet b’kollox?`
            : undefined,
        ),
      );
    case "DIVISION":
      return [
        "24 ÷ 3",
        "40 ÷ 5",
        "42 ÷ 6",
        "36 ÷ 4",
        "56 ÷ 7",
        "32 ÷ 8",
        "30 ÷ 6",
        "28 ÷ 4",
        "45 ÷ 5",
      ].map((s, i) =>
        math(
          s,
          i >= 6
            ? `Share ${s.split(" ÷ ")[0]} cards equally between ${s.split(" ÷ ")[1]} players. How many cards does each get?`
            : undefined,
          i >= 6
            ? `Aqsam ${s.split(" ÷ ")[0]} karta indaqs bejn ${s.split(" ÷ ")[1]} plejer. Kemm-il karta jieħu kull wieħed?`
            : undefined,
        ),
      );
    case "TIME":
      return [
        math(
          "3 × 60",
          "How many minutes are in 3 hours?",
          "Kemm-il minuta hemm fi 3 sigħat?",
        ),
        math(
          "60 ÷ 2",
          "How many minutes are in half an hour?",
          "Kemm-il minuta hemm f’nofs siegħa?",
        ),
        math(
          "4 + 2",
          "You have €4 and receive €2. How many euros now?",
          "Għandek €4 u tieħu €2. Kemm għandek ewro issa?",
        ),
        math(
          "10 − 7",
          "A book costs €7. You pay €10. How many euros change?",
          "Ktieb jiswa €7. Tħallas €10. Kemm-il ewro bqija?",
        ),
        math(
          "60 + 15",
          "Add 15 minutes to an hour. How many minutes altogether?",
          "Żid 15-il minuta ma’ siegħa. Kemm-il minuta b’kollox?",
        ),
        math(
          "2 × 5",
          "Two toys each cost €5. How many euros altogether?",
          "Żewġ ġugarelli jiswew €5 kull wieħed. Kemm-il ewro b’kollox?",
        ),
        math(
          "4 × 60",
          "How many minutes are in 4 hours?",
          "Kemm-il minuta hemm f’4 sigħat?",
        ),
        math(
          "20 − 13",
          "Pay €20 for an item costing €13. How many euros change?",
          "Ħallas €20 għal oġġett ta’ €13. Kemm-il ewro bqija?",
        ),
        math(
          "5 + 5 + 2",
          "Add coins worth €5, €5 and €2. How many euros?",
          "Żid €5, €5 u €2. Kemm-il ewro?",
        ),
      ];
    case "SHAPES":
      return [
        ["pentagon", "pentagonu", 5],
        ["rectangle", "rettangolu", 4],
        ["octagon", "ottagonu", 8],
        ["triangle", "trijanglu", 3],
        ["hexagon", "eżagonu", 6],
        ["square", "kwadru", 4],
        ["octagon", "ottagonu", 8],
        ["pentagon", "pentagonu", 5],
        ["rectangle", "rettangolu", 4],
      ].map(([en, mt, n], i) =>
        fact(
          i >= 3
            ? `Draw a ${en} and count its sides. How many sides?`
            : `How many sides does a ${en} have?`,
          i >= 3
            ? `Pinġi ${mt} u għodd in-naħat tiegħu. Kemm-il naħa?`
            : `Kemm-il naħa għandu ${mt}?`,
          n as number,
          "Trace each straight edge once.",
          "Segwi kull naħa dritta darba.",
          `A ${en} has ${n} sides.`,
          `Il-forma għandha ${n} naħat.`,
        ),
      );
    case "NUMBERS":
      return [
        "3500 + 1200",
        "7000 − 2400",
        "4800 ÷ 6",
        "4200 + 1800",
        "9000 − 3250",
        "5600 ÷ 8",
        "4600 + 2300",
        "8000 − 1750",
        "6300 ÷ 7",
      ].map((s) => math(s));
    case "MULTIPLY":
      return [
        "14 × 5",
        "96 ÷ 8",
        "16 × 4",
        "108 ÷ 9",
        "18 × 6",
        "144 ÷ 12",
        "13 × 7",
        "120 ÷ 8",
        "17 × 5",
      ].map((s) => math(s));
    case "FRACTIONS":
      return [
        math("28 ÷ 4", "Find one quarter of 28.", "Sib kwart ta’ 28."),
        math(
          "7 × 3",
          "One quarter of 28 is 7. Find three quarters.",
          "Kwart ta’ 28 huwa 7. Sib tliet kwarti.",
        ),
        math("24 ÷ 3", "Find one third of 24.", "Sib terz ta’ 24."),
        math(
          "8 × 2",
          "One third of 24 is 8. Find two thirds.",
          "Terz ta’ 24 huwa 8. Sib żewġ terzi.",
        ),
        math(
          "35 ÷ 5",
          "Find one fifth of 35.",
          "Sib wieħed minn ħamsa ta’ 35.",
        ),
        math(
          "7 × 4",
          "One fifth of 35 is 7. Find four fifths.",
          "Wieħed minn ħamsa ta’ 35 huwa 7. Sib erbgħa minn ħamsa.",
        ),
        math(
          "32 ÷ 4 × 3",
          "Find 3/4 of 32. Show your working.",
          "Sib 3/4 ta’ 32. Uri l-passi.",
        ),
        math(
          "27 ÷ 3 × 2",
          "Find 2/3 of 27. Show your working.",
          "Sib 2/3 ta’ 27. Uri l-passi.",
        ),
        math(
          "40 ÷ 5 × 4",
          "Find 4/5 of 40. Show your working.",
          "Sib 4/5 ta’ 40. Uri l-passi.",
        ),
      ];
    case "DECIMALS":
      return [
        "0.3 + 0.4",
        "1.2 − 0.5",
        "2.5 + 0.75",
        "1 ÷ 2",
        "1 ÷ 4",
        "3 ÷ 4",
        "0.6 + 0.25",
        "2 − 0.8",
        "2.5 + 1.25",
      ].map((s) => math(s));
    case "MEASURES":
      return [
        math(
          "3 × 100",
          "How many centimetres in 3 metres?",
          "Kemm-il ċentimetru fi 3 metri?",
        ),
        math(
          "1000 ÷ 4",
          "How many grams in one quarter of a kilogram?",
          "Kemm-il gramma fi kwart ta’ kilogramma?",
        ),
        math(
          "600 ÷ 100",
          "How many metres in 600 centimetres?",
          "Kemm-il metru f’600 ċentimetru?",
        ),
        math(
          "2 × 1000",
          "How many grams in 2 kilograms?",
          "Kemm-il gramma f’2 kilogrammi?",
        ),
        math(
          "150 + 250",
          "Combine lengths of 150 cm and 250 cm. How many cm?",
          "Għaqqad tul ta’ 150 ċm ma’ 250 ċm. Kemm-il ċentimetru?",
        ),
        math(
          "1000 − 350",
          "Take 350 grams from 1 kilogram. How many grams remain?",
          "Neħħi 350 gramma minn kilogramma. Kemm-il gramma jibqa’?",
        ),
        math(
          "5 × 100",
          "Convert 5 metres to centimetres.",
          "Ikkonverti 5 metri għal ċentimetri.",
        ),
        math(
          "750 ÷ 1000",
          "Convert 750 grams to kilograms.",
          "Ikkonverti 750 gramma għal kilogrammi.",
        ),
        math(
          "200 − 75",
          "A ribbon is 200 cm long. Cut off 75 cm. How many cm remain?",
          "Żigarella twila 200 ċm. Aqta’ 75 ċm. Kemm-il ċentimetru jibqa’?",
        ),
      ];
    case "AREA":
      return [
        math(
          "8 × 3",
          "A rectangle is 8 cm by 3 cm. Find its area in cm².",
          "Rettangolu 8 ċm b’3 ċm. Sib l-erja f’ċm².",
        ),
        math(
          "8 + 3 + 8 + 3",
          "The rectangle is 8 cm by 3 cm. Find its perimeter in cm.",
          "Ir-rettangolu huwa 8 ċm b’3 ċm. Sib il-perimetru f’ċm.",
        ),
        math(
          "5 × 5",
          "A square has sides of 5 cm. Find its area in cm².",
          "Kwadru għandu naħat ta’ 5 ċm. Sib l-erja f’ċm².",
        ),
        math(
          "4 × 5",
          "A square has sides of 5 cm. Find its perimeter in cm.",
          "Kwadru għandu naħat ta’ 5 ċm. Sib il-perimetru f’ċm.",
        ),
        math(
          "9 × 4",
          "Find the area of a 9 cm by 4 cm rectangle in cm².",
          "Sib l-erja ta’ rettangolu 9 ċm b’4 ċm f’ċm².",
        ),
        math(
          "9 + 4 + 9 + 4",
          "Find the perimeter of a 9 cm by 4 cm rectangle in cm.",
          "Sib il-perimetru ta’ rettangolu 9 ċm b’4 ċm f’ċm.",
        ),
        math(
          "8 × 5",
          "A rectangle is 8 cm by 5 cm. Calculate its area in cm².",
          "Rettangolu huwa 8 ċm b’5 ċm. Ikkalkula l-erja f’ċm².",
        ),
        math(
          "8 + 5 + 8 + 5",
          "Calculate the perimeter of an 8 cm by 5 cm rectangle in cm.",
          "Ikkalkula l-perimetru ta’ rettangolu 8 ċm b’5 ċm f’ċm.",
        ),
        math(
          "36 ÷ 4",
          "A rectangle has area 36 cm² and width 4 cm. Find its length in cm.",
          "Rettangolu għandu erja 36 ċm² u wisa’ 4 ċm. Sib it-tul f’ċm.",
        ),
      ];
    case "PERCENT":
      return [
        "90 ÷ 10",
        "80 ÷ 4",
        "120 ÷ 2",
        "150 ÷ 10",
        "100 ÷ 4",
        "70 ÷ 2",
        "200 ÷ 10",
        "120 ÷ 4",
        "150 ÷ 2",
      ].map((s, i) => {
        const den = Number(s.split(" ÷ ")[1]);
        const pc = den === 10 ? 10 : den === 4 ? 25 : 50;
        const a = s.split(" ÷ ")[0];
        return math(
          s,
          `Find ${pc}% of ${a}${i >= 6 ? ". Show your method." : "."}`,
          `Sib ${pc}% ta’ ${a}${i >= 6 ? ". Uri l-metodu." : "."}`,
        );
      });
    case "RATIO":
      return [
        "3 × 3",
        "3 × 4",
        "2 × 3",
        "4 × 2",
        "5 × 3",
        "2 × 4",
        "3 × 5",
        "2 × 6",
        "4 × 3",
      ].map((s, i) => {
        const [a, scale] = s.split(" × ");
        const reds = [2, 2, 3, 5, 2, 3, 2, 4, 2][i];
        return math(
          s,
          `The ratio of red to blue beads is ${reds}:${a}. There are ${reds * Number(scale)} red beads. How many blue beads?`,
          `Il-proporzjon ta’ żibeġ ħomor għal blu huwa ${reds}:${a}. Hemm ${reds * Number(scale)} żibġa ħamra. Kemm-il żibġa blu hemm?`,
        );
      });
    case "PROBLEMS":
      return [
        math(
          "5 × 4",
          "Five bags contain four marbles each. Find the total.",
          "Ħames boroż fihom erba’ boċċi kull waħda. Sib it-total.",
        ),
        math(
          "20 − 8",
          "There are 20 marbles. Eight are given away. How many remain?",
          "Hemm 20 boċċa. Jingħataw tmienja. Kemm jibqa’?",
        ),
        math(
          "12 ÷ 3",
          "Share 12 remaining marbles equally between 3 children. How many each?",
          "Aqsam 12-il boċċa li fadal indaqs bejn 3 itfal. Kemm jieħu kull wieħed?",
        ),
        math(
          "3 × 8",
          "Three boxes contain eight stickers each. How many stickers?",
          "Tliet kaxxi fihom tmien stikers kull waħda. Kemm hemm stikers?",
        ),
        math(
          "24 − 6",
          "From 24 stickers, give away 6. How many remain?",
          "Minn 24 stiker, agħti 6. Kemm jibqa’?",
        ),
        math(
          "18 ÷ 3",
          "Share 18 stickers equally between 3 friends. How many each?",
          "Aqsam 18-il stiker indaqs bejn 3 ħbieb. Kemm jieħu kull wieħed?",
        ),
        math(
          "4 × 7 − 5",
          "Four packs contain 7 cards each. Give away 5 cards. How many remain?",
          "Erba’ pakketti fihom 7 karti kull wieħed. Agħti 5 karti. Kemm jibqa’?",
        ),
        math(
          "30 ÷ 5 + 2",
          "Share 30 pencils equally between 5 children. Each then receives 2 more. How many does each have?",
          "Aqsam 30 lapes indaqs bejn 5 itfal. Kull wieħed jieħu 2 oħra. Kemm għandu kull wieħed?",
        ),
        math(
          "6 × 4 − 9",
          "Six trays have 4 cakes each. Nine cakes are eaten. How many remain?",
          "Sitt tilari fihom 4 kejkijiet kull wieħed. Jittieklu 9. Kemm jibqa’?",
        ),
      ];
    case "DATA":
      return [
        math(
          "4 + 6 + 8",
          "Find the total of 4, 6 and 8.",
          "Sib it-total ta’ 4, 6 u 8.",
        ),
        math(
          "18 ÷ 3",
          "The total of 4, 6 and 8 is 18. Find their mean.",
          "It-total ta’ 4, 6 u 8 huwa 18. Sib il-medja.",
        ),
        math(
          "8 − 4",
          "Find the range of 4, 6 and 8.",
          "Sib il-firxa ta’ 4, 6 u 8.",
        ),
        math(
          "6 + 10 + 14",
          "Find the total of 6, 10 and 14.",
          "Sib it-total ta’ 6, 10 u 14.",
        ),
        math(
          "30 ÷ 3",
          "The total is 30 for 3 values. Find the mean.",
          "It-total ta’ 3 valuri huwa 30. Sib il-medja.",
        ),
        math(
          "14 − 6",
          "Find the range of 6, 10 and 14.",
          "Sib il-firxa ta’ 6, 10 u 14.",
        ),
        math(
          "5 + 7 + 9",
          "Find the total of the data values 5, 7 and 9.",
          "Sib it-total tal-valuri 5, 7 u 9.",
        ),
        math(
          "21 ÷ 3",
          "Find the mean of 5, 7 and 9.",
          "Sib il-medja ta’ 5, 7 u 9.",
        ),
        math(
          "9 − 5",
          "Find the range of 5, 7 and 9.",
          "Sib il-firxa ta’ 5, 7 u 9.",
        ),
      ];
    default:
      return [];
  }
}

function languagePractice(topic: Topic): Exercise[] {
  const english = topic.subject === "english";
  if (topic.id.endsWith("READING")) {
    const en =
      "A school garden club planned to plant seeds on Saturday. A notice said the meeting would begin at 10 o’clock beside the library. Each pupil needed to bring a small pot. In the morning it rained, so the teacher moved the activity indoors. The pupils filled their pots with soil, planted seeds and added a little water. Before leaving, they wrote labels so they could remember which seeds they had planted. The teacher explained that the pots would need care over the coming weeks.";
    const mt =
      "Grupp ta’ tfal ippjana li jiżra’ ż-żrieragħ is-Sibt. Avviż qal li l-laqgħa kellha tibda fl-għaxra ħdejn il-librerija. Kull tifel u tifla kellhom iġibu qasrija żgħira. Filgħodu għamlet ix-xita, għalhekk l-għalliema mexxiet l-attività ġewwa. It-tfal imlew il-qsari bil-ħamrija, żergħu ż-żrieragħ u żiedu ftit ilma. Qabel telqu, kitbu tikketti biex jiftakru x’kienu żergħu. L-għalliema spjegat li kellhom jieħdu ħsieb il-qsari fil-ġimgħat ta’ wara.";
    const passage = english ? en : mt;
    const rows: [
      string,
      string,
      string,
      string[],
      string,
      string,
      string[]?,
    ][] = english
      ? [
          [
            "On which day was the activity planned?",
            "Għal liema jum kienet ippjanata l-attività?",
            "Saturday",
            ["Monday", "Saturday", "Friday"],
            "The first sentence names Saturday. Use that explicit detail.",
            "L-ewwel sentenza ssemmi Saturday. Uża dak it-tagħrif ċar.",
          ],
          [
            "At what time would the meeting begin?",
            "X’ħin kellha tibda l-laqgħa?",
            "10 o’clock",
            ["9 o’clock", "11 o’clock", "10 o’clock"],
            "The notice gives the time as 10 o’clock.",
            "L-avviż jagħti l-ħin: 10 o’clock.",
            ["10", "10 am"],
          ],
          [
            "What did each pupil need to bring?",
            "X’kellu jġib kull tifel jew tifla?",
            "a small pot",
            ["a small pot", "a book", "a bicycle"],
            "The notice asks every pupil to bring a small pot.",
            "L-avviż jitlob lil kull tifel jew tifla jġibu qasrija żgħira.",
            ["pot", "a pot"],
          ],
          [
            "Why did the teacher move the activity indoors?",
            "Għaliex l-għalliema mexxiet l-attività ġewwa?",
            "it rained",
            ["it was dark", "it rained", "it was Sunday"],
            "The rain is the stated reason for moving inside. Link the cause to the change.",
            "Ix-xita hija r-raġuni msemmija biex marru ġewwa. Qabbad il-kawża mal-bidla.",
            ["rain", "because it rained"],
          ],
          [
            "What went into the pots before the seeds?",
            "X’poġġew fil-qsari qabel iż-żrieragħ?",
            "soil",
            ["water", "labels", "soil"],
            "The order is soil first, then seeds, then a little water.",
            "L-ordni hija ħamrija, żrieragħ, imbagħad ftit ilma.",
          ],
          [
            "Why did the pupils write labels?",
            "Għaliex it-tfal kitbu t-tikketti?",
            "to remember the seeds",
            ["to dry the pots", "to remember the seeds", "to stop the rain"],
            "The passage states that labels helped them remember which seeds were planted.",
            "Is-silta tgħid li t-tikketti għenuhom jiftakru liema żrieragħ żergħu.",
            ["remember which seeds they planted"],
          ],
          [
            "Which word in the passage means a message giving information?",
            "Liema kelma fis-silta tfisser messaġġ li jagħti tagħrif?",
            "notice",
            ["notice", "soil", "care"],
            "A notice is a written message giving information about the meeting.",
            "Notice huwa messaġġ miktub li jagħti tagħrif dwar il-laqgħa.",
          ],
          [
            "Which event happened last: filling pots, planting seeds, or writing labels?",
            "X’ġara l-aħħar: filling pots, planting seeds, jew writing labels?",
            "writing labels",
            ["planting seeds", "writing labels", "filling pots"],
            "Follow the sequence. The labels were written before the pupils left, after planting.",
            "Segwi l-ordni. It-tikketti nkitbu qabel telqu, wara li żergħu.",
          ],
          [
            "What is the main purpose of this passage?",
            "X’inhu l-għan ewlieni ta’ din is-silta?",
            "describe a planting activity",
            [
              "sell a bicycle",
              "describe a planting activity",
              "give a weather forecast",
            ],
            "Most details describe the garden club’s planting activity, so that is the main focus.",
            "Il-biċċa l-kbira tad-dettalji huma dwar l-attività taż-żrigħ. Dak huwa l-għan ewlieni.",
          ],
        ]
      : [
          [
            "On which day was the activity planned?",
            "Għal liema jum kienet ippjanata l-attività?",
            "is-Sibt",
            ["it-Tnejn", "is-Sibt", "il-Ġimgħa"],
            "The opening sentence names Saturday.",
            "L-ewwel sentenza ssemmi s-Sibt.",
            ["Sibt"],
          ],
          [
            "When would the meeting begin?",
            "X’ħin kellha tibda l-laqgħa?",
            "fl-għaxra",
            ["fid-disgħa", "fil-ħdax", "fl-għaxra"],
            "The notice names ten o’clock.",
            "L-avviż isemmi l-għaxra.",
            ["għaxra", "10"],
          ],
          [
            "What did each pupil need to bring?",
            "X’kellu jġib kull tifel jew tifla?",
            "qasrija żgħira",
            ["qasrija żgħira", "ktieb", "rota"],
            "The pupils had to bring a small pot.",
            "It-tfal kellhom iġibu qasrija żgħira.",
            ["qasrija"],
          ],
          [
            "Why was the activity moved inside?",
            "Għaliex mexxew l-attività ġewwa?",
            "għamlet ix-xita",
            ["kien dlam", "għamlet ix-xita", "kien il-Ħadd"],
            "Rain caused the move indoors.",
            "Ix-xita kienet ir-raġuni biex marru ġewwa.",
            ["ix-xita", "xita"],
          ],
          [
            "What did they put in the pots before the seeds?",
            "X’poġġew fil-qsari qabel iż-żrieragħ?",
            "ħamrija",
            ["ilma", "tikketti", "ħamrija"],
            "They filled the pots with soil before planting.",
            "Imlew il-qsari bil-ħamrija qabel żergħu.",
            ["il-ħamrija"],
          ],
          [
            "Why did they write labels?",
            "Għaliex kitbu t-tikketti?",
            "biex jiftakru x’żergħu",
            [
              "biex jinxfu l-qsari",
              "biex jiftakru x’żergħu",
              "biex tieqaf ix-xita",
            ],
            "Labels help remember the kinds of seeds.",
            "It-tikketti jgħinuhom jiftakru liema żrieragħ żergħu.",
          ],
          [
            "Which word refers to a message giving information?",
            "Liema kelma tirreferi għal messaġġ li jagħti tagħrif?",
            "avviż",
            ["avviż", "ħamrija", "qasrija"],
            "A notice gives information about the meeting.",
            "Avviż jagħti tagħrif dwar il-laqgħa.",
          ],
          [
            "What did they do last: fill pots, plant seeds, or write labels?",
            "X’għamlu l-aħħar: imlew il-qsari, żergħu ż-żrieragħ, jew kitbu t-tikketti?",
            "kitbu t-tikketti",
            ["żergħu ż-żrieragħ", "kitbu t-tikketti", "imlew il-qsari"],
            "Labels came after planting and before leaving.",
            "It-tikketti ġew wara ż-żrigħ u qabel telqu.",
          ],
          [
            "What is this passage mainly about?",
            "Dwar xiex hija prinċipalment din is-silta?",
            "attività taż-żrigħ",
            ["bejgħ ta’ rota", "attività taż-żrigħ", "tbassir tat-temp"],
            "The main subject is planting seeds with the club.",
            "Is-suġġett ewlieni huwa ż-żrigħ taż-żrieragħ mal-grupp.",
          ],
        ];
    return rows.map(([qEn, qMt, answer, choices, wEn, wMt, aliases]) => ({
      ...word(
        `Read: '${passage}' ${qEn}`,
        `Aqra: '${passage}' ${qMt}`,
        answer,
        choices,
        wEn,
        wMt,
        aliases,
      ),
      passage,
    }));
  }
  if (!english)
    return [
      word(
        "Find the action word in 'It-tifla tikteb ittra'.",
        "Sib il-verb f’'It-tifla tikteb ittra'.",
        "tikteb",
        ["tifla", "tikteb", "ittra"],
        "Tikteb tells us what the girl does.",
        "Tikteb tgħid x’tagħmel it-tifla.",
      ),
      word(
        "What is the plural of tifel?",
        "X’inhu l-plural ta’ tifel?",
        "tfal",
        ["tfal", "tifels", "tfiel"],
        "The established plural of tifel is tfal.",
        "Il-plural ta’ tifel huwa tfal.",
      ),
      word(
        "Which word describes the book in 'ktieb ġdid'?",
        "Liema kelma tiddeskrivi l-ktieb fil-frażi 'ktieb ġdid'?",
        "ġdid",
        ["ktieb", "ġdid", "il"],
        "Ġdid describes the book as new.",
        "Ġdid tiddeskrivi l-ktieb.",
      ),
      word(
        "Find the noun in 'Il-kelb jiġri'.",
        "Sib in-nom f’'Il-kelb jiġri'.",
        "kelb",
        ["jiġri", "kelb", "il"],
        "Kelb names the animal; jiġri gives the action.",
        "Kelb isemmi l-annimal; jiġri juri l-azzjoni.",
        ["il-kelb"],
      ),
      word(
        "What is the plural of ktieb?",
        "X’inhu l-plural ta’ ktieb?",
        "kotba",
        ["ktiebi", "kotba", "ktiebijiet"],
        "The plural of ktieb is kotba.",
        "Il-plural ta’ ktieb huwa kotba.",
      ),
      word(
        "Find the action in 'It-tfal jilagħbu'.",
        "Sib il-verb f’'It-tfal jilagħbu'.",
        "jilagħbu",
        ["tfal", "it", "jilagħbu"],
        "Jilagħbu tells what the children do.",
        "Jilagħbu tgħid x’jagħmlu t-tfal.",
      ),
      word(
        "Find the describing word in 'dar kbira'.",
        "Sib l-aġġettiv fil-frażi 'dar kbira'.",
        "kbira",
        ["kbira", "dar", "il"],
        "Kbira describes the size of the house.",
        "Kbira tiddeskrivi d-daqs tad-dar.",
      ),
      word(
        "Give the plural of dar.",
        "Agħti l-plural ta’ dar.",
        "djar",
        ["dari", "darijiet", "djar"],
        "Dar becomes djar in the plural.",
        "Il-plural ta’ dar huwa djar.",
      ),
      word(
        "Identify the verb in 'L-għalliem jispjega'.",
        "Agħżel il-verb f’'L-għalliem jispjega'.",
        "jispjega",
        ["għalliem", "jispjega", "l"],
        "Jispjega is the action of explaining.",
        "Jispjega huwa l-verb li juri l-azzjoni.",
      ),
    ];
  const y = topic.year;
  const prompts =
    y === 4
      ? [
          [
            "In 'The girl opens the door', choose the verb.",
            "opens",
            ["girl", "opens", "door"],
            "Opens names the action.",
          ],
          [
            "Choose the noun: gently, school, or cheerful.",
            "school",
            ["gently", "school", "cheerful"],
            "School names a place.",
          ],
          [
            "In 'a blue bag', choose the describing word.",
            "blue",
            ["a", "bag", "blue"],
            "Blue describes the bag.",
          ],
          [
            "Choose the action in 'Birds fly'.",
            "fly",
            ["Birds", "fly", "the"],
            "Fly describes what birds do.",
          ],
          [
            "Choose the noun: apple, fast, or swim.",
            "apple",
            ["fast", "apple", "swim"],
            "Apple names a thing.",
          ],
          [
            "Find the adjective in 'a tall tree'.",
            "tall",
            ["tall", "tree", "a"],
            "Tall describes the height of the tree.",
          ],
          [
            "Identify the verb in 'Mia closes the window'.",
            "closes",
            ["Mia", "window", "closes"],
            "Closes tells what Mia does.",
          ],
          [
            "Which word names a thing: desk, quietly, or happy?",
            "desk",
            ["happy", "desk", "quietly"],
            "Desk names a thing.",
          ],
          [
            "Identify the adjective in 'the quiet room'.",
            "quiet",
            ["quiet", "room", "the"],
            "Quiet describes the room.",
          ],
        ]
      : y === 5
        ? [
            [
              "Complete: Yesterday, I ___ a letter.",
              "wrote",
              ["write", "wrote", "writing"],
              "Yesterday needs past tense; write becomes wrote.",
            ],
            [
              "Choose the adverb in 'The boy speaks clearly'.",
              "clearly",
              ["boy", "speaks", "clearly"],
              "Clearly tells how he speaks.",
            ],
            [
              "Complete: The dog ___ sleeping.",
              "is",
              ["are", "is", "were"],
              "One dog takes is in this present-tense sentence.",
            ],
            [
              "Complete: Last week, we ___ a new book.",
              "bought",
              ["bought", "buy", "buying"],
              "Bought is the past tense of buy.",
            ],
            [
              "Which word tells how in 'She waited patiently'?",
              "patiently",
              ["She", "waited", "patiently"],
              "Patiently describes how she waited.",
            ],
            [
              "Complete: The birds ___ flying.",
              "are",
              ["is", "are", "was"],
              "The plural birds takes are.",
            ],
            [
              "Complete: Yesterday, Ben ___ to the park.",
              "went",
              ["go", "going", "went"],
              "Went is the past tense of go.",
            ],
            [
              "Identify the adverb in 'The rain fell heavily'.",
              "heavily",
              ["heavily", "rain", "fell"],
              "Heavily tells how the rain fell.",
            ],
            [
              "Complete: The two children ___ ready.",
              "are",
              ["is", "was", "are"],
              "Two children is plural and takes are.",
            ],
          ]
        : [
            [
              "Join: I wore a coat ___ it was cold.",
              "because",
              ["because", "or", "but"],
              "Because introduces the reason.",
            ],
            [
              "Give the plural of mouse.",
              "mice",
              ["mouses", "mice", "mouse"],
              "Mouse has the irregular plural mice.",
            ],
            [
              "Choose a synonym for tired.",
              "weary",
              ["fresh", "weary", "tiny"],
              "Weary means tired.",
            ],
            [
              "Join: It rained, ___ we stayed indoors.",
              "so",
              ["or", "so", "although"],
              "So introduces the result of the rain.",
            ],
            [
              "Give the plural of tooth.",
              "teeth",
              ["tooths", "tooth", "teeth"],
              "Tooth becomes teeth in the plural.",
            ],
            [
              "Choose a synonym for happy.",
              "glad",
              ["sad", "glad", "quiet"],
              "Glad means happy.",
            ],
            [
              "Join: I wanted to play, ___ I had homework.",
              "but",
              ["because", "or", "but"],
              "But connects contrasting ideas.",
            ],
            [
              "Give the plural of foot.",
              "feet",
              ["feet", "foots", "foot"],
              "Foot becomes feet in the plural.",
            ],
            [
              "Choose a synonym for tiny.",
              "small",
              ["huge", "small", "noisy"],
              "Small means little in size, like tiny.",
            ],
          ];
  return prompts.map(([q, a, c, w]) =>
    word(
      q as string,
      `Aħdem fuq din is-sentenza bl-Ingliż: ${q}`,
      a as string,
      c as string[],
      w as string,
      w as string,
    ),
  );
}

function sciencePractice(topic: Topic): Exercise[] {
  const rows = topic.id.endsWith("PLANTS")
    ? [
        [
          "What protects a seed?",
          "X’jipproteġi żerriegħa?",
          "seed coat",
          ["seed coat", "petal", "pot"],
          "The seed coat is the protective outer covering.",
          "Il-qoxra taż-żerriegħa hija l-kisja li tipproteġiha.",
          ["qoxra", "il-qoxra"],
        ],
        [
          "Which does a seed commonly need to germinate?",
          "X’għandha bżonn ġeneralment żerriegħa biex tiġġermina?",
          "water",
          ["dry sand only", "water", "paint"],
          "Water helps a seed start germinating when other conditions are suitable.",
          "L-ilma jgħin żerriegħa tibda tiġġermina meta l-kundizzjonijiet l-oħra jkunu tajbin.",
          ["ilma"],
        ],
        [
          "Which gas do green leaves use to make sugars?",
          "Liema gass juża l-weraq aħdar biex jagħmel zokkor?",
          "carbon dioxide",
          ["helium", "oxygen", "carbon dioxide"],
          "Green leaves use carbon dioxide and water with light energy to make sugars.",
          "Il-weraq aħdar juża d-dijossidu tal-karbonju u l-ilma bl-enerġija tad-dawl biex jagħmel zokkor.",
          ["dijossidu tal-karbonju"],
        ],
        [
          "Which part commonly helps attract pollinators?",
          "Liema parti ġeneralment tgħin tiġbed pollinaturi?",
          "petals",
          ["roots", "petals", "stem"],
          "Petals can help attract pollinators through colour and scent.",
          "Il-petali jistgħu jiġbdu pollinaturi bil-kulur u r-riħa.",
          ["petali"],
        ],
        [
          "Which part supports leaves above the soil?",
          "Liema parti ssostni l-weraq fuq il-ħamrija?",
          "stem",
          ["stem", "seed coat", "petal"],
          "The stem supports the above-ground parts and carries water through the plant.",
          "Iz-zokk isostni l-partijiet fuq il-ħamrija u jwassal l-ilma fil-pjanta.",
          ["zokk", "iz-zokk"],
        ],
        [
          "What does a young seedling grow from?",
          "Minn xiex tikber pjanta żgħira ġdida?",
          "seed",
          ["flowerpot", "seed", "stone"],
          "A seed contains a young plant that can begin growing.",
          "Żerriegħa fiha pjanta żgħira li tista’ tibda tikber.",
          ["żerriegħa"],
        ],
        [
          "A plant is short of water. Which part absorbs water from soil?",
          "Pjanta għandha bżonn ilma. Liema parti tassorbi ilma mill-ħamrija?",
          "roots",
          ["petals", "fruit", "roots"],
          "Roots absorb water from soil.",
          "L-għeruq jassorbu l-ilma mill-ħamrija.",
          ["għeruq"],
        ],
        [
          "What energy source do green leaves usually need for photosynthesis?",
          "Liema sors ta’ enerġija għandu bżonn il-weraq aħdar għall-fotosinteżi?",
          "light",
          ["light", "paint", "sound"],
          "Photosynthesis uses light energy.",
          "Il-fotosinteżi tuża l-enerġija tad-dawl.",
          ["dawl"],
        ],
        [
          "Which structure can contain seeds?",
          "Liema parti tista’ jkun fiha żrieragħ?",
          "fruit",
          ["stem", "fruit", "root"],
          "Fruits develop from flowers and can contain seeds.",
          "Il-frott jiżviluppa mill-fjuri u jista’ jkun fih żrieragħ.",
          ["frott"],
        ],
      ]
    : topic.id.endsWith("MATERIALS")
      ? [
          [
            "Water takes the shape of a cup. Which state is it?",
            "L-ilma jieħu l-forma ta’ tazza. F’liema stat huwa?",
            "liquid",
            ["solid", "gas", "liquid"],
            "A liquid takes the container’s shape but keeps its volume.",
            "Likwidu jieħu l-forma tal-kontenitur iżda jżomm il-volum.",
            ["likwidu"],
          ],
          [
            "Air spreads to fill a container. Which state is it?",
            "L-arja timla l-ispazju ta’ kontenitur. F’liema stat hija?",
            "gas",
            ["liquid", "gas", "solid"],
            "A gas spreads to fill the available space.",
            "Gass jinfirex fl-ispazju disponibbli.",
            ["gass"],
          ],
          [
            "Ice changes into liquid water by which process?",
            "Is-silġ jinbidel f’ilma likwidu permezz ta’ liema proċess?",
            "melting",
            ["melting", "freezing", "cutting"],
            "Melting changes a solid into a liquid.",
            "It-tidwib ibiddel solidu f’likwidu.",
            ["tidwib"],
          ],
          [
            "A puddle slowly dries. Which change is occurring?",
            "Għadira ilma tinxef bil-mod. Liema bidla qed isseħħ?",
            "evaporation",
            ["freezing", "evaporation", "bending"],
            "Evaporation changes liquid water into water vapour.",
            "L-evaporazzjoni tbiddel ilma likwidu fi fwar tal-ilma.",
            ["evaporazzjoni"],
          ],
          [
            "Which object is usually attracted by a magnet?",
            "Liema oġġett ġeneralment jinġibed lejn kalamita?",
            "iron nail",
            ["glass cup", "wooden spoon", "iron nail"],
            "Iron is magnetic, unlike ordinary wood and glass.",
            "Il-ħadid huwa manjetiku, filwaqt li injam u ħġieġ ordinarji mhumiex.",
            ["musmar tal-ħadid"],
          ],
          [
            "Water vapour cooling into droplets is which process?",
            "Fwar tal-ilma jiksaħ u jsir qtar. Liema proċess huwa?",
            "condensation",
            ["condensation", "melting", "freezing"],
            "Condensation changes a gas into a liquid.",
            "Il-kondensazzjoni tbiddel gass f’likwidu.",
            ["kondensazzjoni"],
          ],
          [
            "Which state normally has its own shape and volume?",
            "Liema stat ġeneralment iżomm il-forma u l-volum tiegħu?",
            "solid",
            ["gas", "solid", "liquid"],
            "A solid normally keeps its own shape and volume.",
            "Solidu ġeneralment iżomm il-forma u l-volum tiegħu.",
            ["solidu"],
          ],
          [
            "Liquid water turns into ice. Name the change.",
            "Ilma likwidu jsir silġ. X’jissejjaħ dan il-proċess?",
            "freezing",
            ["melting", "freezing", "evaporation"],
            "Freezing changes liquid water into solid ice.",
            "L-iffriżar ibiddel ilma likwidu f’silġ solidu.",
            ["iffriżar"],
          ],
          [
            "Which material is usually not attracted by a magnet?",
            "Liema materjal ġeneralment ma jinġibidx lejn kalamita?",
            "wood",
            ["iron", "steel", "wood"],
            "Ordinary wood is not attracted by a magnet.",
            "Injam ordinarju ma jinġibidx lejn kalamita.",
            ["injam"],
          ],
        ]
      : [
          [
            "What does a battery supply to a simple circuit?",
            "X’tipprovdi batterija lil ċirkwit sempliċi?",
            "energy",
            ["energy", "soil", "water"],
            "A battery supplies energy to the circuit.",
            "Batterija tipprovdi l-enerġija liċ-ċirkwit.",
            ["enerġija"],
          ],
          [
            "What must a switch do for the bulb to light?",
            "X’għandu jagħmel swiċċ biex tixgħel il-bozza?",
            "close the circuit",
            ["remove the battery", "close the circuit", "break the wire"],
            "A closed switch completes the conducting path.",
            "Swiċċ magħluq jagħlaq il-mogħdija konduttriċi.",
            ["jagħlaq iċ-ċirkwit"],
          ],
          [
            "Which material is an electrical insulator?",
            "Liema materjal huwa iżolatur elettriku?",
            "plastic",
            ["copper", "plastic", "iron"],
            "Plastic usually does not allow electric current through easily.",
            "Il-plastik ġeneralment ma jħallix il-kurrent elettriku jgħaddi faċilment.",
            ["plastik"],
          ],
          [
            "Why are ordinary wires covered with plastic?",
            "Għaliex wajers ordinarji jkunu miksija bil-plastik?",
            "for insulation",
            ["to make electricity", "for insulation", "to attract magnets"],
            "Plastic insulation helps prevent unwanted contact with the conductor.",
            "Il-kisi tal-plastik jgħin jevita kuntatt mhux mixtieq mal-konduttur.",
            ["għall-iżolament"],
          ],
          [
            "Which source is suitable for a supervised classroom circuit model?",
            "Liema sors huwa adattat għal mudell ta’ ċirkwit taħt superviżjoni fil-klassi?",
            "low-voltage battery",
            ["mains socket", "low-voltage battery", "broken plug"],
            "Use an approved low-voltage classroom model under adult supervision; never mains electricity.",
            "Uża mudell tal-klassi approvat b’vultaġġ baxx taħt superviżjoni ta’ adult; qatt tuża l-elettriku tal-mejns.",
            ["batterija b’vultaġġ baxx"],
          ],
          [
            "What does opening a switch do to a simple series circuit?",
            "X’jagħmel swiċċ miftuħ f’ċirkwit sempliċi f’serje?",
            "breaks the path",
            ["breaks the path", "adds energy", "makes light"],
            "Opening the switch breaks the conducting path.",
            "Meta tiftaħ is-swiċċ, tinkiser il-mogħdija konduttriċi.",
            ["jaqta’ l-mogħdija"],
          ],
          [
            "A wire is disconnected in a simple series circuit. What happens to the bulb?",
            "Wajer jinqala’ f’ċirkwit sempliċi f’serje. X’jiġri lill-bozza?",
            "goes out",
            ["gets brighter", "goes out", "grows"],
            "The broken path stops the current and the bulb goes out.",
            "Il-mogħdija maqtugħa twaqqaf il-kurrent u l-bozza tintefa.",
            ["tintefa"],
          ],
          [
            "Which material is a good electrical conductor?",
            "Liema materjal huwa konduttur elettriku tajjeb?",
            "copper",
            ["rubber", "plastic", "copper"],
            "Copper allows electric current to pass through easily.",
            "Ir-ram iħalli l-kurrent elettriku jgħaddi faċilment.",
            ["ram"],
          ],
          [
            "What does a working simple circuit need?",
            "X’għandu bżonn ċirkwit sempliċi biex jaħdem?",
            "complete conducting path",
            ["a complete break", "complete conducting path", "only a bulb"],
            "A complete conducting path and an energy source are needed.",
            "Hemm bżonn mogħdija konduttriċi sħiħa u sors ta’ enerġija.",
            ["mogħdija konduttriċi sħiħa"],
          ],
        ];
  return rows.map(([en, mt, a, c, wEn, wMt, aliases]) =>
    word(
      en as string,
      mt as string,
      a as string,
      c as string[],
      wEn as string,
      wMt as string,
      aliases as string[],
    ),
  );
}

// Original preparation activities; past-paper equivalence and complete outcome
// coverage must be reviewed separately. A topic check is not a school exam grade.
export function prepareTopic(topic: Topic): Topic {
  const extra =
    topic.subject === "maths"
      ? mathsPractice(topic)
      : topic.subject === "science"
        ? sciencePractice(topic)
        : languagePractice(topic);
  if (!extra.length) return topic;
  return {
    ...topic,
    legacySteps: topic.exercises.length,
    exercises: [
      ...topic.exercises,
      ...extra.map((e, i) => ({
        ...e,
        stage:
          i >= extra.length - 3 ? ("check" as const) : ("practice" as const),
      })),
    ],
  };
}
