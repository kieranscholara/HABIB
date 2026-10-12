"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { post } from "@/lib/client";
import { Brand, ErrorNote } from "./ui";
export function AuthForm({
  mode,
  tokenHash = "",
}: {
  mode: "login" | "signup" | "forgot" | "reset" | "confirm";
  tokenHash?: string;
}) {
  const router = useRouter(),
    [error, setError] = useState(""),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false);
  const titles = {
    login: "Welcome back.",
    signup: "A brighter start.",
    forgot: "Let’s get you back in.",
    reset: "A fresh start.",
    confirm: "Confirm your account.",
  };
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setBusy(true);
    const values = Object.fromEntries(new FormData(e.currentTarget));
    try {
      const result = await post("auth/" + mode, {
        ...values,
        adult: values.adult === "on",
        tokenHash,
      });
      if (result.confirmationRequired)
        setMessage(
          "Check your email to confirm your parent account before signing in.",
        );
      else if (mode === "forgot") setMessage(result.message);
      else if (mode === "reset") {
        setMessage("Your password has been changed. You can now sign in.");
      } else router.push("/dashboard");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="auth-page">
      <div className="auth-story">
        <Brand />
        <div>
          <span className="eyebrow">SMALL STEPS. BRIGHT MINDS.</span>
          <h1>
            Confidence
            <br />
            starts with
            <br />
            <em>understanding.</em>
          </h1>
          <p>
            A learning corner for your family.
            <br />A little help, in the language of home.
          </p>
          <div className="auth-art">
            ✳ <span>¾</span> ✦
          </div>
        </div>
        <small>Mathematics · Years 4–6 · Malta</small>
      </div>
      <div className="auth-panel">
        <Link href="/" className="back-link">
          ← Back to Ħabib
        </Link>
        <div className="auth-form-wrap">
          <span className="eyebrow">PARENT ACCOUNT</span>
          <h2>{titles[mode]}</h2>
          <p>
            {mode === "signup"
              ? "Create your parent account. Your child does not need an email address."
              : mode === "login"
                ? "Your family’s learning corner is waiting."
                : "Follow the steps below to continue."}
          </p>
          <ErrorNote error={error} />
          {message ? (
            <div role="status" className="success-note">
              {message}
              <Link href="/login">Back to sign in →</Link>
            </div>
          ) : (
            <form onSubmit={submit} className="stack-form">
              {mode === "signup" && (
                <label>
                  Your name
                  <input
                    name="name"
                    required
                    maxLength={60}
                    autoComplete="name"
                    placeholder="Parent or guardian name"
                  />
                </label>
              )}
              {(mode === "signup" || mode === "login" || mode === "forgot") && (
                <label>
                  Email address
                  <input
                    name="email"
                    type="email"
                    required
                    maxLength={254}
                    autoComplete="email"
                    placeholder="you@example.com"
                  />
                </label>
              )}
              {(mode === "signup" || mode === "login" || mode === "reset") && (
                <label>
                  Password
                  <input
                    name="password"
                    type="password"
                    required
                    minLength={10}
                    maxLength={128}
                    autoComplete={
                      mode === "login" ? "current-password" : "new-password"
                    }
                    placeholder="At least 10 characters"
                  />
                </label>
              )}
              {mode === "signup" && (
                <>
                  <label>
                    Invitation code{" "}
                    <span className="label-help">
                      Required for production early access
                    </span>
                    <input
                      name="inviteCode"
                      maxLength={200}
                      placeholder="Leave blank for local testing"
                    />
                  </label>
                  <label className="check-label">
                    <input name="adult" type="checkbox" required />
                    <span>
                      I am an adult parent or legal guardian and agree to the{" "}
                      <Link href="/terms">terms</Link> and{" "}
                      <Link href="/privacy">privacy notice</Link>.
                    </span>
                  </label>
                </>
              )}
              {mode === "login" && (
                <Link href="/forgot-password" className="form-link">
                  Forgot your password?
                </Link>
              )}
              <button className="button full" disabled={busy}>
                {busy
                  ? "Please wait…"
                  : mode === "signup"
                    ? "Create parent account →"
                    : mode === "login"
                      ? "Sign in →"
                      : mode === "confirm"
                        ? "Confirm email →"
                        : mode === "reset"
                          ? "Save new password →"
                          : "Send reset email →"}
              </button>
            </form>
          )}
          {["login", "signup"].includes(mode) && (
            <p className="auth-switch">
              {mode === "login" ? "New to Ħabib?" : "Already have an account?"}{" "}
              <Link href={mode === "login" ? "/signup" : "/login"}>
                {mode === "login" ? "Create an account" : "Sign in"}
              </Link>
            </p>
          )}
          <small className="auth-fine">
            Parent-controlled accounts. No advertising. No child-to-child chat.
          </small>
        </div>
      </div>
    </div>
  );
}
