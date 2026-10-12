# Ħabib AI

A responsive family mathematics application for Malta, with parent accounts, two child profiles, authorisation controls, eighteen Year 4–6 topic packs, guided bilingual lessons, saved progress, voice metering, homework extraction, privacy export/erasure and Stripe subscription integration.

**Current status:** the local application is runnable. External accounts, production deployment, provider integration validation, teacher/native-speaker reviews and legal/safeguarding approvals are not completed. This is not certified ready for real children or paid launch.

## Run on your Mac

Install Node.js **24 LTS**. Download **Code → Download ZIP** from GitHub and extract it, then:

```bash
cd ~/Downloads/HABIB-main
npm ci
npm run dev
```

Open `http://localhost:3000`. Create a parent test account (a fictional email works locally), add a child profile in My children, authorise maths tutoring, and choose a topic in Learning corner. Year 5 fractions accepts `5`, `15`, `6`, `12`; try a wrong answer or ask for a hint first. Progress appears in Overview and survives restart. No invitation or provider account is needed for local text learning.

Local data is stored in the ignored `.habib/development.sqlite` database. Local passwords use salted scrypt hashes and sessions use hashed opaque tokens. Do not copy this database into a public repository. Production disables the local database and local authentication.

## Add speech and homework

Copy `.env.example` to `.env.local`. Set your Azure Speech key and its actual region. The initial suggested region is `westeurope`; your key must belong to a resource in that region. Restart the app. The app also accepts the legacy `AZURE_SPEECH_KEY` and `AZURE_SPEECH_REGION` names locally. The `HABIB_` names avoid reserved cloud secret prefixes. Maltese uses `mt-MT` recognition and `mt-MT-GraceNeural` speech; English uses `en-GB` and `en-GB-SoniaNeural`. Use HTTPS on phones, or localhost on your Mac. Record up to 30 seconds, check the editable transcript, send it, and click Listen. Audio is not auto-played.

`HABIB_OPENAI_KEY` enables AI selection of a verified teaching action and image extraction. It is an OpenAI API key, kept server-side under an alternate variable name. Without it, deterministic guided lessons still work. Photo support is limited to one clear arithmetic expression with non-negative operands no larger than 10,000; ambiguous or unsupported photos ask for teacher help. Confirm the numbers and operation before practising. No image is persisted.

Mathematical answers and lesson progression are controlled by the application, never by client-held state or unverified generated prose. The AI selects hints/repeat/redirect actions; captions come from the lesson material. Provider failures fall back to verified text guidance. Speech failures release family allowance; uncertain reservations after a crash are conservatively charged at their reserved bound to prevent overspending.

## Voice delivery

Speech now spells out small Maltese numbers, decimal digits, percentages and arithmetic symbols, with a gentle default pace (5% slower) and 180 ms pauses between sentences. Captions retain the original maths notation. Larger whole numbers remain numeric for Azure to pronounce; Maltese phrasing still requires native-speaker review.

Optional settings in `.env.local`:

```dotenv
HABIB_MALTESE_VOICE=mt-MT-GraceNeural
HABIB_SPEECH_RATE_PERCENT=-5
```

Use `mt-MT-JosephNeural` to compare the other supported Maltese voice. Rate is bounded from -15 to +5 percent. Restart after changes. Pitch stays at the voice’s default; no expressive style or voice cloning is assumed. These changes format speech; they do not train Azure’s model. Listen to the same sentences with a native speaker to judge quality.

## Validate

```bash
npm test
npm run typecheck
npm run build
npm run test:browser
```

On a Mac, first install the test browser with `npx playwright install chromium`. Cloud tests use the installed `/usr/bin/chromium`; `CHROMIUM_PATH` can override it. Unit tests include mathematical cases, authorisation, quota concurrency and PostgreSQL RLS using PGlite. Browser/API tests cover signup, profiles, consent, lessons, progress persistence, cross-family denial, turn retries, export and erasure. These tests use fictional identities and no real payments or speech.

## Deploy

Follow [the deployment guide](docs/deployment.md). Production uses Supabase Auth and its PostgreSQL database, with server-only database credentials. Supabase is not simulated locally. Configure provider accounts and securely enter credentials; apply migrations; complete curriculum and launch reviews; deploy to your own Vercel project with `APP_ENV=production` and your HTTPS app URL. Vercel deployments always enforce production mode.

No payment becomes active from a browser redirect. Stripe signatures, webhook event IDs and current subscription state determine entitlement. The 7-day trial includes 5 combined recognition/synthesis minutes; a configured paid plan defaults to 120 minutes/month and two profiles. Review pricing against actual speech cost. All lessons require an unexpired trial or active entitlement; text learning remains available when only voice allowance is exhausted.

## Curriculum and retention

All eighteen topic packs begin as drafts. Production hides and refuses unreviewed lessons. A real teacher must review every prompt, hint, answer, Maltese translation and official outcome mapping. Run `npm run curriculum -- list` to inspect, then `npm run curriculum -- approve TOPIC REAL_REVIEWER VERIFIED_OUTCOME` only after that review. Review records include a content hash; changing the lesson invalidates approval. `npm run curriculum -- revoke TOPIC` withdraws approval.

Schedule `npm run retention` at least hourly. It deletes tutor captions after 24 hours, removes expired auth/rate records, ends stale sessions and reconciles stranded voice reservations conservatively. Structured progress is retained until parent/child deletion. Raw speech and photos are processed and discarded; short generated audio and speech recognition results are cached in memory for up to one minute for retries. Parent dashboards show structured learning statistics, not full child conversations. Implement and approve provider/backup retention arrangements before launch.

See [release gates](docs/release-gates.md) for what remains outside the verified local workflow.
