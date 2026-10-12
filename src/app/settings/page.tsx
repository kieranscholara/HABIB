"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, post, type Me } from "@/lib/client";
import { Shell, PageHeading, ErrorNote, ProgressBar } from "@/components/ui";
export default function Page() {
  const router = useRouter(),
    [me, setMe] = useState<Me | null>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [deleting, setDeleting] = useState(false);
  useEffect(() => {
    api<Me>("me")
      .then(setMe)
      .catch((e) => setError(e.message));
  }, []);
  async function billing(action: string) {
    setBusy(true);
    setError("");
    try {
      const result = await post("billing/" + action, {});
      window.location.assign(result.url);
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }
  async function download() {
    setBusy(true);
    try {
      const data = await api("privacy/export");
      const url = URL.createObjectURL(
        new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }),
      );
      const a = document.createElement("a");
      a.href = url;
      a.download = "habib-family-data.json";
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function erase(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const input = Object.fromEntries(new FormData(e.currentTarget));
    setBusy(true);
    setError("");
    try {
      await post("privacy/delete", input);
      router.push("/");
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }
  return (
    <Shell>
      <PageHeading
        eyebrow="YOUR FAMILY, YOUR CHOICES"
        title="Family settings."
        description="Manage your plan and keep your family’s data in your control."
      />
      <ErrorNote error={error} />
      <div className="settings-grid">
        <section className="settings-card">
          <span className="eyebrow">PARENT ACCOUNT</span>
          <h2>{me?.parent.display_name || "Your account"}</h2>
          <p>{me?.parent.email}</p>
          <span className="status-pill green">Parent-controlled profiles</span>
          <p className="muted">
            Your sign-in stays active for up to 12 hours. Sign out on shared
            devices when you finish.
          </p>
          <button
            className="button secondary"
            onClick={async () => {
              await post("auth/logout", {});
              router.push("/login");
            }}
          >
            Sign out
          </button>
        </section>
        <section className="settings-card">
          <span className="eyebrow">FAMILY SUBSCRIPTION</span>
          <h2>
            {me?.subscription.status === "development"
              ? "Development access"
              : me?.subscription.status === "trial"
                ? "Your family trial"
                : me?.subscription.status === "active"
                  ? "Family plan"
                  : "Subscription inactive"}
          </h2>
          <p>Two profiles · Monthly voice allowance</p>
          {me && (
            <>
              <ProgressBar value={(me.usage.usedMs / me.usage.limitMs) * 100} />
              <p>
                {Math.floor(me.usage.remainingMs / 60000)} of{" "}
                {Math.floor(me.usage.limitMs / 60000)} voice minutes remaining
              </p>
              <small>
                {me.subscription.cancel_at_period_end
                  ? "Cancels"
                  : "Current period ends"}{" "}
                {new Date(me.subscription.period_end).toLocaleDateString(
                  "en-GB",
                )}
              </small>
            </>
          )}
          <div className="button-row">
            <button
              className="button"
              disabled={busy}
              onClick={() => void billing("checkout")}
            >
              Subscribe →
            </button>
            <button
              className="button secondary"
              disabled={busy}
              onClick={() => void billing("portal")}
            >
              Billing portal
            </button>
          </div>
          <p className="fine-print">
            Payments, cancellation and payment methods are managed securely by
            Stripe. A redirect does not activate your plan; verified billing
            events do.
          </p>
        </section>
        <section className="settings-card">
          <span className="eyebrow">YOUR DATA</span>
          <h2>Take a copy.</h2>
          <p>
            Download your family profile, authorisation history, structured
            learning progress and usage records.
          </p>
          <button
            className="button secondary"
            disabled={busy}
            onClick={() => void download()}
          >
            Export family data ↓
          </button>
          <p className="fine-print">
            Raw recordings and homework photos are never saved. Full child
            conversations aren’t shown in your dashboard.
          </p>
        </section>
        <section className="settings-card danger-zone">
          <span className="eyebrow">ACCOUNT ERASURE</span>
          <h2>A fresh slate.</h2>
          <p>
            Permanently delete your family account, child profiles and learning
            records. Cancel any subscription first.
          </p>
          {!deleting ? (
            <button className="danger-button" onClick={() => setDeleting(true)}>
              Delete my account
            </button>
          ) : (
            <form className="stack-form" onSubmit={erase}>
              <label>
                Type DELETE to confirm
                <input name="confirmation" required pattern="DELETE" />
              </label>
              <label>
                Confirm your password
                <input
                  name="password"
                  type="password"
                  required
                  autoComplete="current-password"
                />
              </label>
              <button className="danger-button" disabled={busy}>
                Permanently delete account
              </button>
              <button
                type="button"
                className="text-button"
                onClick={() => setDeleting(false)}
              >
                Keep my account
              </button>
            </form>
          )}
        </section>
      </div>
    </Shell>
  );
}
