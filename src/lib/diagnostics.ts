import { createHash } from "node:crypto";
// Structured operational signals only. Never pass child input, audio, images, tokens or emails.
export function diagnostic(
  event: string,
  fields: {
    code?: string;
    durationMs?: number;
    provider?: string;
    requestId?: string;
  } = {},
) {
  console.info(
    JSON.stringify({
      event,
      ...fields,
      requestId: fields.requestId
        ? createHash("sha256")
            .update(fields.requestId)
            .digest("hex")
            .slice(0, 12)
        : undefined,
      time: new Date().toISOString(),
    }),
  );
}
