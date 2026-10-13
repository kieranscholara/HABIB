export const subjectIds = ["maths", "english", "maltese", "science"] as const;
export type Subject = (typeof subjectIds)[number];
export const subjects = [
  {
    id: "maths",
    title: { en: "Mathematics", mt: "Il-Matematika" },
    icon: "123",
  },
  { id: "english", title: { en: "English", mt: "L-Ingliż" }, icon: "Aa" },
  { id: "maltese", title: { en: "Maltese", mt: "Il-Malti" }, icon: "Ħ" },
  { id: "science", title: { en: "Science", mt: "Ix-Xjenza" }, icon: "⚗" },
] satisfies { id: Subject; title: { en: string; mt: string }; icon: string }[];

// Portal pointers are not verified outcome mappings. Do not label a lesson
// aligned/approved until the actual subject/year document has been checked.
export const nationalCurriculum = {
  name: "Malta national curriculum",
  country: "Malta",
  years: [4, 5, 6],
  officialPortals: [
    "https://curriculum.gov.mt/",
    "https://www.schoolslearningoutcomes.edu.mt/",
  ],
  verification: "pending" as const,
};
