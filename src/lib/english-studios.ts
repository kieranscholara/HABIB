import type { Exercise, Topic } from "./curriculum";

// Original, shortened preparation tasks informed by the 2025 official English
// guidelines. They do not reproduce papers or constitute complete LO coverage.
const garden =
  "Picture A: a sunny school garden. A child waters a plant on a table on the left. A tree is on the right. A watering can is under the tree. Picture B: the same garden in rain; the child carries an umbrella and the plant stays on the table.";
const poem =
  "A little seed sleeps out of sight.\nIt drinks the rain and greets the light.\nIts tiny leaves reach for the sky.\nA bee goes humming softly by.";
const notice =
  "Welcome to the school garden club. We meet on Tuesday after lunch, beside the library. Bring a small notebook. You do not need tools because the teacher provides them. If it rains, meet inside the library instead. Today we will label the plants and draw one leaf. Please leave the flowers for the bees.";
const story =
  "Nina and Sam wanted to help their school garden. On Monday they planted bean seeds in two pots. They put both pots near a bright window, but watered only the first one. After a week, a shoot appeared in the first pot. The second pot still looked dry. Sam thought the second seed needed a bigger pot. Nina suggested checking the water first. They watered it and waited. Two days later, a small shoot appeared. They wrote their observations in a notebook so that they could compare the pots fairly. Their teacher reminded them that one experiment does not prove what happens to every kind of seed. Next time, they would keep the pots, light and seeds the same, and change only the amount of water.";
