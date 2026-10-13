"use client";
import { useEffect, useState } from "react";
import { api, post, type Kid } from "@/lib/client";
import { Shell, PageHeading, ErrorNote } from "@/components/ui";
export default function Page() {
  const [kids, setKids] = useState<Kid[]>([]),
    [editing, setEditing] = useState<Kid | null>(null),
    [show, setShow] = useState(false),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [deleteId, setDeleteId] = useState<string | null>(null);
  async function refresh() {
    try {
      setKids((await api("children")).children);
    } catch (e) {
      setError((e as Error).message);
    }
  }
  useEffect(() => {
    void refresh();
  }, []);
  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const values = Object.fromEntries(new FormData(e.currentTarget));
    try {
      const input = {
        nickname: values.nickname,
        schoolYear: Number(values.schoolYear),
        language: values.language,
      };
      if (editing)
        await api("children/" + editing.id, {
          method: "PATCH",
          body: JSON.stringify(input),
        });
      else await post("children", input);
      setShow(false);
      setEditing(null);
      await refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function authorise(kid: Kid, upgrade = false) {
    setBusy(true);
    setError("");
    try {
      if (kid.consented && !upgrade)
        await api(`children/${kid.id}/consent`, { method: "DELETE" });
      else
        await post(`children/${kid.id}/consent`, {
          authorised: true,
          policyVersion: "1.1",
        });
      await refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Shell>
      <PageHeading
        eyebrow="PARENT CONTROLS"
        title="Your little learners."
        description="A personal learning space for each child. You’re always in control."
        action={
          <button
            className="button"
            disabled={kids.length >= 2}
            onClick={() => {
              setEditing(null);
              setShow(!show);
            }}
          >
            + Add a child
          </button>
        }
      />
      <ErrorNote error={error} />
      {show && (
        <section className="form-card">
          <h2>{editing ? "Edit profile" : "A new little learner"}</h2>
          <form
            className="stack-form"
            onSubmit={save}
            key={editing?.id || "new"}
          >
            <label>
              Nickname
              <input
                name="nickname"
                required
                maxLength={30}
                defaultValue={editing?.nickname}
                placeholder="Use a nickname, not a full name"
              />
            </label>
            <div className="form-columns">
              <label>
                School year
                <select
                  name="schoolYear"
                  defaultValue={editing?.school_year || 5}
                >
                  <option value="4">Year 4</option>
                  <option value="5">Year 5</option>
                  <option value="6">Year 6</option>
                </select>
              </label>
              <label>
                Learning language
                <select
                  name="language"
                  defaultValue={editing?.language || "mt"}
                >
                  <option value="mt">Malti</option>
                  <option value="en">English</option>
                </select>
              </label>
            </div>
            <div className="button-row">
              <button className="button" disabled={busy}>
                Save profile →
              </button>
              <button
                type="button"
                className="button secondary"
                onClick={() => setShow(false)}
              >
                Cancel
              </button>
            </div>
          </form>
        </section>
      )}
      <div className="children-grid">
        {kids.map((kid, i) => (
          <section className="child-profile-card" key={kid.id}>
            <div className={"kid-avatar large color-" + i}>
              {kid.nickname.charAt(0)}
            </div>
            <h2>{kid.nickname}</h2>
            <p>
              Year {kid.school_year} ·{" "}
              {kid.language === "mt" ? "Malti" : "English"}
            </p>
            <span
              className={"status-pill " + (kid.consented ? "green" : "amber")}
            >
              {kid.consented ? "Authorised to learn" : "Authorisation required"}
            </span>
            <div className="consent-explanation">
              <h4>Parent authorisation</h4>
              <p>
                {kid.consented
                  ? kid.school_consented
                    ? "You have authorised Maths, English, Maltese and Science tutoring. Withdrawing it immediately ends active lessons."
                    : "This profile has maths-only authorisation. You can also authorise the other school subjects below."
                  : "By authorising, you confirm you are the parent or legal guardian and allow Maths, English, Maltese and Science tutoring under privacy notice v1.1."}
              </p>
              <button
                className="button secondary full"
                disabled={busy}
                onClick={() => void authorise(kid)}
              >
                {kid.consented
                  ? "Withdraw authorisation"
                  : "I authorise school tutoring"}
              </button>
              {!!kid.consented && !kid.school_consented && (
                <button
                  className="button full"
                  disabled={busy}
                  onClick={() => void authorise(kid, true)}
                >
                  Authorise other subjects
                </button>
              )}
            </div>
            <div className="profile-actions">
              <button
                onClick={() => {
                  setEditing(kid);
                  setShow(true);
                }}
              >
                Edit profile
              </button>
              <button onClick={() => setDeleteId(kid.id)}>
                Delete profile
              </button>
            </div>
            {deleteId === kid.id && (
              <div className="delete-confirm">
                <p>Delete this profile and its learning records permanently?</p>
                <button
                  className="danger-button"
                  disabled={busy}
                  onClick={async () => {
                    setBusy(true);
                    try {
                      await api("children/" + kid.id, { method: "DELETE" });
                      setDeleteId(null);
                      await refresh();
                    } catch (e) {
                      setError((e as Error).message);
                    } finally {
                      setBusy(false);
                    }
                  }}
                >
                  Yes, delete profile
                </button>
                <button
                  className="text-button"
                  onClick={() => setDeleteId(null)}
                >
                  Keep profile
                </button>
              </div>
            )}
          </section>
        ))}
        {kids.length < 2 && (
          <button
            className="add-profile-card"
            onClick={() => {
              setEditing(null);
              setShow(true);
            }}
          >
            <span>+</span>
            <strong>Add a child profile</strong>
            <small>Your family plan includes two profiles.</small>
          </button>
        )}
      </div>
      <div className="info-strip">
        <span>♧</span>
        <p>
          Children use your parent-controlled session. They never need their own
          email or password. Use test profiles in development mode.
        </p>
      </div>
    </Shell>
  );
}
