"use client";
import { useState } from "react";
import type { Activity } from "@/lib/learning-coach";

export function LearningActivity({
  activity,
  language,
  disabled,
  onAnswer,
}: {
  activity: Activity;
  language: "en" | "mt";
  disabled: boolean;
  onAnswer: (text: string) => void;
}) {
  const mt = language === "mt";
  const pair = (en: string, maltese: string) => (mt ? maltese : en);
  const [amounts, setAmounts] = useState<number[]>(
    activity.kind === "sharing" ? Array(activity.groups).fill(0) : [],
  );
  const [marked, setMarked] = useState<number[]>([]);
  const [position, setPosition] = useState(
    activity.kind === "number-line" ? activity.start : 0,
  );
  const [answer, setAnswer] = useState("");
  const [draw, setDraw] = useState(false);
  const [strokes, setStrokes] = useState<string[]>([]);
  const [drawing, setDrawing] = useState(false);
  const [plantPart, setPlantPart] = useState("roots");
  const [closed, setClosed] = useState(false);
  const [particleState, setParticleState] = useState("solid");
  const toggle = (index: number) =>
    setMarked((old) =>
      old.includes(index) ? old.filter((n) => n !== index) : [...old, index],
    );
  const pointer = (e: React.PointerEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    return `${Math.round(((e.clientX - rect.left) * 300) / rect.width)},${Math.round(((e.clientY - rect.top) * 160) / rect.height)}`;
  };
  return (
    <section
      className="learning-activity"
      aria-label={pair("Explore the question", "Esplora l-mistoqsija")}
    >
      <h3>{pair("Try it with a picture", "Ipprova bit-tpinġija")}</h3>
      {activity.kind === "scene" && (
        <>
          <p>
            Explore the garden picture. Select an object to describe it.{" "}
            {activity.compare
              ? "Compare the sunny and rainy scenes."
              : "Use position words and explain what is happening."}
          </p>
          {[false, ...(activity.compare ? [true] : [])].map((rain, index) => (
            <div key={index}>
              <strong>Picture {rain ? "B: rain" : "A: sunshine"}</strong>
              <svg
                className="garden-scene"
                viewBox="0 0 300 180"
                role="img"
                aria-label={
                  rain
                    ? "Rainy garden: plant on table left, tree right, watering can underneath, child carrying umbrella"
                    : "Sunny garden: plant on table left, tree right, watering can underneath, child watering plant"
                }
              >
                <rect
                  width="300"
                  height="180"
                  fill={rain ? "#d8e0e9" : "#d9f0f7"}
                />
                <rect y="145" width="300" height="35" fill="#92b782" />
                {rain ? (
                  <>
                    <path
                      d="M25 25l-6 14 M65 45l-6 14 M125 15l-6 14 M180 45l-6 14 M275 25l-6 14"
                      stroke="#678da6"
                      strokeWidth="3"
                    />
                    <path d="M85 67q35-50 70 0z" fill="#ae87b8" />
                    <path d="M120 67v35" stroke="#604770" strokeWidth="3" />
                  </>
                ) : (
                  <circle cx="35" cy="30" r="18" fill="#f1ca58" />
                )}
                <rect x="220" y="60" width="15" height="85" fill="#8c6849" />
                <circle cx="228" cy="52" r="35" fill="#4f8352" />
                <rect x="27" y="108" width="72" height="7" fill="#8c6849" />
                <path
                  d="M36 115v30 M88 115v30"
                  stroke="#8c6849"
                  strokeWidth="5"
                />
                <path d="M52 107l-7-20h29l-7 20z" fill="#b87656" />
                <path
                  d="M60 87v-28 M60 77q-22-3-16-14 M60 70q22-3 16-14"
                  fill="#4f8352"
                  stroke="#4f8352"
                  strokeWidth="4"
                />
                <circle cx="130" cy="88" r="12" fill="#b88968" />
                <path
                  d="M130 102v25 M130 112l-27-12 M130 112l20 8 M130 127l-11 20 M130 127l12 20"
                  stroke="#4f6685"
                  strokeWidth="8"
                  strokeLinecap="round"
                />
                {!rain && (
                  <>
                    <path d="M101 98l-23-9" stroke="#759ca4" strokeWidth="9" />
                    <path d="M79 88l-15-10" stroke="#6da6c5" strokeWidth="2" />
                  </>
                )}
                <path
                  d="M220 140h20v12h-20z M240 143l13-8 M220 144q-10-12 0-12"
                  fill="#759ca4"
                  stroke="#759ca4"
                  strokeWidth="3"
                />
              </svg>
            </div>
          ))}
          <div className="word-cards">
            {["plant", "tree", "watering can", "child"].map((object, i) => (
              <button
                key={object}
                type="button"
                aria-pressed={marked.includes(i)}
                onClick={() => {
                  setMarked([i]);
                  setAnswer(`The ${object} `);
                }}
              >
                {object}
              </button>
            ))}
          </div>
          {marked.length > 0 && (
            <p>
              {
                [
                  "The plant is on the table, on the left.",
                  "The tree is on the right.",
                  "The watering can is under the tree.",
                  activity.compare
                    ? "The child waters the plant in A and carries an umbrella in B."
                    : "The child is watering the plant.",
                ][marked[0]]
              }
            </p>
          )}
        </>
      )}
      {activity.kind === "fraction-bar" && (
        <>
          <p>
            One whole is split into {activity.denominator} equal parts. Tap{" "}
            {activity.numerator} parts to model the fraction. Equal parts can
            split a whole; these are not indivisible counters.
          </p>
          <div className="fraction-bar">
            {Array.from({ length: activity.denominator }, (_, i) => (
              <button
                type="button"
                key={i}
                aria-label={`Fraction part ${i + 1}`}
                aria-pressed={marked.includes(i)}
                onClick={() => toggle(i)}
              >
                {marked.includes(i) ? "●" : "○"}
              </button>
            ))}
          </div>
          <p>
            {marked.length} / {activity.denominator} selected
          </p>
        </>
      )}
      {activity.kind === "reading" && (
        <>
          <p>
            {pair(
              "Tap words to highlight the evidence for your answer. Read the passage again and check which details support it.",
              "Agħfas il-kliem biex timmarka l-ħjiel għat-tweġiba. Erġa’ aqra s-silta u sib liema dettalji jsostnuha.",
            )}
          </p>
          <div className="evidence-passage">
            {activity.passage.split(/\s+/).map((text, index) => (
              <button
                type="button"
                key={index}
                aria-pressed={marked.includes(index)}
                className={marked.includes(index) ? "highlighted" : ""}
                onClick={() => toggle(index)}
              >
                {text}
              </button>
            ))}
          </div>
        </>
      )}
      {activity.kind === "plant" && (
        <>
          {activity.seed ? (
            <>
              <p>
                {pair(
                  "Explore a seed. Its coat protects it, and inside are a young plant and a food store.",
                  "Esplora żerriegħa. Il-qoxra tipproteġiha; ġewwa hemm pjanta żgħira u ħażna ta’ ikel.",
                )}
              </p>
              <svg
                viewBox="0 0 240 180"
                role="img"
                aria-label={pair("Seed cross-section", "Żerriegħa minn ġewwa")}
              >
                <ellipse cx="120" cy="90" rx="75" ry="55" fill="#a7774d" />
                <ellipse cx="120" cy="90" rx="64" ry="44" fill="#eed7a0" />
                <path
                  d="M90 115Q110 65 143 65M110 85Q105 65 87 70"
                  fill="none"
                  stroke="#456e52"
                  strokeWidth="10"
                />
              </svg>
              <p>
                {pair(
                  "With suitable air and warmth, water helps germination begin. A seed uses its food store at first; green leaves later make sugars using light.",
                  "Meta jkollha arja u sħana xierqa, l-ilma jgħin tibda l-ġerminazzjoni. Għall-ewwel iż-żerriegħa tuża l-ħażna ta’ ikel tagħha; wara l-weraq aħdar jagħmel zokkor bl-għajnuna tad-dawl.",
                )}
              </p>
            </>
          ) : (
            <>
              <p>
                {pair(
                  "Explore the parts of a plant. Choose a part to see its job.",
                  "Esplora l-partijiet ta’ pjanta. Agħżel parti biex tara x’tagħmel.",
                )}
              </p>
              <svg
                viewBox="0 0 240 180"
                role="img"
                aria-label={pair(
                  "Plant with roots, stem and leaves",
                  "Pjanta bl-għeruq, iz-zokk u l-weraq",
                )}
              >
                <path d="M15 122H225" stroke="#9d7653" strokeWidth="8" />
                <path
                  d="M120 122V30"
                  stroke={plantPart === "stem" ? "#d58b30" : "#456e52"}
                  strokeWidth="9"
                />
                <path
                  d="M120 70C65 20 50 55 120 85M120 55C180 10 200 55 120 75"
                  fill={plantPart === "leaves" ? "#d58b30" : "#78a364"}
                />
                <path
                  d="M120 125V168M120 142L95 166M120 135L143 158M120 150L141 173"
                  stroke={plantPart === "roots" ? "#d58b30" : "#765439"}
                  strokeWidth="6"
                />
              </svg>
              <div className="word-cards">
                {["roots", "stem", "leaves"].map((part) => (
                  <button
                    type="button"
                    key={part}
                    aria-pressed={plantPart === part}
                    onClick={() => setPlantPart(part)}
                  >
                    {mt
                      ? { roots: "Għeruq", stem: "Zokk", leaves: "Weraq" }[
                          part as "roots"
                        ]
                      : part}
                  </button>
                ))}
              </div>
              <p role="status">
                {plantPart === "roots"
                  ? pair(
                      "Roots absorb water and dissolved minerals from soil.",
                      "L-għeruq jassorbu l-ilma u minerali maħlula mill-ħamrija.",
                    )
                  : plantPart === "stem"
                    ? pair(
                        "The stem supports the plant and carries water.",
                        "Iz-zokk isostni l-pjanta u jwassal l-ilma.",
                      )
                    : pair(
                        "Green leaves use light, water and carbon dioxide to make sugars.",
                        "Il-weraq aħdar juża d-dawl, l-ilma u d-dijossidu tal-karbonju biex jagħmel zokkor.",
                      )}
              </p>
            </>
          )}
        </>
      )}
      {activity.kind === "circuit" && (
        <>
          <p>
            {pair(
              "Change the switch in this diagram and predict what happens to the lamp.",
              "Ibdel is-swiċċ f’din it-tpinġija u bassar x’jiġri lill-bozza.",
            )}
          </p>
          <svg
            viewBox="0 0 240 180"
            role="img"
            aria-label={pair(
              closed ? "Closed circuit, lamp on" : "Open circuit, lamp off",
              closed
                ? "Ċirkwit magħluq, bozza mixgħula"
                : "Ċirkwit miftuħ, bozza mitfija",
            )}
          >
            <path
              d="M30 85V35H92M150 35H210V140H30V104"
              fill="none"
              stroke="#456e52"
              strokeWidth="5"
            />
            <path
              d={closed ? "M92 35H150" : "M92 35L145 10"}
              stroke="#456e52"
              strokeWidth="5"
            />
            <path d="M15 85H45M20 104H40" stroke="#456e52" strokeWidth="4" />
            <circle
              cx="210"
              cy="88"
              r="18"
              fill={closed ? "#f0c44e" : "#eee"}
              stroke="#456e52"
              strokeWidth="4"
            />
            <text x="53" y="97" fontSize="12">
              {pair("battery", "batterija")}
            </text>
          </svg>
          <button
            type="button"
            className="button secondary small"
            onClick={() => setClosed(!closed)}
          >
            {closed
              ? pair("Open switch", "Iftaħ is-swiċċ")
              : pair("Close switch", "Agħlaq is-swiċċ")}
          </button>
          <p role="status">
            {closed
              ? pair(
                  "The path is complete. Current can flow and the lamp lights.",
                  "Il-mogħdija hija sħiħa. Il-kurrent jista’ jgħaddi u l-bozza tixgħel.",
                )
              : pair(
                  "The path is broken at the switch. The lamp is off.",
                  "Il-mogħdija hija maqtugħa fis-swiċċ. Il-bozza hija mitfija.",
                )}
          </p>
        </>
      )}
      {activity.kind === "particles" && (
        <>
          <p>
            {pair(
              "Compare simplified particle pictures for the three states.",
              "Qabbel tpinġijiet sempliċi tal-partiċelli fit-tliet stati.",
            )}
          </p>
          <div className="word-cards">
            {["solid", "liquid", "gas"].map((state) => (
              <button
                type="button"
                key={state}
                aria-pressed={particleState === state}
                onClick={() => setParticleState(state)}
              >
                {mt
                  ? { solid: "Solidu", liquid: "Likwidu", gas: "Gass" }[
                      state as "solid"
                    ]
                  : state}
              </button>
            ))}
          </div>
          <svg
            viewBox="0 0 240 180"
            role="img"
            aria-label={pair(
              `${particleState} particle model`,
              `Mudell tal-partiċelli: ${particleState}`,
            )}
          >
            <rect
              x="15"
              y="15"
              width="210"
              height="150"
              fill="white"
              stroke="#a4b69d"
            />
            {Array.from({ length: 12 }, (_, i) => {
              const x =
                particleState === "solid"
                  ? 80 + (i % 4) * 22
                  : particleState === "liquid"
                    ? 38 + ((i * 31) % 165)
                    : 28 + ((i * 71) % 180);
              const y =
                particleState === "solid"
                  ? 85 + Math.floor(i / 4) * 22
                  : particleState === "liquid"
                    ? 110 + ((i * 13) % 42)
                    : 30 + ((i * 41) % 120);
              return <circle key={i} cx={x} cy={y} r="7" fill="#456e52" />;
            })}
          </svg>
          <p role="status">
            {particleState === "solid"
              ? pair(
                  "A solid normally keeps its shape and volume.",
                  "Solidu ġeneralment iżomm il-forma u l-volum tiegħu.",
                )
              : particleState === "liquid"
                ? pair(
                    "A liquid keeps its volume and takes its container’s shape.",
                    "Likwidu jżomm il-volum u jieħu l-forma tal-kontenitur.",
                  )
                : pair(
                    "A gas spreads to fill the available space.",
                    "Gass jinfirex fl-ispazju disponibbli.",
                  )}
          </p>
        </>
      )}
      {activity.kind === "sharing" && (
        <>
          <p>
            {pair(
              `Share ${activity.total} counters between ${activity.groups} equal groups. Add one to every group, then count one group. Tap a group to put one counter back.`,
              `Qassam ${activity.total} oġġett bejn ${activity.groups} gruppi ndaqs. Żid wieħed f’kull grupp, imbagħad għodd grupp wieħed. Agħfas grupp biex tneħħi oġġett wieħed.`,
            )}
          </p>
          <div className="sharing-groups">
            {amounts.map((amount, i) => (
              <button
                key={i}
                type="button"
                aria-label={pair(
                  `Group ${i + 1}: ${amount} counters`,
                  `Grupp ${i + 1}: ${amount} oġġett`,
                )}
                onClick={() =>
                  setAmounts((old) =>
                    old.map((n, j) => (j === i ? Math.max(0, n - 1) : n)),
                  )
                }
              >
                <strong>
                  {pair("Group", "Grupp")} {i + 1}
                </strong>
                <span className="counter-dots" aria-hidden="true">
                  {Array.from({ length: amount }, (_, n) => (
                    <i key={n} />
                  ))}
                </span>
                <span>{amount}</span>
              </button>
            ))}
          </div>
          <p role="status">
            {pair("Counters left", "Oġġetti li fadal")}:{" "}
            {activity.total - amounts.reduce((sum, n) => sum + n, 0)}
          </p>
          <button
            type="button"
            className="button secondary small"
            disabled={amounts.reduce((sum, n) => sum + n, 0) >= activity.total}
            onClick={() =>
              setAmounts((old) => {
                let left = activity.total - old.reduce((sum, n) => sum + n, 0);
                return old.map((n) => (left-- > 0 ? n + 1 : n));
              })
            }
          >
            {pair("Share one to each group", "Żid wieħed f’kull grupp")}
          </button>
        </>
      )}
      {activity.kind === "array" && (
        <>
          <p>
            {pair(
              `Build ${activity.rows} rows of ${activity.columns}. Tap squares to count them, or fill one whole row.`,
              `Agħmel ${activity.rows} ringiela ta’ ${activity.columns}. Agħfas il-kwadri biex tgħoddhom, jew imla ringiela sħiħa.`,
            )}
          </p>
          <div
            className="array-model"
            style={{ gridTemplateColumns: `repeat(${activity.columns}, 1fr)` }}
          >
            {Array.from(
              { length: activity.rows * activity.columns },
              (_, i) => (
                <button
                  key={i}
                  type="button"
                  className={marked.includes(i) ? "filled" : ""}
                  aria-label={pair(`Square ${i + 1}`, `Kwadru ${i + 1}`)}
                  aria-pressed={marked.includes(i)}
                  onClick={() => toggle(i)}
                />
              ),
            )}
          </div>
          <p role="status">
            {pair("Squares counted", "Kwadri magħduda")}: {marked.length}
          </p>
          <button
            type="button"
            className="button secondary small"
            disabled={marked.length === activity.rows * activity.columns}
            onClick={() =>
              setMarked((old) => {
                const row = Array.from(
                  { length: activity.rows },
                  (_, r) => r,
                ).find((r) =>
                  Array.from(
                    { length: activity.columns },
                    (_, c) => r * activity.columns + c,
                  ).some((i) => !old.includes(i)),
                );
                return row === undefined
                  ? old
                  : [
                      ...new Set([
                        ...old,
                        ...Array.from(
                          { length: activity.columns },
                          (_, c) => row * activity.columns + c,
                        ),
                      ]),
                    ];
              })
            }
          >
            {pair("Fill the next row", "Imla r-ringiela li jmiss")}
          </button>
        </>
      )}
      {activity.kind === "number-line" && (
        <>
          <p>
            {pair(
              `Start at ${activity.start}. Move ${Math.abs(activity.change)} ${activity.change >= 0 ? "forward" : "backward"}. Drag the marker and see where you land.`,
              `Ibda minn ${activity.start}. Imxi ${Math.abs(activity.change)} ${activity.change >= 0 ? "’il quddiem" : "lura"}. Mexxi l-marka biex tara fejn tasal.`,
            )}
          </p>
          <label>
            {pair(
              "Position on the number line",
              "Pożizzjoni fuq il-linja tan-numri",
            )}
            <input
              type="range"
              min={
                Math.min(activity.start, activity.start + activity.change) - 1
              }
              max={
                Math.max(activity.start, activity.start + activity.change) + 1
              }
              step={
                Number.isInteger(activity.start) &&
                Number.isInteger(activity.change)
                  ? 1
                  : 0.01
              }
              value={position}
              onChange={(e) => setPosition(Number(e.target.value))}
            />
          </label>
          <output>{position}</output>
        </>
      )}
      {activity.kind === "shape" && (
        <>
          <p>
            {pair(
              "Trace each edge once. Tap an edge to mark that you counted it.",
              "Segwi kull naħa darba. Agħfas naħa biex turi li għaddejtha.",
            )}
          </p>
          <svg
            viewBox="0 0 240 180"
            role="img"
            aria-label={pair("Shape to count", "Forma biex tgħodd")}
          >
            {Array.from({ length: activity.sides }, (_, i) => {
              const p = (n: number) => ({
                x:
                  120 +
                  70 *
                    Math.cos(-Math.PI / 2 + (n * 2 * Math.PI) / activity.sides),
                y:
                  90 +
                  70 *
                    Math.sin(-Math.PI / 2 + (n * 2 * Math.PI) / activity.sides),
              });
              const a = p(i),
                b = p(i + 1);
              return (
                <line
                  key={i}
                  x1={a.x}
                  y1={a.y}
                  x2={b.x}
                  y2={b.y}
                  stroke={marked.includes(i) ? "#d58b30" : "#456e52"}
                  strokeWidth="10"
                  onClick={() => toggle(i)}
                />
              );
            })}
          </svg>
          <div className="edge-buttons">
            {Array.from({ length: activity.sides }, (_, i) => (
              <button
                key={i}
                type="button"
                aria-pressed={marked.includes(i)}
                onClick={() => toggle(i)}
              >
                {pair("Edge", "Naħa")} {i + 1}
              </button>
            ))}
          </div>
          <p role="status">
            {pair("Edges counted", "Naħat magħduda")}: {marked.length}
          </p>
        </>
      )}
      {activity.kind === "choices" && (
        <>
          <p>{activity.question}</p>
          <p>
            {pair(
              "Tap a word card to set it aside. Compare the cards you keep, then write your answer below.",
              "Agħfas karta biex twarrabha. Qabbel il-karti li żżomm, imbagħad ikteb it-tweġiba taħt.",
            )}
          </p>
          <div className="word-cards">
            {activity.choices.map((word, i) => (
              <button
                type="button"
                key={i}
                aria-label={pair(`Set aside ${word}`, `Warrab ${word}`)}
                className={marked.includes(i) ? "eliminated" : ""}
                aria-pressed={marked.includes(i)}
                onClick={() => toggle(i)}
              >
                {word}
              </button>
            ))}
          </div>
        </>
      )}
      <button
        type="button"
        className="text-button"
        onClick={() => setDraw(!draw)}
      >
        {pair("Sketch your idea", "Pinġi l-idea tiegħek")}
      </button>
      {draw && (
        <div className="drawing-pad">
          <svg
            viewBox="0 0 300 160"
            aria-label={pair("Drawing space", "Spazju għat-tpinġija")}
            onPointerDown={(e) => {
              if (strokes.length >= 20) return;
              e.currentTarget.setPointerCapture(e.pointerId);
              setDrawing(true);
              const point = pointer(e);
              setStrokes((old) => [...old, point]);
            }}
            onPointerMove={(e) => {
              if (!drawing) return;
              const point = pointer(e);
              setStrokes((old) =>
                old.map((stroke, i) =>
                  i === old.length - 1 && stroke.length < 6000
                    ? stroke + " " + point
                    : stroke,
                ),
              );
            }}
            onPointerUp={() => setDrawing(false)}
            onPointerCancel={() => setDrawing(false)}
          >
            {strokes.map((stroke, i) => (
              <polyline
                key={i}
                points={stroke}
                fill="none"
                stroke="#456e52"
                strokeWidth="3"
                strokeLinecap="round"
              />
            ))}
          </svg>
          <button
            type="button"
            className="text-button"
            onClick={() => setStrokes([])}
          >
            {pair("Clear drawing", "Ħassar it-tpinġija")}
          </button>
        </div>
      )}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (answer.trim() && !disabled) {
            onAnswer(answer);
            setAnswer("");
          }
        }}
      >
        <label>
          {pair("Answer from activity", "Tweġiba mill-attività")}
          <input
            value={answer}
            maxLength={500}
            onChange={(e) => setAnswer(e.target.value)}
          />
        </label>
        <button className="button small" disabled={disabled || !answer.trim()}>
          {pair("Check my answer", "Iċċekkja t-tweġiba")}
        </button>
      </form>
    </section>
  );
}
