import { NextRequest } from "next/server";
import { requireApiUser } from "@/lib/auth/guards";
import { db } from "@/lib/db";
import { fail, ok } from "@/lib/http";
import { normalizeEmail } from "@/lib/utils";

export async function GET(request: NextRequest) {
  const auth = await requireApiUser(request, ["admin"]);
  if (auth.response) return auth.response;

  const emails = await db.allowedEmail.findMany({
    orderBy: { createdAt: "desc" },
  });
  return ok(emails);
}

export async function POST(request: NextRequest) {
  const auth = await requireApiUser(request, ["admin"]);
  if (auth.response) return auth.response;

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return fail("INVALID_INPUT", "Felaktig payload.", 400);
  }

  const rawEmail = typeof payload === "object" && payload !== null ? (payload as { email?: string }).email : undefined;
  if (!rawEmail) {
    return fail("INVALID_INPUT", "E-post krävs.", 400);
  }

  const email = normalizeEmail(rawEmail);
  const row = await db.allowedEmail.upsert({
    where: { email },
    update: { active: true },
    create: { email, active: true },
  });

  return ok(row, { status: 201 });
}
