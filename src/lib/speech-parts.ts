// Divide requests on word boundaries, keeping the whole reply in order.
export function speechParts(text: string, limit = 200): string[] {
  if (!Number.isInteger(limit) || limit < 1)
    throw new Error("Speech part size must be positive.");
  const parts: string[] = [];
  let current = "";
  const sentences = text
    .trim()
    .split(/(?<=[.!?])\s+/)
    .filter(Boolean);
  for (const sentence of sentences) {
    const words = sentence.split(/\s+/).filter(Boolean);
    const normalised = words.join(" ");
    if (normalised.length <= limit) {
      if (current && current.length + normalised.length + 1 > limit) {
        parts.push(current);
        current = "";
      }
      current = current ? `${current} ${normalised}` : normalised;
      continue;
    }
    if (current) {
      parts.push(current);
      current = "";
    }
    for (const word of words) {
      if (current && current.length + word.length + 1 > limit) {
        parts.push(current);
        current = "";
      }
      if (word.length > limit) {
        if (current) {
          parts.push(current);
          current = "";
        }
        for (let start = 0; start < word.length; start += limit)
          parts.push(word.slice(start, start + limit));
      } else current = current ? `${current} ${word}` : word;
    }
  }
  if (current) parts.push(current);
  return parts;
}

export async function playSpeechQueue(
  total: number,
  first: Blob,
  load: (part: number) => Promise<Blob>,
  play: (blob: Blob) => Promise<void>,
  active: () => boolean,
) {
  let blob = first;
  for (let part = 0; part < total && active(); part++) {
    // Consume failures immediately, even when interruption discards prefetch.
    const next =
      part + 1 < total
        ? load(part + 1).then(
            (value) => ({ blob: value }),
            (error: unknown) => ({ error }),
          )
        : null;
    await play(blob);
    if (!active()) return;
    if (next) {
      const result = await next;
      if (!active()) return;
      if ("error" in result) throw result.error;
      blob = result.blob;
    }
  }
}
