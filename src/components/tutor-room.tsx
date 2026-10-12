"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api, post, type PublicTopic } from "@/lib/client";
import { record } from "@/lib/record";
import { Shell, ErrorNote, ProgressBar } from "./ui";
interface Turn {
  id: string;
  text: string;
  correct: boolean | null;
  step: number;
  totalSteps: number;
  complete: boolean;
  type: string;
  safetyState: string;
  tutorMs: number;
}
interface Lesson {
  session: { step: number; status: string };
  child: { nickname: string; language: "mt" | "en" };
  topic: PublicTopic;
  opening: string;
  turns: Turn[];
}
export function TutorRoom({ sessionId }: { sessionId: string }) {
  const router = useRouter(),
    [lesson, setLesson] = useState<Lesson | null>(null),
    [turns, setTurns] = useState<
      (Turn & { input?: string; totalMs?: number })[]
    >([]),
    [text, setText] = useState(""),
    [error, setError] = useState(""),
    [state, setState] = useState("idle"),
    [speech, setSpeech] = useState(false),
    [homework, setHomework] = useState(false),
    [extraction, setExtraction] = useState<{
      problem: string;
      a: number;
      b: number;
      operator: string;
    } | null>(null),
    [timing, setTiming] = useState<{
      transcription: number;
      tutor: number;
      speech: number;
    }>({ transcription: 0, tutor: 0, speech: 0 });
  const stop = useRef<null | (() => Promise<Blob>)>(null),
    abort = useRef<AbortController | null>(null),
    busy = useRef(false),
    audio = useRef<HTMLAudioElement | null>(null),
    audioUrl = useRef<string | null>(null),
    generation = useRef(0),
    pending = useRef<{ id: string; text: string } | null>(null),
    conversation = useRef<HTMLDivElement | null>(null);
  async function load() {
    const data = await api<Lesson>("sessions/" + sessionId);
    setLesson(data);
    setTurns(data.turns);
  }
  useEffect(() => {
    void load().catch((e) => setError(e.message));
    api("status").then((d) => {
      setSpeech(d.speechConfigured);
      setHomework(d.homeworkConfigured);
    });
    return () => {
      generation.current++;
      abort.current?.abort();
      void stop.current?.();
      audio.current?.pause();
      if (audioUrl.current) URL.revokeObjectURL(audioUrl.current);
    };
  }, [sessionId]);
  useEffect(() => {
    conversation.current?.scrollTo({
      top: conversation.current.scrollHeight,
      behavior: "smooth",
    });
  }, [turns, state]);
  function control() {
    abort.current?.abort();
    abort.current = new AbortController();
    return abort.current.signal;
  }
  function clearAudio() {
    audio.current?.pause();
    audio.current = null;
    if (audioUrl.current) URL.revokeObjectURL(audioUrl.current);
    audioUrl.current = null;
  }
  async function send() {
    if (busy.current || !text.trim()) return;
    busy.current = true;
    clearAudio();
    setState("thinking");
    setError("");
    const current = generation.current,
      start = performance.now();
    if (!pending.current || pending.current.text !== text)
      pending.current = { id: crypto.randomUUID(), text };
    try {
      const result = await api<Turn>(`sessions/${sessionId}/turns`, {
        method: "POST",
        body: JSON.stringify({ clientTurnId: pending.current.id, text }),
        signal: control(),
      });
      if (current !== generation.current) return;
      setTurns((t) =>
        t.some((v) => v.id === result.id)
          ? t
          : [
              ...t,
              {
                ...result,
                input: text,
                totalMs:
                  Math.round(performance.now() - start) + timing.transcription,
              },
            ],
      );
      setTiming((t) => ({ ...t, tutor: result.tutorMs, speech: 0 }));
      setText("");
      pending.current = null;
      setState("idle");
    } catch (e) {
      if ((e as Error).name !== "AbortError") {
        setError((e as Error).message);
        setState("error");
      }
    } finally {
      if (current === generation.current) busy.current = false;
    }
  }
  async function finish() {
    if (!stop.current) return;
    const end = stop.current;
    stop.current = null;
    setState("uploading");
    const current = generation.current,
      start = performance.now();
    try {
      const blob = await end();
      if (current !== generation.current) return;
      const data = await api(`sessions/${sessionId}/transcribe`, {
        method: "POST",
        headers: {
          "Content-Type": "audio/wav",
          "X-Request-Id": crypto.randomUUID(),
        },
        body: blob,
        signal: control(),
      });
      if (current !== generation.current) return;
      setText(data.text);
      setTiming({
        transcription: Math.round(performance.now() - start),
        tutor: 0,
        speech: 0,
      });
      setState("confirming");
    } catch (e) {
      if (
        current === generation.current &&
        (e as Error).name !== "AbortError"
      ) {
        setError(
          (e as Error).name === "NotAllowedError"
            ? "Allow microphone access or type your answer below."
            : (e as Error).message,
        );
        setState("error");
      }
    } finally {
      if (current === generation.current) busy.current = false;
    }
  }
  async function microphone() {
    if (stop.current) {
      await finish();
      return;
    }
    if (busy.current) return;
    busy.current = true;
    clearAudio();
    setError("");
    setState("permission");
    const current = generation.current;
    try {
      if (!navigator.mediaDevices?.getUserMedia)
        throw new Error("Microphone access needs HTTPS. You can type instead.");
      const end = await record(() => void finish());
      if (current !== generation.current) {
        await end();
        return;
      }
      stop.current = end;
      setState("recording");
    } catch (e) {
      setError(
        (e as Error).name === "NotAllowedError"
          ? "Microphone access was denied. You can type instead."
          : (e as Error).message,
      );
      setState("error");
      busy.current = false;
    }
  }
  async function listen() {
    if (busy.current) return;
    busy.current = true;
    clearAudio();
    setState("speaking");
    setError("");
    const current = generation.current,
      start = performance.now();
    try {
      const r = await fetch(`/api/v1/sessions/${sessionId}/speech`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestId: crypto.randomUUID(),
          turnId: turns.at(-1)?.id || null,
        }),
        signal: control(),
      });
      if (!r.ok) throw new Error((await r.json()).error.message);
      const blob = await r.blob();
      if (current !== generation.current) return;
      audioUrl.current = URL.createObjectURL(blob);
      const player = new Audio(audioUrl.current);
      audio.current = player;
      player.onended = () => {
        setState("idle");
        busy.current = false;
      };
      player.onerror = () => {
        setError("Could not play the reply. Tap Listen to retry.");
        setState("error");
        busy.current = false;
      };
      await player.play();
      setTiming((t) => ({
        ...t,
        speech: Math.round(performance.now() - start),
      }));
    } catch (e) {
      if (
        current === generation.current &&
        (e as Error).name !== "AbortError"
      ) {
        setError((e as Error).message);
        setState("error");
        busy.current = false;
      }
    }
  }
  async function photo(file: File) {
    if (busy.current) return;
    busy.current = true;
    setError("");
    setState("uploading");
    try {
      const result = await api(`sessions/${sessionId}/homework`, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
        signal: control(),
      });
      setExtraction(result);
      setState("idle");
    } catch (e) {
      setError((e as Error).message);
      setState("error");
    } finally {
      busy.current = false;
    }
  }
  async function end() {
    generation.current++;
    abort.current?.abort();
    if (stop.current) {
      void stop.current();
      stop.current = null;
    }
    clearAudio();
    try {
      await post(`sessions/${sessionId}/end`, {});
      router.push("/learn");
    } catch (e) {
      setError((e as Error).message);
    }
  }
  const last = turns.at(-1),
    done = last?.complete || lesson?.session.status === "complete",
    progress =
      ((last?.step ?? lesson?.session.step ?? 0) / (lesson?.topic.steps || 1)) *
      100,
    working = [
      "recording",
      "permission",
      "uploading",
      "thinking",
      "speaking",
    ].includes(state),
    lang = lesson?.child.language || "mt";
  return (
    <Shell>
      <div className="tutor-heading">
        <Link
          href="/learn"
          onClick={(e) => {
            e.preventDefault();
            void end();
          }}
        >
          ← Learning corner
        </Link>
        <button className="text-button" onClick={() => void end()}>
          End lesson →
        </button>
      </div>
      <ErrorNote error={error} />
      {lesson ? (
        <div className="tutor-layout">
          <aside className="lesson-sidebar">
            <div className="topic-card">
              <span className="eyebrow">TODAY’S EXPLORATION</span>
              <div className="lesson-symbol">{lesson.topic.icon}</div>
              <span className="year">
                YEAR {lesson.topic.year} · MATHEMATICS
              </span>
              <h2>{lesson.topic.title[lang]}</h2>
              <p>{lesson.topic.description}</p>
              <ProgressBar value={progress} />
              <small>{Math.round(progress)}% of lesson steps completed</small>
            </div>
            <div className="note">
              <span>☀</span>
              <p>
                No rush. Mistakes help us learn.
                <br />
                <strong>Try, think, and try again.</strong>
              </p>
            </div>
            <div className="voice-note">
              {speech
                ? "● Voice is available"
                : "Text learning is ready. Voice needs setup."}
            </div>
            {!turns.length && homework && (
              <div className="homework-card">
                <h3>Have a maths question?</h3>
                <p>
                  Photograph one simple calculation. Avoid names, faces and
                  other personal information.
                </p>
                <label className="button secondary full upload-button">
                  Upload a photo
                  <input
                    type="file"
                    accept="image/png,image/jpeg"
                    capture="environment"
                    disabled={working}
                    onChange={(e) => {
                      if (e.target.files?.[0]) void photo(e.target.files[0]);
                      e.target.value = "";
                    }}
                  />
                </label>
              </div>
            )}
          </aside>
          <section className="tutor-card">
            <div className="tutor-top">
              <div className="avatar">✳</div>
              <div>
                <h3>Ħabib · {lesson.child.nickname}</h3>
                <span>
                  AI maths tutor · {lang === "mt" ? "Malti" : "English"}
                </span>
              </div>
              <span className="online">ONE STEP AT A TIME</span>
            </div>
            <div className="conversation" ref={conversation} aria-live="polite">
              <div className="bubble tutor">
                <span>ĦABIB</span>
                <p>{lesson.opening}</p>
              </div>
              {turns.map((t) => (
                <div key={t.id}>
                  {t.input && (
                    <div className="bubble you">
                      <span>YOU</span>
                      <p>{t.input}</p>
                    </div>
                  )}
                  <div
                    className={
                      "bubble tutor " +
                      (t.safetyState === "escalate" ? "safety-bubble" : "")
                    }
                  >
                    <span>ĦABIB {t.correct === true ? "· ✓" : ""}</span>
                    <p>{t.text}</p>
                  </div>
                </div>
              ))}
              {extraction && (
                <div className="photo-confirm">
                  <h3>Is this your question?</h3>
                  <strong>{extraction.problem} = ?</strong>
                  <p>Check the numbers and sign before continuing.</p>
                  <button
                    className="button small"
                    onClick={async () => {
                      try {
                        await post(`sessions/${sessionId}/homework/confirm`, {
                          a: extraction.a,
                          b: extraction.b,
                          operator: extraction.operator,
                        });
                        setExtraction(null);
                        await load();
                      } catch (e) {
                        setError((e as Error).message);
                      }
                    }}
                  >
                    Yes, practise this
                  </button>
                  <button
                    className="text-button"
                    onClick={() => setExtraction(null)}
                  >
                    Discard
                  </button>
                </div>
              )}
              {done && (
                <div className="lesson-complete">
                  <span>✦</span>
                  <h3>A little more understanding.</h3>
                  <p>Your practice is saved. You’ve earned a break!</p>
                  <Link href="/learn" className="button small">
                    Choose another topic →
                  </Link>
                </div>
              )}
            </div>
            <div className="controls">
              <div className="speech-controls">
                <button
                  className="listen"
                  disabled={!speech || working}
                  onClick={() => void listen()}
                >
                  ◖ {lang === "mt" ? "Isma’ lil Ħabib" : "Listen to Ħabib"}
                </button>
                {state === "speaking" && (
                  <button
                    className="text-button"
                    onClick={() => {
                      clearAudio();
                      setState("idle");
                      busy.current = false;
                    }}
                  >
                    Stop audio
                  </button>
                )}
              </div>
              {!done && (
                <>
                  <div className="mic-row">
                    <button
                      className={
                        "mic " + (state === "recording" ? "recording" : "")
                      }
                      aria-label={
                        state === "recording"
                          ? "Stop recording"
                          : "Start recording"
                      }
                      disabled={!speech || (working && state !== "recording")}
                      onClick={() => void microphone()}
                    >
                      {state === "recording" ? "■" : "♩"}
                    </button>
                    <div>
                      <strong>
                        {state === "recording"
                          ? "Recording… tap to stop"
                          : state === "uploading"
                            ? "Listening…"
                            : state === "thinking"
                              ? "Thinking…"
                              : state === "permission"
                                ? "Allow microphone access…"
                                : lang === "mt"
                                  ? "Agħfas biex titkellem"
                                  : "Tap to speak"}
                      </strong>
                      <span>
                        {state === "recording"
                          ? "Up to 30 seconds"
                          : "Or type your answer below"}
                      </span>
                    </div>
                  </div>
                  {state === "confirming" && (
                    <p className="confirm-note">
                      Review the transcript. You can correct words and numbers
                      before sending.
                    </p>
                  )}
                  <form
                    className="answer-form"
                    onSubmit={(e) => {
                      e.preventDefault();
                      void send();
                    }}
                  >
                    <label className="sr-only" htmlFor="answer">
                      Your answer or question
                    </label>
                    <input
                      id="answer"
                      value={text}
                      onChange={(e) => setText(e.target.value)}
                      disabled={working}
                      maxLength={500}
                      placeholder={
                        lang === "mt" ? "Ikteb hawn…" : "Type your answer…"
                      }
                    />
                    <button
                      aria-label="Send answer"
                      disabled={working || !text.trim()}
                    >
                      ↑
                    </button>
                  </form>
                </>
              )}
              <p className="privacy-caption">
                Recordings are processed and discarded. You can stop at any
                time.
              </p>
              {!!(timing.transcription || timing.tutor || timing.speech) && (
                <details className="timing">
                  <summary>Response timing</summary>
                  <p>
                    Transcription {timing.transcription} ms · Tutor{" "}
                    {timing.tutor} ms · Speech {timing.speech} ms
                  </p>
                </details>
              )}
            </div>
          </section>
        </div>
      ) : (
        <p className="loading">Preparing your lesson…</p>
      )}
    </Shell>
  );
}
