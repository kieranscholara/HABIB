"use client";
import { useEffect, useRef, useState } from "react";

export function CameraCapture({
  onPhoto,
  onClose,
}: {
  onPhoto: (file: File) => void;
  onClose: () => void;
}) {
  const video = useRef<HTMLVideoElement>(null),
    stream = useRef<MediaStream | null>(null);
  const [ready, setReady] = useState(false),
    [error, setError] = useState(""),
    [saving, setSaving] = useState(false);
  useEffect(() => {
    let active = true;
    const visibility = () => {
      if (document.hidden) {
        stream.current?.getTracks().forEach((track) => track.stop());
        stream.current = null;
        onClose();
      }
    };
    document.addEventListener("visibilitychange", visibility);
    async function open() {
      try {
        if (!navigator.mediaDevices?.getUserMedia)
          throw new Error(
            "Camera access needs HTTPS or localhost. Use Upload photo instead.",
          );
        const camera = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: "environment" },
            width: { ideal: 1600 },
            height: { ideal: 1200 },
          },
          audio: false,
        });
        if (!active) {
          camera.getTracks().forEach((track) => track.stop());
          return;
        }
        stream.current = camera;
        if (video.current) {
          video.current.srcObject = camera;
          await video.current.play();
        }
      } catch (e) {
        if (!active) return;
        stream.current?.getTracks().forEach((track) => track.stop());
        stream.current = null;
        const name = (e as Error).name;
        setError(
          name === "NotAllowedError"
            ? "Allow camera access in your browser, or use Upload photo."
            : name === "NotFoundError"
              ? "No camera was found. Use Upload photo instead."
              : (e as Error).message,
        );
      }
    }
    void open();
    return () => {
      active = false;
      document.removeEventListener("visibilitychange", visibility);
      stream.current?.getTracks().forEach((track) => track.stop());
      stream.current = null;
    };
  }, []);
  async function capture() {
    if (!video.current?.videoWidth || !ready || saving) return;
    setSaving(true);
    setError("");
    try {
      const canvas = document.createElement("canvas"),
        scale = Math.min(
          1,
          1600 / Math.max(video.current.videoWidth, video.current.videoHeight),
        );
      canvas.width = Math.round(video.current.videoWidth * scale);
      canvas.height = Math.round(video.current.videoHeight * scale);
      const ctx = canvas.getContext("2d");
      if (!ctx)
        throw new Error("Could not capture the photo. Try Upload photo.");
      ctx.drawImage(video.current, 0, 0, canvas.width, canvas.height);
      const blob = await new Promise<Blob>((accept, reject) =>
        canvas.toBlob(
          (value) =>
            value
              ? accept(value)
              : reject(
                  new Error("Could not capture the photo. Please try again."),
                ),
          "image/jpeg",
          0.85,
        ),
      );
      if (!video.current) return;
      stream.current?.getTracks().forEach((track) => track.stop());
      stream.current = null;
      onPhoto(new File([blob], "homework-camera.jpg", { type: "image/jpeg" }));
    } catch (e) {
      setError((e as Error).message);
      setSaving(false);
    }
  }
  return (
    <section className="camera-capture" aria-label="Homework camera">
      <p>
        Keep the question inside the picture. Make sure the writing is clear.
      </p>
      <video
        ref={video}
        autoPlay
        playsInline
        muted
        aria-label="Camera preview"
        onLoadedData={() => setReady(true)}
      />
      {error && (
        <p role="alert" className="error-note">
          {error}
        </p>
      )}
      <div className="button-row">
        <button
          className="button"
          type="button"
          disabled={!ready || saving}
          onClick={() => void capture()}
        >
          {saving ? "Capturing…" : "Capture photo"}
        </button>
        <button className="button secondary" type="button" onClick={onClose}>
          Close camera
        </button>
      </div>
    </section>
  );
}
