"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api, post, type PublicTopic } from "@/lib/client";
import { record } from "@/lib/record";
import { preparePhoto } from "@/lib/photo";
import type { Homework } from "@/lib/homework";
import { HomeworkScan, type ScannedQuestion } from "./homework-scan";
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
  input?: string;
  totalMs?: number;
}
interface Lesson {
  session: { step: number; status: string };
  child: { nickname: string; language: "mt" | "en" };
  topic: PublicTopic;
  opening: string;
  turns: Turn[];
}
export function TutorRoom({
  sessionId,
  scan = false,
}: {
  sessionId: string;
  scan?: boolean;
}) {
  const router = useRouter();
  const [lesson, setLesson] = useState<Lesson | null>(null),
    [turns, setTurns] = useState<Turn[]>([]),
    [text, setText] = useState(""),
    [error, setError] = useState(""),
    [state, setState] = useState("idle"),
    [speech, setSpeech] = useState(false),
    [ai, setAi] = useState(false),
    [homework, setHomework] = useState(false),
    [showScanner, setShowScanner] = useState(scan),
    [questions, setQuestions] = useState<ScannedQuestion[]>([]),
    [voiceEnabled, setVoiceEnabled] = useState(false),
    [timing, setTiming] = useState({ transcription: 0, tutor: 0, speech: 0 });
  const stop = useRef<null | (() => Promise<Blob>)>(null),
    abort = useRef<AbortController | null>(null),
    busy = useRef(false),
    audio = useRef<HTMLAudioElement | null>(null),
    audioUrl = useRef<string | null>(null),
    generation = useRef(0),
    voice = useRef(false),
    turnRef = useRef<Turn[]>([]),
    lessonRef = useRef<Lesson | null>(null),
    pending = useRef<{ id: string; text: string } | null>(null),
    lastAudio = useRef<{ turnId: string | null; blob: Blob } | null>(null),
    conversation = useRef<HTMLDivElement | null>(null),
    actions = useRef({ finish: async () => {}, pause: () => {} });
  function updateTurns(values: Turn[]) {
    turnRef.current = values;
    setTurns(values);
  }
  async function load() {
    const data = await api<Lesson>("sessions/" + sessionId);
    lessonRef.current = data;
    setLesson(data);
    updateTurns(data.turns);
  }
  function clearAudio() {
    if (audio.current) {
      audio.current.onended = null;
      audio.current.onerror = null;
      audio.current.pause();
      audio.current.removeAttribute("src");
      audio.current.load();
    }
    if (audioUrl.current) URL.revokeObjectURL(audioUrl.current);
    audioUrl.current = null;
  }
  function controller() {
    abort.current?.abort();
    abort.current = new AbortController();
    return abort.current.signal;
  }
  function switchVoice(enabled: boolean) {
    voice.current = enabled;
    setVoiceEnabled(enabled);
  }
  function cancel() {
    generation.current++;
    abort.current?.abort();
    const end = stop.current;
    stop.current = null;
    if (end) void end().catch(() => {});
    clearAudio();
    busy.current = false;
  }
  function pauseVoice() {
    switchVoice(false);
    cancel();
    setState("idle");
  }
  function fail(e: unknown, current: number) {
    if (current !== generation.current || (e as Error).name === "AbortError")
      return;
    switchVoice(false);
    setError(
      (e as Error).name === "NotAllowedError"
        ? "Allow microphone access or type your question instead."
        : (e as Error).message,
    );
    setState("error");
    busy.current = false;
  }
  useEffect(() => {
    void load().catch((e) => setError(e.message));
    api("status")
      .then((d) => {
        setSpeech(d.speechConfigured);
        setAi(d.conversationConfigured);
        setHomework(d.homeworkConfigured);
      })
      .catch((e) => setError(e.message));
    const visibility = () => {
      if (document.hidden) actions.current.pause();
    };
    document.addEventListener("visibilitychange", visibility);
    return () => {
      document.removeEventListener("visibilitychange", visibility);
      generation.current++;
      abort.current?.abort();
      const end = stop.current;
      stop.current = null;
      if (end) void end().catch(() => {});
      clearAudio();
    };
  }, [sessionId]);
  useEffect(() => {
    conversation.current?.scrollTo({
      top: conversation.current.scrollHeight,
      behavior: "smooth",
    });
  }, [turns, state, questions]);
  async function submit(input = text, transcription = 0) {
    if (busy.current || !input.trim()) return;
    busy.current = true;
    clearAudio();
    setError("");
    setState("thinking");
    const current = generation.current,
      start = performance.now(),
      wasVoice = voice.current;
    if (!pending.current || pending.current.text !== input)
      pending.current = { id: crypto.randomUUID(), text: input };
    const history = turnRef.current
      .flatMap((t) => [
        ...(t.input ? [{ role: "user", text: t.input }] : []),
        { role: "assistant", text: t.text },
      ])
      .slice(-8)
      .map((h) => ({ ...h, text: h.text.slice(0, 500) }));
    try {
      const reply = await api<Turn>(`sessions/${sessionId}/turns`, {
        method: "POST",
        body: JSON.stringify({
          clientTurnId: pending.current.id,
          text: input,
          history,
          conversation: true,
        }),
        signal: controller(),
      });
      if (current !== generation.current) return;
      if (!turnRef.current.some((t) => t.id === reply.id))
        updateTurns([
          ...turnRef.current,
          {
            ...reply,
            input,
            totalMs: Math.round(performance.now() - start) + transcription,
          },
        ]);
      pending.current = null;
      setText("");
      setTiming({ transcription, tutor: reply.tutorMs, speech: 0 });
      setState("idle");
      busy.current = false;
      if (reply.safetyState === "escalate") switchVoice(false);
      if (wasVoice) await play(reply.id, reply.safetyState !== "escalate");
    } catch (e) {
      fail(e, current);
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
      const result = await api(`sessions/${sessionId}/transcribe`, {
        method: "POST",
        headers: {
          "Content-Type": "audio/wav",
          "X-Request-Id": crypto.randomUUID(),
        },
        body: blob,
        signal: controller(),
      });
      if (current !== generation.current) return;
      const duration = Math.round(performance.now() - start);
      if (
        voice.current &&
        result.confidence >= 0.85 &&
        /^(stop|stop conversation|pause|waqqaf|waqqaf il-konversazzjoni|pawża)[.!?]?$/i.test(
          result.text.trim(),
        )
      ) {
        pauseVoice();
        setText("");
        return;
      }
      setText(result.text);
      setTiming({ transcription: duration, tutor: 0, speech: 0 });
      busy.current = false;
      if (
        voice.current &&
        typeof result.confidence === "number" &&
        result.confidence >= 0.85
      )
        await submit(result.text, duration);
      else setState("confirming");
    } catch (e) {
      fail(e, current);
    }
  }
  async function beginRecording(automatic = false) {
    if (busy.current) return;
    busy.current = true;
    clearAudio();
    setError("");
    setState("permission");
    const current = generation.current;
    try {
      if (!navigator.mediaDevices?.getUserMedia)
        throw new Error("Microphone access needs HTTPS. You can type instead.");
      const end = await record(
        () => {
          if (current === generation.current) void actions.current.finish();
        },
        automatic
          ? {
              onSilence: () => {
                if (current === generation.current)
                  void actions.current.finish();
              },
              onQuiet: () => {
                if (current !== generation.current) return;
                actions.current.pause();
                setError(
                  "I didn’t hear speech. Start the conversation when you’re ready.",
                );
              },
            }
          : undefined,
      );
      if (current !== generation.current) {
        await end();
        return;
      }
      stop.current = end;
      setState(automatic ? "listening" : "recording");
    } catch (e) {
      fail(e, current);
    }
  }
  async function microphone() {
    if (stop.current) {
      await finish();
      return;
    }
    if (busy.current) return;
    switchVoice(false);
    await beginRecording();
  }
  async function play(
    turnId: string | null = turnRef.current.at(-1)?.id || null,
    continueListening = false,
  ) {
    if (busy.current) return;
    busy.current = true;
    clearAudio();
    setState("speaking");
    setError("");
    const current = generation.current,
      start = performance.now();
    try {
      let blob =
        lastAudio.current?.turnId === turnId
          ? lastAudio.current.blob
          : undefined;
      if (!blob) {
        const r = await fetch(`/api/v1/sessions/${sessionId}/speech`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ requestId: crypto.randomUUID(), turnId }),
          signal: controller(),
        });
        if (!r.ok) throw new Error((await r.json()).error.message);
        blob = await r.blob();
      }
      if (current !== generation.current) return;
      lastAudio.current = { turnId, blob };
      audioUrl.current = URL.createObjectURL(blob);
      const player = audio.current || new Audio();
      audio.current = player;
      player.src = audioUrl.current;
      player.onended = () => {
        if (current !== generation.current) return;
        busy.current = false;
        setState("idle");
        if (continueListening && voice.current) void beginRecording(true);
      };
      player.onerror = () =>
        fail(
          new Error("Audio could not play. Tap Listen to hear the caption."),
          current,
        );
      await player.play();
      setTiming((t) => ({
        ...t,
        speech: Math.round(performance.now() - start),
      }));
    } catch (e) {
      fail(e, current);
    }
  }
  async function unlockAudio() {
    // Use the same audio element for subsequent replies on browsers requiring a user gesture.
    const b = new ArrayBuffer(364),
      v = new DataView(b);
    const word = (i: number, s: string) => {
      for (let j = 0; j < s.length; j++) v.setUint8(i + j, s.charCodeAt(j));
    };
    word(0, "RIFF");
    v.setUint32(4, 356, true);
    word(8, "WAVE");
    word(12, "fmt ");
    v.setUint32(16, 16, true);
    v.setUint16(20, 1, true);
    v.setUint16(22, 1, true);
    v.setUint32(24, 16000, true);
    v.setUint32(28, 32000, true);
    v.setUint16(32, 2, true);
    v.setUint16(34, 16, true);
    word(36, "data");
    v.setUint32(40, 320, true);
    const url = URL.createObjectURL(new Blob([b], { type: "audio/wav" }));
    const player = audio.current || new Audio();
    audio.current = player;
    player.src = url;
    try {
      await player.play();
    } catch {
      /* A blocked reply will show the normal tap-to-play fallback. */
    } finally {
      player.pause();
      URL.revokeObjectURL(url);
    }
  }
  async function startVoice() {
    if (busy.current) return;
    setError("");
    setState("permission");
    busy.current = true;
    const current = generation.current;
    switchVoice(true);
    await unlockAudio();
    if (current !== generation.current || !voice.current) return;
    busy.current = false;
    await beginRecording(true);
  }
  async function interrupt() {
    cancel();
    setState("idle");
    if (voice.current) await beginRecording(true);
  }
  async function photo(file: File) {
    if (busy.current) return;
    pauseVoice();
    busy.current = true;
    setState("scanning");
    setError("");
    setQuestions([]);
    const current = generation.current;
    try {
      const image = await preparePhoto(file);
      const result = await api(`sessions/${sessionId}/homework`, {
        method: "POST",
        headers: { "Content-Type": "image/jpeg" },
        body: image,
        signal: controller(),
      });
      if (current !== generation.current) return;
      setQuestions(result.questions);
      setState("idle");
    } catch (e) {
      fail(e, current);
    } finally {
      if (current === generation.current) busy.current = false;
    }
  }
  async function confirmHomework(question: Homework) {
    pauseVoice();
    const result = await post<{ id: string }>(
      `sessions/${sessionId}/homework/confirm`,
      question,
    );
    setQuestions([]);
    lastAudio.current = null;
    setText("");
    pending.current = null;
    if (result.id !== sessionId) router.push("/tutor?session=" + result.id);
    else {
      await load();
      setShowScanner(false);
    }
  }
  async function end() {
    pauseVoice();
    try {
      await post(`sessions/${sessionId}/end`, {});
      router.push("/learn");
    } catch (e) {
      setError((e as Error).message);
    }
  }
  actions.current = { finish, pause: pauseVoice };
  const last = turns.at(-1),
    done = last?.complete || lesson?.session.status === "complete",
    progress =
      ((last?.step ?? lesson?.session.step ?? 0) / (lesson?.topic.steps || 1)) *
      100,
    working = [
      "recording",
      "listening",
      "permission",
      "uploading",
      "thinking",
      "speaking",
      "scanning",
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
                Ask why. Ask again.
                <br />
                <strong>Understanding takes conversation.</strong>
              </p>
            </div>
            <div className="voice-note">
              {speech
                ? "● Voice is available"
                : "Text learning is ready. Voice needs setup."}
            </div>
            <button
              className="button secondary full scan-toggle"
              disabled={working}
              onClick={() => setShowScanner(!showScanner)}
            >
              {showScanner ? "Close scanner" : "Scan homework"}
            </button>
            {!homework && showScanner && (
              <p className="provider-note">
                Photo recognition needs an OpenAI API key. You can still chat
                about this lesson.
              </p>
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
              <span className="online">LET’S TALK IT THROUGH</span>
            </div>
            {showScanner && (
              <HomeworkScan
                disabled={working || !homework}
                questions={questions}
                onFile={photo}
                onConfirm={confirmHomework}
                onDiscard={() => setQuestions([])}
              />
            )}
            <div
              className="conversation"
              ref={conversation}
              lang={lang}
              aria-live="polite"
            >
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
              {done && (
                <div className="lesson-complete">
                  <span>✦</span>
                  <h3>A little more understanding.</h3>
                  <p>
                    Your practice is saved. You can ask a follow-up question or
                    take a break.
                  </p>
                  <Link href="/learn" className="button small">
                    Choose another topic →
                  </Link>
                </div>
              )}
            </div>
            <div className="controls">
              <div
                className={"voice-session " + (voiceEnabled ? "active" : "")}
              >
                <div>
                  <strong>
                    {voiceEnabled
                      ? "Voice conversation is on"
                      : "Talk to Ħabib"}
                  </strong>
                  <span>
                    {voiceEnabled
                      ? state === "listening"
                        ? "Listening — pause to send."
                        : state === "confirming"
                          ? "Check the transcript before we continue."
                          : state === "speaking"
                            ? "Speaking — you can interrupt."
                            : "Working on your reply…"
                      : "Start once. Speak, pause, and hear a reply."}
                  </span>
                </div>
                {voiceEnabled ? (
                  <button
                    className="button secondary small"
                    onClick={pauseVoice}
                  >
                    Stop conversation
                  </button>
                ) : (
                  <button
                    className="button small"
                    disabled={!speech || working}
                    onClick={() => void startVoice()}
                  >
                    Start voice conversation
                  </button>
                )}
              </div>
              {!ai && (
                <p className="provider-note">
                  Natural follow-up explanations need an OpenAI API key. Guided
                  practice still works.
                </p>
              )}
              <div className="speech-controls">
                <button
                  className="listen"
                  disabled={!speech || working}
                  onClick={() => void play()}
                >
                  ◖ {lang === "mt" ? "Isma’ lil Ħabib" : "Listen to Ħabib"}
                </button>
                {state === "speaking" && (
                  <button
                    className="text-button"
                    onClick={() => void interrupt()}
                  >
                    {voiceEnabled ? "Interrupt & speak" : "Stop audio"}
                  </button>
                )}
              </div>
              <div className="mic-row">
                <button
                  className={
                    "mic " +
                    (["recording", "listening"].includes(state)
                      ? "recording"
                      : "")
                  }
                  aria-label={
                    stop.current ? "Stop recording" : "Start recording"
                  }
                  disabled={
                    !speech ||
                    (working && !["recording", "listening"].includes(state))
                  }
                  onClick={() => void microphone()}
                >
                  {["recording", "listening"].includes(state) ? "■" : "♩"}
                </button>
                <div>
                  <strong>
                    {state === "recording"
                      ? "Recording… tap to stop"
                      : state === "listening"
                        ? "Listening… pause when you finish"
                        : state === "uploading"
                          ? "Hearing your question…"
                          : state === "thinking"
                            ? "Thinking…"
                            : state === "scanning"
                              ? "Reading the homework…"
                              : state === "permission"
                                ? "Allow microphone access…"
                                : lang === "mt"
                                  ? "Agħfas biex titkellem"
                                  : "Tap to speak"}
                  </strong>
                  <span>Or ask a question in chat below</span>
                </div>
              </div>
              {state === "confirming" && (
                <p className="confirm-note">
                  Please check the recognised words and numbers, then Send.
                  Voice conversation will continue after your reply.
                </p>
              )}
              <form
                className="answer-form"
                onSubmit={(e) => {
                  e.preventDefault();
                  void submit(text, timing.transcription);
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
                    lang === "mt"
                      ? "Staqsi jew wieġeb hawn…"
                      : "Ask a question or answer here…"
                  }
                />
                <button
                  aria-label="Send answer"
                  disabled={working || !text.trim()}
                >
                  ↑
                </button>
              </form>
              <p className="privacy-caption">
                Audio and photos are discarded. Conversation context stays in
                this tab. Stop at any time.
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
