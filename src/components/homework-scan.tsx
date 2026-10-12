"use client";
import { useEffect, useState } from "react";
import type { Homework } from "@/lib/homework";
import { CameraCapture } from "./camera-capture";
export type ScannedQuestion = Homework & { question: string; problem: string };
export function HomeworkScan({
  disabled,
  questions,
  onFile,
  onConfirm,
  onDiscard,
}: {
  disabled: boolean;
  questions: ScannedQuestion[];
  onFile: (file: File) => Promise<void>;
  onConfirm: (question: Homework) => Promise<void>;
  onDiscard: () => void;
}) {
  const [selected, setSelected] = useState(0),
    [preview, setPreview] = useState<string | null>(null),
    [error, setError] = useState(""),
    [saving, setSaving] = useState(false),
    [camera, setCamera] = useState(false),
    [kind, setKind] = useState<Homework["kind"]>("arithmetic");
  useEffect(() => {
    setSelected(0);
  }, [questions]);
  useEffect(
    () => () => {
      if (preview) URL.revokeObjectURL(preview);
    },
    [preview],
  );
  async function choose(file?: File) {
    if (!file) return;
    setPreview(URL.createObjectURL(file));
    setError("");
    onDiscard();
    try {
      await onFile(file);
    } catch (e) {
      setError((e as Error).message);
    }
  }
  async function confirm(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const values = Object.fromEntries(new FormData(e.currentTarget));
    setSaving(true);
    setError("");
    try {
      await onConfirm({
        kind: values.kind as Homework["kind"],
        a: Number(values.a),
        b: Number(values.b),
        c: Number(values.c || 1),
        operator: (values.operator || "+") as Homework["operator"],
      });
      setPreview(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }
  const question = questions[selected];
  useEffect(() => {
    setKind(questions[selected]?.kind || "arithmetic");
  }, [selected, questions]);
  return (
    <div className="homework-scanner">
      <div className="scan-heading">
        <span>▣</span>
        <div>
          <h3>Scan your homework</h3>
          <p>
            Take a clear photo, choose a question, then work it out with Ħabib.
          </p>
        </div>
      </div>
      <div className="scan-actions">
        <button
          className="button secondary"
          type="button"
          disabled={disabled || saving}
          onClick={() => setCamera(true)}
        >
          Take a photo
        </button>
        <label className="button secondary upload-button">
          Upload photo
          <input
            type="file"
            accept="image/*"
            disabled={disabled || saving}
            onChange={(e) => {
              void choose(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
        </label>
      </div>
      {camera && (
        <CameraCapture
          onClose={() => setCamera(false)}
          onPhoto={(file) => {
            setCamera(false);
            void choose(file);
          }}
        />
      )}
      {error && !question && (
        <p role="alert" className="error-note">
          {error}
        </p>
      )}
      <small>
        Calculations, simple word problems, fractions, percentages and
        rectangles. Avoid names and faces.
      </small>
      {preview && (
        <img
          className="scan-preview"
          src={preview}
          alt="Your homework photo for review"
        />
      )}
      {question && (
        <div className="scan-confirm">
          <h3>Check before we explain.</h3>
          {questions.length > 1 && (
            <div className="question-options">
              {questions.map((q, i) => (
                <button
                  key={i}
                  className={i === selected ? "selected" : ""}
                  disabled={saving}
                  onClick={() => setSelected(i)}
                >
                  {i + 1}. {q.problem}
                </button>
              ))}
            </div>
          )}
          <p>{question.question}</p>
          <form
            className="stack-form"
            key={selected + question.problem}
            onSubmit={confirm}
          >
            <label>
              Question type
              <select
                name="kind"
                value={kind}
                onChange={(e) => setKind(e.target.value as Homework["kind"])}
              >
                <option value="arithmetic">
                  Calculation / simple word problem
                </option>
                <option value="fraction_of">Fraction of an amount</option>
                <option value="percentage_of">Percentage of an amount</option>
                <option value="rectangle_area">Rectangle area</option>
                <option value="rectangle_perimeter">Rectangle perimeter</option>
              </select>
            </label>
            <div className="form-columns">
              <label>
                {kind === "arithmetic"
                  ? "First number"
                  : kind.includes("rectangle")
                    ? "Length"
                    : "Whole amount"}
                <input
                  name="a"
                  type="number"
                  min="0"
                  max="10000"
                  step="any"
                  required
                  defaultValue={question.a}
                />
              </label>
              <label>
                {kind === "fraction_of"
                  ? "Denominator"
                  : kind === "percentage_of"
                    ? "Percentage"
                    : kind.includes("rectangle")
                      ? "Width"
                      : "Second number"}
                <input
                  name="b"
                  type="number"
                  min="0"
                  max="10000"
                  step="any"
                  required
                  defaultValue={question.b}
                />
              </label>
            </div>
            <div className="form-columns">
              <label>
                Operation
                <select name="operator" defaultValue={question.operator}>
                  <option value="+">+</option>
                  <option value="-">−</option>
                  <option value="*">×</option>
                  <option value="/">÷</option>
                </select>
              </label>
              <label>
                Numerator{" "}
                <span className="label-help">Used for a fraction only</span>
                <input
                  name="c"
                  type="number"
                  min="1"
                  max="100"
                  required
                  defaultValue={question.c || 1}
                />
              </label>
            </div>
            {error && (
              <p role="alert" className="error-note">
                {error}
              </p>
            )}
            <div className="button-row">
              <button className="button" disabled={disabled || saving}>
                {saving ? "Preparing…" : "Confirm & explain"}
              </button>
              <button
                className="text-button"
                type="button"
                disabled={saving}
                onClick={() => {
                  onDiscard();
                  setPreview(null);
                }}
              >
                Discard photo
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
