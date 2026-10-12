import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { diagnostic } from "./diagnostics";
export class AppError extends Error {
  constructor(
    public code: string,
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}
export function json(data: unknown, status = 200) {
  return NextResponse.json(data, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}
export function handle(error: unknown) {
  if (error instanceof z.ZodError)
    error = new AppError("VALIDATION_ERROR", "Check the request values.");
  diagnostic("request_error", {
    code: error instanceof AppError ? error.code : "SERVICE_UNAVAILABLE",
  });
  if (error instanceof AppError)
    return json(
      {
        error: {
          code: error.code,
          message: error.message,
          retryable: error.status >= 500,
        },
      },
      error.status,
    );
  if (process.env.APP_ENV !== "production" && error instanceof Error)
    console.error({
      name: error.name,
      locations: error.stack?.split("\n").slice(1, 3),
    });
  return json(
    {
      error: {
        code: "SERVICE_UNAVAILABLE",
        message: "Something went wrong. Please try again.",
        retryable: true,
      },
    },
    503,
  );
}
export function origin(req: NextRequest) {
  const value = req.headers.get("origin");
  const expected =
    process.env.NEXT_PUBLIC_APP_URL ||
    `http${process.env.APP_ENV === "production" ? "s" : ""}://${req.headers.get("host")}`;
  if (!value || value !== new URL(expected).origin)
    throw new AppError("ORIGIN_REJECTED", "Request origin rejected.", 403);
}
export async function bounded(req: NextRequest, max: number) {
  if (Number(req.headers.get("content-length") || 0) > max)
    throw new AppError("FILE_TOO_LARGE", "The file is too large.", 413);
  const reader = req.body?.getReader();
  if (!reader)
    throw new AppError("VALIDATION_ERROR", "A request body is required.");
  const chunks: Uint8Array[] = [];
  let length = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.length;
      if (length > max) {
        await reader.cancel();
        throw new AppError("FILE_TOO_LARGE", "The file is too large.", 413);
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const result = new Uint8Array(length);
  let offset = 0;
  for (const c of chunks) {
    result.set(c, offset);
    offset += c.length;
  }
  return result;
}
export async function body<T>(req: NextRequest, schema: z.ZodType<T>) {
  let value: unknown;
  try {
    value = JSON.parse(new TextDecoder().decode(await bounded(req, 12000)));
  } catch (e) {
    if (e instanceof AppError) throw e;
    throw new AppError("VALIDATION_ERROR", "Invalid JSON.");
  }
  const parsed = schema.safeParse(value);
  if (!parsed.success)
    throw new AppError(
      "VALIDATION_ERROR",
      parsed.error.issues[0]?.message || "Check your input.",
    );
  return parsed.data;
}
export const id = z.string().uuid();
