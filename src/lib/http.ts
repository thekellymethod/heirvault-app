import { NextResponse } from "next/server";

export function jsonOk(data: unknown, init: ResponseInit = {}) {
  return new NextResponse(JSON.stringify(data), {
    status: init.status ?? 200,
    headers: {
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
  });
}

export function jsonError(
  message: string,
  status: number = 400,
  code?: string,
  details?: unknown,
) {
  return new NextResponse(
    JSON.stringify({
      error: message,
      code,
      details,
    }),
    {
      status,
      headers: { "Content-Type": "application/json" },
    },
  );
}

