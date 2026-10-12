import Link from "next/link";
import { PublicHeader, Footer } from "@/components/ui";
export default function Page() {
  return (
    <>
      <PublicHeader />
      <main className="pricing-page">
        <div className="section-title">
          <span className="eyebrow">A LITTLE HELP FOR THE WHOLE FAMILY</span>
          <h1>
            Room to grow.
            <br />
            <em>A plan to keep it simple.</em>
          </h1>
          <p>
            One family account, two little learners, and a calmer way to
            practise maths.
          </p>
        </div>
        <section className="pricing-card">
          <span className="eyebrow">THE FAMILY PLAN</span>
          <h2>
            €{process.env.HABIB_FAMILY_PRICE_EUR || "7.99"}
            <small>/ month</small>
          </h2>
          <p>Two child profiles · Years 4–6</p>
          <ul>
            <li>Guided mathematics in Maltese and English</li>
            <li>Short lessons, hints, and practice</li>
            <li>
              {process.env.HABIB_MONTHLY_VOICE_MINUTES || "120"} metered voice
              minutes per month
            </li>
            <li>Parent dashboard and progress tracking</li>
            <li>Parent-controlled authorisation</li>
            <li>Cancel through the billing portal</li>
          </ul>
          <Link className="button full" href="/signup">
            Start with a parent account →
          </Link>
          <small>
            7-day trial includes 5 voice minutes. Speech uses recognition and
            synthesis time. Paid pricing is confirmed in Stripe Checkout.
          </small>
        </section>
        <p className="launch-note">
          Early access is invitation-only in production. Real payments require a
          configured Stripe account; the development app does not simulate
          successful payments.
        </p>
      </main>
      <Footer />
    </>
  );
}