const open = (
  prompt: string,
  example: string,
  rubric: string[],
  kind: "speaking" | "writing",
  options: Partial<Exercise> = {},
): Exercise => ({
  prompt: { en: prompt, mt: "Agħmel din l-attività bl-Ingliż: " + prompt },
  hint: {
    en: "Start with one idea. Name it, add a useful detail, then explain it in your own words.",
    mt: "Ibda minn idea waħda. Semmiha, żid dettall importanti, u spjegaha bi kliemek.",
  },
  worked: { en: example, mt: "Eżempju bl-Ingliż: " + example },
  answer: "",
  responseMode: "open",
  responseKind: kind,
  taskLanguage: "en",
  rubric: {
    en: rubric,
    mt: rubric.map((criterion) => "Iċċekkja: " + criterion),
  },
  ...options,
});
const sharedRubric = [
  "Respond to the task and its audience",
  "Use relevant details and reasons",
  "Link ideas clearly",
  "Check vocabulary, grammar and punctuation",
];
export const englishStudios: Topic[] = [4, 5, 6].flatMap((year) => {
  const make = (
    skill: string,
    title: string,
    description: string,
    exercises: Exercise[],
  ): Topic => ({
    id: `Y${year}-ENGLISH-${skill}`,
    subject: "english",
    year,
    title: { en: title, mt: title },
    icon: "Aa",
    description,
    exercises,
    sourceRefs: [
      `https://curriculum.gov.mt/wp-content/uploads/2025/04/syllabus_English_yr0${year}_Supporting_document.pdf`,
      ...(skill !== "LITERATURE"
        ? [
            `https://curriculum.gov.mt/wp-content/uploads/2025/05/English_yr0${year}_Annual_Examination_Guidelines.pdf`,
          ]
        : []),
    ],
  });
  const speakingPrompts = [
    "Describe one object in Picture A in one clear sentence.",
    "Describe the position of the plant, the tree and the watering can.",
    "Explain what the child is doing and why the plant might need water.",
    "Describe Picture A in order: start with the scene, then add details.",
    year === 4
      ? "Interview practice: explain which garden job you would choose and give a reason."
      : year === 5
        ? "Inverted interview: ask a gardener two useful questions about caring for plants."
        : "Compare Pictures A and B: describe a similarity and two differences.",
    "Role-play: you are visiting the garden club. Ask politely where to meet and what to bring.",
    "Explain to a new pupil how to look after a classroom plant. Put your instructions in order.",
    "Give an opinion: should a school have a garden club? Support your view with two reasons.",
    "Independent speaking practice: describe the garden, explain what the child is doing, and give a reason why gardens can help pupils learn. Speak in connected sentences, then review the criteria.",
  ];
  const speakingExamples = [
    "The green plant is on the table.",
    "The plant is on the left. The tree is on the right. The watering can is under the tree.",
    "The child is watering the plant. Plants need water to grow.",
    "This is a sunny school garden. A child is watering a plant on a table. A tree gives shade on the right.",
    year === 5
      ? "I would ask the gardener which plants grow well here and how often to water them."
      : year === 6
        ? "Both pictures show the same garden. In Picture A it is sunny and the child waters the plant. In Picture B it rains and the child carries an umbrella."
        : "I would choose watering because I enjoy caring for living things.",
    "Hello. I would like to join the garden club. Please tell me where to meet and what I should bring.",
    "First put the plant in a suitable bright place. Next check whether the soil needs water. Finally write down any changes you notice.",
    "A garden club would help pupils learn about plants. It would also let us work together and care for our school.",
    "This is a sunny garden at school. A pupil waters a plant on the left. There is a tree on the right, with a watering can underneath. A garden lets pupils observe changes in living things and work together.",
  ];
  const speaking = speakingPrompts.map((p, i) =>
    open(
      p,
      speakingExamples[i],
      [
        "Describe the picture accurately",
        "Organise ideas and give reasons",
        "Ask relevant questions and respond politely",
        "An adult should listen to fluency and pronunciation; a transcript cannot assess these",
      ],
      "speaking",
      { scene: year === 6 && i >= 4 ? "compare" : "garden" },
    ),
  );
  const listeningRows: [string, string, string, string[]][] = [
    [
      notice,
      "On which day does the club meet?",
      "Tuesday",
      ["Monday", "Tuesday", "Friday"],
    ],
    [
      notice,
      "Where should pupils meet on a rainy day?",
      "library",
      ["library", "garden", "hall"],
    ],
    [
      notice,
      "What should a pupil bring?",
      "notebook",
      ["notebook", "tools", "flowers"],
    ],
    [
      notice,
      "Who provides the tools?",
      "teacher",
      ["teacher", "pupils", "gardener"],
    ],
    [
      story,
      "Which pot was watered first?",
      "first",
      ["first", "second", "neither"],
    ],
    [
      story,
      "What did Sam initially think the second seed needed?",
      "bigger pot",
      ["bigger pot", "less light", "notebook"],
    ],
    [
      story,
      "What did Nina suggest checking first?",
      "water",
      ["water", "flowers", "tools"],
    ],
    [
      story,
      "Where did they record their observations?",
      "notebook",
      ["notebook", "poster", "letter"],
    ],
    [
      story,
      "What would they change in the next experiment?",
      "water",
      ["water", "seeds", "light"],
    ],
    [
      notice,
      "Listening check: where does the club meet when it rains?",
      "library",
      ["library", "hall", "garden"],
    ],
    [
      story,
      "Listening check: how many days after watering did the second shoot appear?",
      "two",
      ["two", "five", "seven"],
    ],
    [
      story,
      "Listening check: what should stay the same in the next experiment? Choose one.",
      "seeds",
      ["seeds", "water amount", "observations"],
    ],
  ];
  const listening: Exercise[] = listeningRows.map(
    ([stimulus, prompt, answer, choices], i) => ({
      prompt: { en: prompt, mt: "Isma’ bl-Ingliż u wieġeb: " + prompt },
      answer,
      acceptedAnswers: answer === "two" ? ["2"] : undefined,
      hint: {
        en: "Listen for the detail the question asks for. Replay that recording, then identify the relevant phrase.",
        mt: "Erġa’ isma’ u sib id-dettall li titlob il-mistoqsija.",
      },
      worked: {
        en: `The recording identifies ${answer}. Replay it and connect that detail to the question.`,
        mt: `Ir-reġistrazzjoni tagħti dan id-dettall: ${answer}. Erġa’ isma’ u qabbilhu mal-mistoqsija.`,
      },
      choices: { en: choices, mt: choices },
      stimulus,
      taskLanguage: "en",
      stage: i >= 9 ? "check" : "practice",
    }),
  );
  const shortTarget =
    year === 4 ? "a short message" : year === 5 ? "40–50 words" : "50–60 words";
  const longTarget =
    year === 4
      ? "70–100 words"
      : year === 5
        ? "100–140 words"
        : "140–200 words";
  const writingPrompts = [
    "Plan a message inviting a fictional classmate to the garden club. State its purpose and list the details the reader needs.",
    "Write an opening sentence for that message and include the day and meeting place.",
    "Add what to bring, what happens in rain, and a friendly closing. Check the club notice for the details.",
    `Write the complete invitation message in English. Aim for ${shortTarget}. Check purpose, useful details and punctuation.`,
    "Revise your message: read it aloud, remove a repeated idea and make one unclear sentence clearer.",
    "Choose ONE long-writing task: (A) a story about finding a surprising plant in the school garden, or (B) an informal email asking a fictional teacher to start a garden club. State your choice and plan beginning, middle and ending.",
    "Draft the beginning of your chosen story or email. Establish the scene or the reason for writing.",
    "Develop the middle: use specific details, link ideas, and explain an event or give reasons. Finish with a suitable ending.",
    `Independent writing practice: write your complete story OR informal email, in paragraphs. Aim for ${longTarget}. Review and edit it using the criteria. Feedback is not an exam mark.`,
  ];
  const writingExamples = [
    "Purpose: invite a classmate. Include the day, time, meeting place, what to bring, and the rainy-day plan.",
    "You are invited to the garden club on Tuesday after lunch beside the library.",
    "Please bring a small notebook. The teacher provides tools. If it rains, we will meet inside the library. I hope you can come.",
    "Hi Alex, please join our garden club on Tuesday after lunch. Meet beside the library and bring a small notebook. The teacher will provide tools. If it rains, we will meet inside the library. We can draw leaves and label plants together. From Sam.",
    "Replace an unclear phrase such as ‘meet there’ with ‘meet beside the library’. Keep each detail once, then check sentence endings.",
    "Email plan: explain the request; give reasons and suggest activities; close politely. Story plan: introduce the garden; develop the discovery and problem; show how the problem is resolved.",
    "Dear Teacher, I am writing to suggest a garden club for our class. We could observe plants and learn to care for them together.",
    "We could keep notebooks to record changes in the plants. Taking turns would help everyone join in. We could also draw leaves and compare their shapes. Thank you for considering our idea.",
    "A useful email has a greeting, a clear request, reasons with examples, and a polite closing. A useful story establishes a scene, develops an event or problem, and ends with a resolution. Use the plan to make your own draft; then check each paragraph serves that purpose.",
  ];
  const writing = writingPrompts.map((p, i) =>
    open(p, writingExamples[i], sharedRubric, "writing", {
      passage: i <= 4 ? notice : undefined,
    }),
  );
  const literaturePrompts = [
    "Read the poem. Describe what happens to the seed in your own words.",
    "Find two rhyming words and explain how they sound alike.",
    "The seed ‘sleeps’. Explain why the poet describes a seed as if it were a person.",
    "Choose a word that helps you imagine a sound. Explain the picture or sound it creates.",
    "Explain how the poem makes you feel and support your response with a detail from it.",
    "Read Nina and Sam’s story. Describe Nina’s suggestion and explain how it changes the outcome.",
    "Compare the poem and the story: explain one difference in how they tell us about plants.",
    "Write or speak two original lines about a garden. Try a sound, image or rhyme; explain your choice.",
    "Literature reflection: choose the poem or the story. Explain an idea it communicates, give evidence, and say how the writer’s words create an effect. This is reflective practice, not an annual-paper score.",
  ];
  const literatureExamples = [
    "The seed starts hidden in the soil. Rain and light help it grow leaves.",
    "‘Light’ and ‘sight’ share the same ending sound.",
    "Seeds do not sleep like people. The image suggests a quiet seed before growth begins.",
    "‘Humming’ helps us imagine the quiet sound of a bee flying.",
    "The poem feels hopeful because the leaves ‘reach for the sky’. That image suggests new growth.",
    "Nina suggests checking the water. When they water the dry pot, a shoot appears, so they decide to compare water in their next experiment.",
    "The poem uses rhyme and images. The story describes characters observing plants and changing their plan.",
    "‘Leaves whisper softly in the breeze.’ This uses a human action to help the reader imagine a gentle rustling sound.",
    "The poem presents growth as hopeful. ‘Greets the light’ makes the plant seem welcoming, while ‘reach for the sky’ suggests growth. Support your own response with a precise detail and explain its effect.",
  ];
  const literature = literaturePrompts.map((p, i) =>
    open(
      p,
      literatureExamples[i],
      [
        "Explain your own response",
        "Use evidence from the text",
        "Discuss a word, sound or image and its effect",
      ],
      "writing",
      { passage: i < 5 || i === 8 ? poem : story },
    ),
  );
  return [
    make(
      "SPEAKING",
      "Speaking studio",
      garden +
        " Original picture descriptions, interviews, role-play and opinions. Adult listening review needed.",
      speaking,
    ),
    make(
      "LISTENING",
      "Listening studio",
      "Original short notice and story. Shortened preparation, not full-length official exam recordings.",
      listening,
    ),
    make(
      "WRITING",
      "Writing studio",
      "Plan, draft and revise messages and longer writing. Original tasks; feedback and self-review, not automatic marks.",
      writing,
    ),
    make(
      "LITERATURE",
      "Literature studio",
      "Original poem and story: personal response, textual evidence, sound and imagery. Continuous-assessment practice, not annual-paper marking.",
      literature,
    ),
  ];
});
