"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api, post, type Kid, type PublicTopic } from "@/lib/client";
import { Shell, PageHeading, Empty, ErrorNote } from "./ui";
import { subjects, type Subject } from "@/lib/subjects";
import { programmeCoverage, sourceResearch } from "@/lib/programme-coverage";
export function Learn({ childId = "" }: { childId?: string }) {
  const router = useRouter(),
    [kids, setKids] = useState<Kid[]>([]),
    [topics, setTopics] = useState<PublicTopic[]>([]),
    [selected, setSelected] = useState(childId),
    [busy, setBusy] = useState(""),
    [error, setError] = useState(""),
    [loaded, setLoaded] = useState(false);
  const [subject, setSubject] = useState<Subject>("maths");
  useEffect(() => {
    Promise.all([api("children"), api("curriculum")])
      .then(([k, t]) => {
        setKids(k.children);
        setTopics(t.topics);
        setSelected(childId || k.children[0]?.id || "");
        setLoaded(true);
      })
      .catch((e) => setError(e.message));
  }, [childId]);
  const kid = kids.find((k) => k.id === selected);
  const canLearn = subject === "maths" ? kid?.consented : kid?.school_consented;
  const subjectName = subjects.find((s) => s.id === subject)!.title[
    kid?.language || "mt"
  ];
  async function start(topic: PublicTopic) {
    setBusy(topic.id);
    setError("");
    try {
      const result = await post("sessions", {
        childId: selected,
        topicId: topic.id,
      });
      router.push("/tutor?session=" + result.id);
    } catch (e) {
      setError((e as Error).message);
      setBusy("");
    }
  }
  return (
    <Shell>
      <PageHeading
        eyebrow="THE LEARNING CORNER"
        title="What will we discover today?"
        description="Choose a topic. Take your time. Let curiosity lead the way."
        action={
          <Link
            className="button secondary"
            href={"/homework?child=" + selected}
          >
            Scan maths homework →
          </Link>
        }
      />
      <ErrorNote error={error} />
      {!loaded ? (
        <p className="loading">Finding your learning corner…</p>
      ) : !kids.length ? (
        <Empty
          title="Let’s meet your little learner."
          text="Add and authorise a child profile to explore school subjects."
          href="/children"
          label="Add a profile"
        />
      ) : (
        <>
          <div className="learning-toolbar">
            <label>
              Subject
              <select
                aria-label="Subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value as Subject)}
              >
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.title[kid?.language || "mt"]}
                  </option>
                ))}
              </select>
            </label>
            <div className="kid-tabs">
              {kids.map((k, i) => (
                <button
                  key={k.id}
                  className={selected === k.id ? "selected" : ""}
                  onClick={() => setSelected(k.id)}
                >
                  <span className={"kid-avatar tiny color-" + i}>
                    {k.nickname.charAt(0)}
                  </span>
                  {k.nickname}
                </button>
              ))}
            </div>
            <span>
              Year {kid?.school_year} ·{" "}
              {kid?.language === "mt" ? "Malti" : "English"}
            </span>
          </div>
          {!canLearn && (
            <Empty
              title="A quick step for parents."
              text="Please authorise this subject for the profile in My children before starting."
              href="/children"
              label="Manage authorisation"
            />
          )}
          <p className="curriculum-note">
            Malta national curriculum · Years 4–6. Official source research is
            underway. These draft programmes cover part of the school
            curriculum; complete outcome mapping, past-paper review and teacher
            approval are pending.{" "}
            <a
              href="https://curriculum.gov.mt/"
              target="_blank"
              rel="noreferrer"
            >
              Official curriculum portal →
            </a>
          </p>
          <details className="programme-coverage">
            <summary>School programme and remaining coverage</summary>
            <p>
              {sourceResearch.downloadedFiles} official syllabus, assessment and
              procedure files collected. The courses below are at different
              stages; this is not complete school or exam coverage.
            </p>
            {programmeCoverage.map((area) => (
              <article key={area.subject}>
                <h3>{area.subject}</h3>
                <p>{area.requirements}</p>
                <p>
                  <strong>Current coverage:</strong> {area.available}
                </p>
                <small>{area.status}</small>
                <div>
                  {area.sources.map((url, index) => (
                    <a key={url} href={url} target="_blank" rel="noreferrer">
                      Official source {index + 1} →{" "}
                    </a>
                  ))}
                </div>
              </article>
            ))}
          </details>
          <div className="topic-grid">
            {topics
              .filter(
                (t) =>
                  t.year === kid?.school_year &&
                  (t.subject || "maths") === subject,
              )
              .map((topic, i) => (
                <article
                  className={"topic-tile shade-" + (i % 3)}
                  key={topic.id}
                >
                  <span className="topic-icon">{topic.icon}</span>
                  <span className="topic-review">
                    {topic.approved
                      ? "Teacher reviewed"
                      : "Test lesson · awaiting review"}
                  </span>
                  <span className="eyebrow">
                    YEAR {topic.year} · {subjectName}
                  </span>
                  <h2>{topic.title[kid?.language || "mt"]}</h2>
                  <p>{topic.description}</p>
                  <div className="topic-bottom">
                    <span>
                      {topic.practiceSteps ?? topic.steps} practice steps
                      {topic.checkSteps
                        ? ` + ${topic.checkSteps} topic checks`
                        : ""}
                    </span>
                    <button
                      className="arrow-button"
                      aria-label={"Start " + topic.title.en}
                      disabled={!canLearn || !!busy}
                      onClick={() => void start(topic)}
                    >
                      {busy === topic.id ? "…" : "→"}
                    </button>
                  </div>
                </article>
              ))}
          </div>
          {!topics.filter(
            (t) =>
              t.year === kid?.school_year && (t.subject || "maths") === subject,
          ).length && (
            <Empty
              title="Good lessons take care."
              text="Topics for this school year are awaiting teacher approval. Check back after review."
            />
          )}
          <div className="info-strip">
            <span>✦</span>
            <p>
              Ħabib is an AI tutor. It can explain the method, show the working
              and help you check your answer. A trusted adult is always the best
              person to ask for help.
            </p>
          </div>
        </>
      )}
    </Shell>
  );
}
