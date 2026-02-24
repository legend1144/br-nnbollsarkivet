import { NextResponse } from "next/server";
import type { ApiError, ApiErrorCode } from "@/lib/types";

export function ok<T>(data: T, init?: ResponseInit) {
  return NextResponse.json({ data }, init);
}

export function fail(code: ApiErrorCode, message: string, status: number, details?: unknown) {
  const error: ApiError = { code, message, details };
  return NextResponse.json({ error }, { status });
}
