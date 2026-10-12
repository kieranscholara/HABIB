"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api, post, type Kid, type PublicTopic } from "@/lib/client";
import { Shell, PageHeading, Empty, ErrorNote } from "./ui";
export function HomeworkStart({ childId = "" }: { childId?: string }) {
  const router = useRouter(),
    [kids, setKids] = useState<Kid[]>([]),
    [topics, setTopics] = useState<PublicTopic[]>([]),
    [selected, setSelected] = useState(childId),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [ready, setReady] = useState(false);
  useEffect(() => {
    Promise.all([api("children"), api("curriculum")])
      .then(([k, t]) => {
        setKids(k.children);
        setTopics(t.topics);
        setSelected(childId || k.children[0]?.id || "");
        setReady(true);
      })
      .catch((e) => setError(e.message));
  }, [childId]);
  async function start() {
    setBusy(true);
    setError("");
    try {
      const kid = kids.find((k) => k.id === selected),
        topic = topics.find((t) => t.year === kid?.school_year);
      if (!topic)
        throw new Error(
          "A reviewed lesson for this school year is required first.",
        );
      const result = await post("sessions", {
        childId: selected,
        topicId: topic.id,
      });
      router.push("/tutor?session=" + result.id + "&scan=1");
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }
  return (
    <Shell>
      <PageHeading
        eyebrow="HOMEWORK, ONE STEP AT A TIME"
        title="Let’s work it out together."
        description="Scan a maths question, confirm what we read, and ask for an explanation by chat or voice."
      />
      <ErrorNote error={error} />
      {!ready ? (
        <p className="loading">Getting your family ready…</p>
      ) : !kids.length ? (
        <Empty
          title="Choose a little learner first."
          text="Add and authorise a profile before using the homework helper."
          href="/children"
          label="Add a profile"
        />
      ) : (
        <section className="homework-start-card">
          <span className="empty-symbol">▣</span>
          <h2>A photo. A question. An explanation.</h2>
          <p>
            Use a clear photo of the page. We’ll detect up to five supported
            questions and let you choose one.
          </p>
          <label className="profile-select">
            Who’s learning?
            <select
              value={selected}
              onChange={(e) => setSelected(e.target.value)}
            >
              {kids.map((k) => (
                <option key={k.id} value={k.id}>
                  {k.nickname} · Year {k.school_year}
                </option>
              ))}
            </select>
          </label>
          {!kids.find((k) => k.id === selected)?.consented ? (
            <Link href="/children" className="button">
              Authorise this profile →
            </Link>
          ) : (
            <button
              className="button"
              disabled={busy}
              onClick={() => void start()}
            >
              {busy ? "Preparing…" : "Open homework scanner →"}
            </button>
          )}
          <small>
            Chat works with text. Voice conversation needs Azure; photo
            recognition and natural explanations need an OpenAI API key.
          </small>
        </section>
      )}
    </Shell>
  );
}
