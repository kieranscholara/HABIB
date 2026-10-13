# Malta Years 4–6: sources, preparation and coverage

The agreed priority is Maths, English, Maltese and Science in Malta's national curriculum. The application has 45 draft programmes and 514 original preparation/activity steps: 171 in Year 4, 172 in Year 5 and 171 in Year 6. These include open-ended tasks and repeated practice. Activity counts and passing software tests do not demonstrate full outcome coverage or exam readiness.

## Research evidence — 13 October 2026

The public [primary syllabus index](https://curriculum.gov.mt/syllabi-and-learning-outcomes-years-1-to-6-2/), [examination resources](https://curriculum.gov.mt/resources/examinations/) and [past-paper index](https://curriculum.gov.mt/past-exam-papers/) were retrieved normally with TLS verification. The source manifest, [curriculum-source-manifest.json](curriculum-source-manifest.json), records 53 downloaded official files, source URLs, byte counts, SHA-256 hashes and retrieval date. These are 50 PDFs (with extracted text) and three English assessment spreadsheets. Eight PDFs came from English/Maltese examination-procedure ZIP archives. Downloaded originals and extracted text are ignored local research files, not redistributed app assets.

Documents collected include English Years 4–6 supporting documents and annual-examination guidance, and other primary programme documents for Religion, Ethics, Social Studies, PSCD, PE, Art, Drama, Music and foreign-language frameworks. Selected outcome overviews and assessment requirements were read; collection does not mean every outcome was reviewed or mapped. Only the four agreed subjects are teaching priorities. Other programme areas appear in the coverage catalogue to identify omissions.

### English requirements inspected

The Years 4–6 supporting documents identify listening/viewing, speaking/representing, reading/viewing, writing/representing, literature, and language awareness/production. Grammar belongs in context rather than substituting for these skills. For example, the Year 5 overview includes SR6.7–6.9 (questions, role-play, opinions), LV6.1–6.2 (inferences, main ideas and details), RV6.7 (opinion/evidence), and WR6.4–6.5 (planning, revision/editing). These references describe the source; they are not teacher-approved mappings for every app exercise.

Sources:

- [Year 4 supporting document](https://curriculum.gov.mt/wp-content/uploads/2025/04/syllabus_English_yr04_Supporting_document.pdf)
- [Year 5 supporting document](https://curriculum.gov.mt/wp-content/uploads/2025/04/syllabus_English_yr05_Supporting_document.pdf)
- [Year 6 supporting document](https://curriculum.gov.mt/wp-content/uploads/2025/04/syllabus_English_yr06_Supporting_document.pdf)
- [Year 4 annual guidance](https://curriculum.gov.mt/wp-content/uploads/2025/05/English_yr04_Annual_Examination_Guidelines.pdf), updated 2025, especially format overview p. 2 and writing pp. 12–13.
- [Year 5 annual guidance](https://curriculum.gov.mt/wp-content/uploads/2025/05/English_yr05_Annual_Examination_Guidelines.pdf), updated 2025, especially format overview p. 2 and writing p. 7.
- [Year 6 annual guidance](https://curriculum.gov.mt/wp-content/uploads/2025/05/English_yr06_Annual_Examination_Guidelines.pdf), updated 2025, especially format overview p. 2 and writing p. 7.

The reviewed guidance gives annual components of Speaking 20, Listening 20, Reading 30 and Writing 30 marks. Annual assessment contributes 60% and continuous assessment 40%. Literature is assessed continuously, not as an annual-paper component. Standalone Language Awareness and Production is removed from the annual exam; grammar/vocabulary accuracy is assessed within speaking/writing.

| Year | Speaking format                                                                                         | Writing preparation target in guidance                                           |
| ---- | ------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| 4    | Unassessed warmer; single picture; interview; about 7–8 minutes                                         | One short task; choose one long task, 70–100 words; short 12 / long 18 marks     |
| 5    | Unassessed warmer; single picture; inverted interview; role-play; about 8 minutes                       | Short 40–50 words; choose one long task, 100–140 words; short 10 / long 20 marks |
| 6    | Unassessed warmer; single picture; compare/contrast; thematic discussion with reasons; about 10 minutes | Short 50–60 words; choose one long task, 140–200 words; short 10 / long 20 marks |

Listening is 30 minutes with short and long audio/audio-visual material. Reading and writing are 45 minutes each; Year 4 includes a 30-minute break between them. The app's new studios practise relevant skill types using original garden scenes, notices, stories, a poem, messages and longer drafts. These are shortened practice activities, not full official examination sessions. Writing targets guide revision; they are not automatic pass/fail word-count gates. Speaking feedback on a transcript cannot assess pronunciation or fluency. Open writing, speaking and literature receive criteria/feedback, not certified marks.

### Access gaps and dates

The official index links Maths, Maltese and Science to subject sites. Requests to `primarymaths.skola.edu.mt`, `malti.skola.edu.mt` and `primaryscience.skola.edu.mt` still receive runtime HTTP 403. Official specimen/past-paper links hosted at `ilearnedu-my.sharepoint.com` are also inaccessible. No actual specimen or past-paper question/mark scheme has been read; `pastPapersReviewed` remains false. The learning-outcomes portal currently returns an ACM sign-in page, not accessible outcomes. Its account access was not bypassed. The protected WordPress media API returned 401 and was not used.

Additional source domains were saved in the editable cloud environment network draft. Saving a draft does not apply network access to the running environment. Review and save/publish those environment settings, then retry the official public links. School/teacher-provided documents are another legitimate source if the official public links remain unavailable.

English/Maltese exam procedure archives dated August 2025 explicitly say their review was due by the end of August 2026. They concern administration/access arrangements and are not past papers or specimen questions. Do not represent these expired-review procedure copies as verified current 2026 arrangements. Check for replacements before a school pilot.

## Remaining mapping and teaching work

1. Retrieve the current year-specific Maths, Maltese and Science syllabi/outcomes and actual English/Maths/Maltese/Science specimen and past papers, including marking schemes. Confirm document edition and school programme, including native Maltese versus Maltese as a foreign language.
2. Read every relevant outcome and record URL, edition, page/outcome ID, required skill and corresponding lesson. Build a per-year coverage matrix with missing outcomes; verify allocations rather than inferring them from familiar topic names.
3. Inspect paper genres, layouts, number of tasks, mark allocation, expected working, command words and difficulty. Author original multi-stage questions and independent exam-length practice matched to those requirements. Current three-question topic checks assess final answers only; they cannot grade mathematical reasoning or replace a complete exam.
4. Extend lessons until guided examples, varied practice, transfer problems and independent work demonstrate the required skills. Shared foundational reading/listening/Maltese activities are not evidence of a verified progression across years. Evaluate the four-unsuccessful-attempt threshold and the alternatives with learners.
5. Obtain a Maltese primary teacher and native speaker's review of every prompt, answer, distractor, worked example, activity, translation, rubric, year allocation and source mapping. Open-response completion records participation, not mastery. Review speaking with actual audio, not ASR text.

Production hides and refuses unapproved topics. Use `npm run curriculum -- list`, then `npm run curriculum -- approve TOPIC REAL_REVIEWER VERIFIED_OUTCOME` only after an actual review. Changed lesson hashes invalidate earlier approvals. Source verification is `partial`; complete coverage and past-paper review remain false.
