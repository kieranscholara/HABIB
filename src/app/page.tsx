import Link from "next/link";
import { PublicHeader, Footer } from "@/components/ui";
export default function Home() {
  return (
    <>
      <PublicHeader />
      <main className="landing">
        <section className="hero">
          <div className="hero-copy">
            <span className="eyebrow">
              <span className="green-dot" /> A LEARNING COMPANION, BIL-MALTI
            </span>
            <h1>
              Small steps.
              <br />
              <em>Bright minds.</em>
            </h1>
            <p>
              Give your child a little more confidence in maths.
              <br />
              Ħabib guides them through one idea at a time,
              <br />
              in the language that feels like home.
            </p>
            <div className="hero-actions">
              <Link href="/signup" className="button">
                Start your family’s journey →
              </Link>
              <Link href="/pricing" className="text-link">
                Explore the family plan →
              </Link>
            </div>
            <div className="hero-detail">
              <span>Years 4–6</span>
              <span>Malti & English</span>
              <span>Parent controlled</span>
            </div>
          </div>
          <div className="hero-visual">
            <div className="visual-star">✦</div>
            <div className="floating-label">Aha! I understand it now.</div>
            <div className="lesson-preview">
              <div className="preview-head">
                <span className="avatar">✳</span>
                <div>
                  <strong>Ħabib</strong>
                  <small>Your AI maths tutor</small>
                </div>
                <span className="online-dot" />
              </div>
              <div className="preview-pie">
                <div className="pie">
                  <span>¾</span>
                </div>
                <b>Il-Frazzjonijiet</b>
                <small>Year 5 · Let’s work it out together</small>
              </div>
              <div className="preview-bubble">
                Ejja naqsmu 20 f’erba’ gruppi ndaqs.
                <br />
                <strong>Kemm hu 20 ÷ 4?</strong>
              </div>
              <div className="preview-input">
                <span>One small question at a time</span>
                <i>↑</i>
              </div>
            </div>
            <div className="floating-result">
              <span>✓</span>Understanding comes first.
            </div>
            <div className="visual-dot">÷</div>
          </div>
        </section>
        <section id="how" className="how-section">
          <div className="section-title">
            <span className="eyebrow">A LITTLE PRACTICE, A BIG DIFFERENCE</span>
            <h2>Learning that feels a little lighter.</h2>
            <p>
              Space to ask questions. Time to make mistakes. Help to try again.
            </p>
          </div>
          <div className="feature-grid">
            {[
              [
                "01",
                "A familiar voice",
                "Speak or type in Maltese or English. Read along with clear captions and replay each explanation.",
                "♩",
              ],
              [
                "02",
                "Understanding, step by step",
                "Short questions and helpful hints encourage your child to work things out, rather than copy an answer.",
                "✳",
              ],
              [
                "03",
                "You stay in the picture",
                "Choose profiles, manage authorisation, and see learning progress from your family dashboard.",
                "⌂",
              ],
            ].map(([n, t, d, icon]) => (
              <article key={n}>
                <span className="feature-icon">{icon}</span>
                <span className="feature-number">{n}</span>
                <h3>{t}</h3>
                <p>{d}</p>
              </article>
            ))}
          </div>
        </section>
        <section className="family-callout">
          <div>
            <span className="eyebrow">FOR YOUR LITTLE LEARNERS</span>
            <h2>A calm corner for curious minds.</h2>
            <p>
              One family account. Two child profiles. Maths in their own time.
            </p>
          </div>
          <Link href="/signup" className="button">
            Create a parent account →
          </Link>
        </section>
        <p className="launch-note">
          Early access. Voice requires configured speech services; lessons
          require teacher review before use with real children.
        </p>
      </main>
      <Footer />
    </>
  );
}
