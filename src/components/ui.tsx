"use client";
import { appVersion } from "@/lib/version";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { api, post, type Me } from "@/lib/client";
export function Brand() {
  return (
    <Link className="brand" href="/">
      ħabib<span>✳</span>
    </Link>
  );
}
export function PublicHeader() {
  return (
    <header className="public-header">
      <Brand />
      <nav>
        <Link href="/#how">How it works</Link>
        <Link href="/pricing">For families</Link>
        <Link href="/login">Sign in</Link>
        <Link className="button small" href="/signup">
          Get started →
        </Link>
      </nav>
    </header>
  );
}
export function ErrorNote({ error }: { error: string }) {
  return error ? (
    <div role="alert" className="error-note">
      {error}
    </div>
  ) : null;
}
export function Empty({
  title,
  text,
  href,
  label,
}: {
  title: string;
  text: string;
  href?: string;
  label?: string;
}) {
  return (
    <div className="empty-state">
      <span className="empty-symbol">✳</span>
      <h3>{title}</h3>
      <p>{text}</p>
      {href && (
        <Link href={href} className="button">
          {label || "Get started"} →
        </Link>
      )}
    </div>
  );
}
export function Shell({ children }: { children: React.ReactNode }) {
  const [me, setMe] = useState<Me | null>(null),
    [error, setError] = useState("");
  const router = useRouter(),
    path = usePathname();
  useEffect(() => {
    api<Me>("me")
      .then(setMe)
      .catch((e) => {
        setError(e.message);
        router.replace("/login");
      });
  }, [router]);
  const links = [
    ["/dashboard", "⌂", "Overview"],
    ["/children", "☺", "My children"],
    ["/learn", "✳", "Learning corner"],
    ["/homework", "▣", "Homework helper"],
    ["/settings", "⚙", "Family settings"],
  ];
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Brand />
        <p className="nav-label">YOUR FAMILY SPACE</p>
        <nav>
          {links.map(([href, icon, label]) => (
            <Link
              key={href}
              href={href}
              className={
                path === href || (href === "/learn" && path === "/tutor")
                  ? "active"
                  : ""
              }
            >
              <span>{icon}</span>
              {label}
            </Link>
          ))}
        </nav>
        <div className="sidebar-note">
          <span>☀</span>
          <h4>Little steps add up.</h4>
          <p>A few minutes of practice can make all the difference.</p>
        </div>
        <small className="app-version">HABIB {appVersion}</small>
        <div className="sidebar-account">
          <div className="avatar small-avatar">
            {me?.parent.display_name.charAt(0) || "…"}
          </div>
          <div>
            <strong>{me?.parent.display_name || "Loading…"}</strong>
            <span>Parent account</span>
          </div>
          <button
            aria-label="Sign out"
            onClick={async () => {
              await post("auth/logout", {});
              router.push("/");
            }}
          >
            →
          </button>
        </div>
      </aside>
      <div className="app-content">
        <div className="app-topbar">
          <span>
            Made for curious minds <span className="tiny-star">✦</span>
          </span>
          <Link href="/learn" className="topbar-link">
            Time to learn →
          </Link>
        </div>
        {me?.mode === "development" && (
          <div className="development-banner">
            Development mode · test accounts and draft lessons · payments
            require Stripe setup
          </div>
        )}
        <main className="app-main">
          <ErrorNote error={error} />
          {children}
        </main>
        <footer className="app-footer">
          <span>ONE LITTLE DISCOVERY AT A TIME</span>
          <Link href="/privacy">Privacy</Link>
          <Link href="/terms">Terms</Link>
        </footer>
      </div>
    </div>
  );
}
export function PageHeading({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="page-heading">
      <div>
        <span className="eyebrow">{eyebrow}</span>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {action}
    </div>
  );
}
export function ProgressBar({ value }: { value: number }) {
  return (
    <div className="progress-track">
      <div style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
    </div>
  );
}
export function Footer() {
  return (
    <footer className="public-footer">
      <Brand />
      <span>Small steps. Bright minds.</span>
      <nav>
        <Link href="/privacy">Privacy</Link>
        <Link href="/terms">Terms</Link>
        <Link href="/login">Parent sign in</Link>
      </nav>
    </footer>
  );
}
