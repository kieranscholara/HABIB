# Malta curriculum target and source verification

The selected programme is Malta's national curriculum for Years 4–6. This is the target for mapping, not a claim that the current lessons are approved or reproduce the school's full programme.

The application currently includes 18 original maths packs and 15 original English, Maltese and Science practice packs, with 100 exercise steps in total across the three years. The new material is introductory practice. Shared reading and Maltese activities are foundational exercises, not evidence of a verified progression between years.

## Source status — 13 October 2026

Official source portals identified for inspection:

- https://curriculum.gov.mt/
- https://curriculum.education.gov.mt/
- https://www.schoolslearningoutcomes.edu.mt/
- https://learningoutcomes.gov.mt/
- https://education.gov.mt/

Requests from the cloud environment were refused by its egress proxy with HTTP 403 at CONNECT. No official syllabus documents, outcome IDs, editions or year allocations were read or verified. Required domain additions were saved to the editable environment configuration; saving the draft does not apply its network settings to the current runtime. `nationalCurriculum.verification` therefore remains `pending` and the learning page says mapping and teacher review are outstanding.

## Required mapping work

Once source access is available, inspect the current primary learning outcomes for each subject and year. Record the official document URL, title, edition/date, page or outcome identifier and the lesson that addresses it. Verify year allocation rather than inferring it from a topic's familiarity. Compare all outcomes against the practice packs and record missing coverage. Create and review missing material before describing a subject or year as complete.

A Maltese primary teacher must check prompts, accepted answers, distractors, worked solutions, reading difficulty, translations and alignment. Record actual reviewer and outcome references with `npm run curriculum -- approve TOPIC REAL_REVIEWER VERIFIED_OUTCOME`. Existing content hashes invalidate approval when a lesson changes. Production continues to hide and refuse unapproved packs. Do not approve the new packs or change the source status simply because software tests pass.
