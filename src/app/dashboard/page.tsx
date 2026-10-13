"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { api, type Kid, type Me, type PublicTopic } from "@/lib/client";
import {
  Shell,
  PageHeading,
  Empty,
  ProgressBar,
  ErrorNote,
} from "@/components/ui";
interface Progress {
  child_id: string;
  topic_id: string;
  questions_attempted: number;
  correct_count: number;
  completed_lessons: number;
  last_practised_at: string;
}
export default function Page() {
  const [data, setData] = useState<{
      me: Me;
      kids: Kid[];
      progress: Progress[];
      topics: PublicTopic[];
    } | null>(null),
    [error, setError] = useState("");
  useEffect(() => {
    Promise.all([
      api("me"),
      api("children"),
      api("progress"),
      api("curriculum"),
    ])
      .then(([me, k, p, t]) =>
        setData({
          me,
          kids: k.children,
          progress: p.progress,
          topics: t.topics,
        }),
      )
      .catch((e) => setError(e.message));
  }, []);
  const attempts =
      data?.progress.reduce((sum, p) => sum + p.questions_attempted, 0) || 0,
    correct = data?.progress.reduce((sum, p) => sum + p.correct_count, 0) || 0,
    complete =
      data?.progress.reduce((sum, p) => sum + p.completed_lessons, 0) || 0;
  return (
    <Shell>
      <PageHeading
        eyebrow="YOUR FAMILY OVERVIEW"
        title={`Bongu${data ? ", " + data.me.parent.display_name.split(" ")[0] : ""}.`}
        description="A little window into your children’s learning."
        action={
          <Link href="/learn" className="button">
            Start learning →
          </Link>
        }
      />
      <ErrorNote error={error} />
      <div className="stat-grid">
        <div className="stat-card">
          <span>Lessons completed</span>
          <strong>
            {complete}
            <small>little discoveries</small>
          </strong>
          <i>✳</i>
        </div>
        <div className="stat-card">
          <span>Practice answers</span>
          <strong>
            {attempts}
            <small>
              {attempts
                ? Math.round((correct / attempts) * 100) + "% correct"
                : "Ready when they are"}
            </small>
          </strong>
          <i>✓</i>
        </div>
        <div className="stat-card">
          <span>Voice allowance</span>
          <strong>
            {data ? Math.floor(data.me.usage.remainingMs / 60000) : "—"}
            <small>minutes remaining</small>
          </strong>
          <i>♩</i>
        </div>
      </div>
      <div className="dashboard-columns">
        <section>
          <div className="section-row">
            <h2>Your little learners</h2>
            <Link href="/children">Manage profiles →</Link>
          </div>
          {!data ? (
            <p className="loading">Loading your family…</p>
          ) : !data.kids.length ? (
            <Empty
              title="Every journey starts somewhere."
              text="Add your first child profile and choose their school year."
              href="/children"
              label="Add a child"
            />
          ) : (
            <div className="learner-list">
              {data.kids.map((kid, i) => {
                const rows = data.progress.filter((p) => p.child_id === kid.id),
                  completed = rows.reduce((s, p) => s + p.completed_lessons, 0);
                return (
                  <div className="learner-card" key={kid.id}>
                    <div className={"kid-avatar color-" + i}>
                      {kid.nickname.charAt(0)}
                    </div>
                    <div className="learner-info">
                      <h3>{kid.nickname}</h3>
                      <p>
                        Year {kid.school_year} ·{" "}
                        {kid.language === "mt" ? "Malti" : "English"}
                      </p>
                      <span>{completed} lessons completed</span>
                    </div>
                    <Link
                      href={"/learn?child=" + kid.id}
                      className="arrow-button"
                      aria-label={"Learn with " + kid.nickname}
                    >
                      →
                    </Link>
                    {!kid.consented && (
                      <div className="consent-note">
                        Parent authorisation needed before learning
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
          <div className="section-row spaced">
            <h2>Recent practice</h2>
            <span>Learning, one step at a time</span>
          </div>
          {data?.progress.length ? (
            <div className="progress-list">
              {data.progress.slice(0, 5).map((p) => (
                <div key={p.child_id + p.topic_id} className="progress-row">
                  <span className="topic-mini">
                    {data.topics.find((t) => t.id === p.topic_id)?.icon || "?"}
                  </span>
                  <div>
                    <strong>
                      {data.topics.find((t) => t.id === p.topic_id)?.title.en ||
                        "Homework practice"}
                    </strong>
                    <small>
                      {data.kids.find((k) => k.id === p.child_id)?.nickname} ·{" "}
                      {p.questions_attempted} answers
                    </small>
                  </div>
                  <span className="accuracy">
                    {p.questions_attempted
                      ? Math.round(
                          (p.correct_count / p.questions_attempted) * 100,
                        ) + "%"
                      : "Review"}
                    <small>
                      {p.questions_attempted ? "accuracy" : "open work"}
                    </small>
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="muted empty-text">
              Completed practice will appear here. There’s no rush.
            </p>
          )}
        </section>
        <aside>
          <div className="gentle-card">
            <span>☀</span>
            <h2>Progress takes practice.</h2>
            <p>
              Mistakes are part of learning. Encourage your child to try a hint,
              think it through, and give it another go.
            </p>
            <Link href="/learn">Find a topic together →</Link>
          </div>
          <div className="plan-card">
            <span className="eyebrow">YOUR FAMILY PLAN</span>
            <h3>
              {data?.me.subscription.status === "development"
                ? "Development access"
                : data?.me.subscription.status === "trial"
                  ? "Family trial"
                  : data?.me.subscription.status === "active"
                    ? "Family subscription"
                    : "Check your plan"}
            </h3>
            <p>Two profiles. One learning corner.</p>
            <ProgressBar
              value={
                data ? (data.me.usage.usedMs / data.me.usage.limitMs) * 100 : 0
              }
            />
            <small>
              {data ? Math.ceil(data.me.usage.usedMs / 60000) : 0} voice minutes
              used
            </small>
            <Link href="/settings">Manage plan →</Link>
          </div>
        </aside>
      </div>
    </Shell>
  );
}
