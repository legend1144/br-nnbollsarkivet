import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({ error: { code: "NOT_FOUND", message: "Route removed." } }, { status: 404 });
}

export async function PATCH() {
  return NextResponse.json({ error: { code: "NOT_FOUND", message: "Route removed." } }, { status: 404 });
}

export async function DELETE() {
  return NextResponse.json({ error: { code: "NOT_FOUND", message: "Route removed." } }, { status: 404 });
}
