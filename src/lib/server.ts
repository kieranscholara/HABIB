import { AppError } from "./http";
export function azure() {
  const key = process.env.HABIB_SPEECH_KEY || process.env.AZURE_SPEECH_KEY,
    region = process.env.HABIB_SPEECH_REGION || process.env.AZURE_SPEECH_REGION;
  if (
    process.env.HABIB_SPEECH_ENABLED === "false" ||
    !key ||
    !region ||
    !/^[a-z0-9-]+$/.test(region)
  )
    throw new AppError(
      "SPEECH_UNAVAILABLE",
      "Voice is unavailable. You can type your answer instead.",
      503,
    );
  return { key, region };
}
export async function providerFetch(url: string, init: RequestInit) {
  const result = await fetch(url, {
    ...init,
    signal: AbortSignal.timeout(15000),
    cache: "no-store",
  });
  if (!result.ok)
    throw new AppError(
      "PROVIDER_UNAVAILABLE",
      "The provider is unavailable. Please try again.",
      503,
    );
  return result;
}
