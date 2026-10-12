"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, post, type Kid, type PublicTopic } from "@/lib/client";
import { Shell, PageHeading, Empty, ErrorNote } from "./ui";
export function Learn({ childId = "" }: { childId?: string }) {
  const router = useRouter(),
    [kids, setKids] = useState<Kid[]>([]),
    [topics, setTopics] = useState<PublicTopic[]>([]),
    [selected, setSelected] = useState(childId),
    [busy, setBusy] = useState(""),
    [error, setError] = useState(""),
    [loaded, setLoaded] = useState(false);
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
      />
      <ErrorNote error={error} />
      {!loaded ? (
        <p className="loading">Finding your learning corner…</p>
      ) : !kids.length ? (
        <Empty
          title="Let’s meet your little learner."
          text="Add and authorise a child profile to explore mathematics."
          href="/children"
          label="Add a profile"
        />
      ) : (
        <>
          <div className="learning-toolbar">
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
          {!kid?.consented && (
            <Empty
              title="A quick step for parents."
              text="Please authorise maths tutoring for this profile before starting a lesson."
              href="/children"
              label="Manage authorisation"
            />
          )}
          <div className="topic-grid">
            {topics
              .filter((t) => t.year === kid?.school_year)
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
                    YEAR {topic.year} · MATHEMATICS
                  </span>
                  <h2>{topic.title[kid?.language || "mt"]}</h2>
                  <p>{topic.description}</p>
                  <div className="topic-bottom">
                    <span>{topic.steps} small steps · ~5 min</span>
                    <button
                      className="arrow-button"
                      aria-label={"Start " + topic.title.en}
                      disabled={!kid?.consented || !!busy}
                      onClick={() => void start(topic)}
                    >
                      {busy === topic.id ? "…" : "→"}
                    </button>
                  </div>
                </article>
              ))}
          </div>
          {!topics.filter((t) => t.year === kid?.school_year).length && (
            <Empty
              title="Good lessons take care."
              text="Topics for this school year are awaiting teacher approval. Check back after review."
            />
          )}
          <div className="info-strip">
            <span>✦</span>
            <p>
              Ħabib is an AI tutor. It will guide with hints and questions. A
              trusted adult is always the best person to ask for help.
            </p>
          </div>
        </>
      )}
    </Shell>
  );
}
