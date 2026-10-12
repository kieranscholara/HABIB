import { PublicHeader, Footer } from "@/components/ui";
export default function Page() {
  return (
    <>
      <PublicHeader />
      <main className="legal-page">
        <span className="eyebrow">EARLY ACCESS TERMS · PRE-LAUNCH DRAFT</span>
        <h1>A little help, used with care.</h1>
        <p>
          Ħabib is an AI mathematics learning tool for Years 4–6. It supports
          practice and does not replace a teacher, parent, emergency service or
          professional advice.
        </p>
        <h2>Parent responsibility</h2>
        <p>
          Only an adult parent or legal guardian may create an account and
          authorise a child profile. Supervise use, use nicknames and do not
          submit personal information. Speak to a trusted adult whenever
          something feels concerning.
        </p>
        <h2>Family subscription</h2>
        <p>
          The family plan supports two child profiles. Pricing and allowances
          are confirmed at checkout. Voice allowance counts both audio
          recognition duration and generated speech duration. Failed requests do
          not use the family allowance. Cancellation and payment details are
          managed through Stripe’s billing portal. The operator must publish
          legally reviewed cancellation, refund and consumer-rights terms before
          taking payments.
        </p>
        <h2>Availability and accuracy</h2>
        <p>
          Lessons use application-verified answers. Voice recognition can make
          mistakes; always review the transcript. Teacher and native-speaker
          reviews are required before child use. If a question is unclear or
          unsupported, ask a teacher. Service availability depends on configured
          providers and your connection.
        </p>
        <h2>Development and controlled launch</h2>
        <p>
          Development access uses fictional profiles and draft material.
          Production registration is invitation-only. Final operator identity,
          contact details, age authorisation procedure and legal terms must be
          approved before launch.
        </p>
      </main>
      <Footer />
    </>
  );
}
