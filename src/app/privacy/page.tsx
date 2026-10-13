import { PublicHeader, Footer } from "@/components/ui";
export default function Page() {
  return (
    <>
      <PublicHeader />
      <main className="legal-page">
        <span className="eyebrow">
          PRIVACY NOTICE · VERSION 1.1 · PRE-LAUNCH DRAFT
        </span>
        <h1>Your family’s data deserves care.</h1>
        <p>
          This notice describes the implemented data flows. The operator must
          complete legal, vendor and retention reviews, add their identity and
          contact details, and approve this notice before inviting real
          families.
        </p>
        <h2>Parent-controlled learning</h2>
        <p>
          Parents create accounts and profiles using nicknames, school year and
          language. The application requires recorded parent authorisation
          before tutoring in Maths, English, Maltese and Science. Earlier
          maths-only authorisation remains limited to maths until a parent
          extends it. Child profiles do not have independent accounts. Parents
          can withdraw authorisation in My children, immediately ending active
          lessons.
        </p>
        <h2>What is processed</h2>
        <p>
          Speech recordings are sent to Azure for recognition, then discarded by
          the app. Generated audio parts and recognition results may be held in
          server memory for up to one minute for safe retries. When enabled,
          short tutoring questions, up to eight recent dialogue messages and
          previous tutor explanations from the current lesson are sent to OpenAI
          for contextual explanations of the selected school subject that avoid
          repetition. Child dialogue context is kept in the current browser tab.
          In voice conversation, the microphone stays active while the tutor
          speaks so you can interrupt; only your captured turn is sent for
          recognition. Camera previews stay on your device until you capture a
          photo. Homework photos are sent to OpenAI for extraction and are not
          written to storage. Avoid faces, names or personal information in
          photos. Provider retention and processing contracts must be reviewed
          separately.
        </p>
        <h2>What is saved</h2>
        <p>
          We save parent account details, child nicknames and learning
          preferences, authorisation records, lesson state, structured
          correct/incorrect attempts, progress, subscription status and metered
          usage. Child input text is not saved as a full transcript. Tutor reply
          captions, including generated explanations, are retained for at most
          24 hours by the retention task. Financial records held by Stripe
          follow its requirements.
        </p>
        <h2>Your choices</h2>
        <p>
          Export family data or delete the account in Family settings. A child
          profile can be deleted independently. Cancel subscriptions before
          erasure. Deletion removes application records; provider records, legal
          retention requirements and backup expiry schedules require the
          operator’s approved retention procedure.
        </p>
        <h2>Services and safeguards</h2>
        <p>
          Production uses Supabase authentication and PostgreSQL, Azure speech,
          OpenAI image extraction and conversational explanations, and Stripe
          billing. No advertising SDKs or child-to-child chat are included.
          HTTPS, ownership checks, short-lived sessions, rate limits and
          transactional allowances protect the learning flow. Contact the
          operating organisation for privacy requests once its contact details
          are published.
        </p>
        <h2>Before launch</h2>
        <p>
          Data protection assessment, appropriate parental verification, vendor
          processing agreements, safeguarding procedures, backup expiry and
          legal review remain mandatory external approvals. Development mode is
          for adult testing with fictional profiles.
        </p>
      </main>
      <Footer />
    </>
  );
}
