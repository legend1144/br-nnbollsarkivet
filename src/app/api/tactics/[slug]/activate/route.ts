import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json({ error: { code: "NOT_FOUND", message: "Route removed." } }, { status: 404 });
}
