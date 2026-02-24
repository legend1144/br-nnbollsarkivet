import { NextRequest } from "next/server";
import { requireApiUser } from "@/lib/auth/guards";
import { db } from "@/lib/db";
import { fail, ok } from "@/lib/http";

type Context = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: NextRequest, context: Context) {
  const auth = await requireApiUser(request, ["admin"]);
  if (auth.response) return auth.response;

  const { id } = await context.params;

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return fail("INVALID_INPUT", "Felaktig payload.", 400);
  }

  const active =
    typeof payload === "object" && payload !== null && "active" in payload
      ? Boolean((payload as { active: boolean }).active)
      : null;
  if (active == null) {
    return fail("INVALID_INPUT", "active krävs.", 400);
  }

  const row = await db.allowedEmail.update({
    where: { id },
    data: { active },
  });
  return ok(row);
}

export async function DELETE(request: NextRequest, context: Context) {
  const auth = await requireApiUser(request, ["admin"]);
  if (auth.response) return auth.response;

  const { id } = await context.params;
  await db.allowedEmail.delete({ where: { id } });
  return ok({ ok: true });
}
