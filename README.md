# Ħabib AI — Milestone 1

An adult-test prototype of a Maltese Year 5 fractions tutor. This implements the specification's first assignment, not the subscription MVP.

## Develop

Node 24, npm 11. `npm ci`, then `npm run dev`. `npm test`, `npm run typecheck`, and `npm run build` validate the local workflow.

Default mode is **local**: a deterministic lesson can be completed with text; speech is explicitly disabled. Begin the lesson and try `Ma fhimtx`, `4`, `6`, `ħamsa`, `15` for a five-turn check.

## Live provider setup

Copy `.env.example` to `.env.local`, securely enter Azure Speech credentials/region and `HABIB_OPENAI_KEY`, then set `HABIB_LIVE_PROVIDERS=true` and restart. `HABIB_OPENAI_KEY` maps to the OpenAI API credential (the alternate name supports cloud secret bindings). Credentials remain server-side. Allow `api.openai.com`, `<region>.stt.speech.microsoft.com`, and `<region>.tts.speech.microsoft.com`.

Use HTTPS for microphone access except local development. Click record, speak, then stop within 30 seconds. Review/edit the transcription and Send. Click Listen for Azure `mt-MT-GraceNeural` speech. Playback starts on explicit user action; browser restrictions can require pressing Listen again. No raw audio or transcripts are written to disk or a database. Session transcript exists only in the current browser tab and clears on End & clear session.

The browser captures PCM using Web Audio and resamples to mono 16 kHz WAV for Azure REST recognition. ScriptProcessor is deprecated but broadly supported; replacing it with an AudioWorklet is future work. Audio upload and synthesis use 15-second provider timeouts. Timing includes transcription/upload, tutor request, and synthesis/playback preparation; human transcript-confirmation time is excluded.

## Scope and limitations

Only three quarters of 20 is supported. Deterministic application code validates answers and controls progression. OpenAI selects the single applicable verified template, rather than generating unchecked mathematical prose. The arithmetic is verified by tests; Maltese phrasing and lesson material **have not received teacher or native-speaker approval**.

The prototype trusts client-held lesson state and has no authentication, durable quotas, billing, storage, or production safeguarding implementation. Do not expose live provider mode publicly: deploy only behind an external authenticated access gate for adult testers. Origin checks do not replace authentication or prevent direct API clients consuming provider resources. Do not use with real children until production controls and review gates exist.

Provider integrations are implemented but cannot be claimed validated without credentials. Required next gates: five live Maltese turns, native-speaker review, child-speech/code-switching evaluation under an approved protocol, actual latency/cost measurement, iOS Safari and Android Chrome tests. Local tests do not establish speech quality or MVP readiness.
