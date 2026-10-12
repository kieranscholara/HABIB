export async function api<T = any>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const headers = new Headers(options.headers);
  if (options.body && typeof options.body === "string")
    headers.set("Content-Type", "application/json");
  const r = await fetch("/api/v1/" + path, {
    ...options,
    headers,
    cache: "no-store",
  });
  const data = await r.json();
  if (!r.ok)
    throw new Error(data.error?.message || data.error || "Please try again.");
  return data;
}
export const post = <T = any>(path: string, data: unknown) =>
  api<T>(path, { method: "POST", body: JSON.stringify(data) });
export interface Kid {
  id: string;
  nickname: string;
  school_year: number;
  language: "mt" | "en";
  consented: number;
}
export interface PublicTopic {
  id: string;
  year: number;
  title: { en: string; mt: string };
  icon: string;
  description: string;
  steps: number;
  approved: boolean;
}
export interface Me {
  parent: { display_name: string; email: string };
  mode: string;
  subscription: {
    status: string;
    period_end: string;
    cancel_at_period_end: number;
  };
  usage: { usedMs: number; limitMs: number; remainingMs: number };
}
