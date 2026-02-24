import { NextRequest } from "next/server";
import { requireApiUser } from "@/lib/auth/guards";
import { db } from "@/lib/db";
import { fail, ok } from "@/lib/http";

type Context = {
  params: Promise<{ id: string }>;
};

const allowedRoles = new Set(["member", "referee", "admin"]);

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

  const role =
    typeof payload === "object" && payload !== null && "role" in payload
      ? String((payload as { role: string }).role)
      : "";

  if (!allowedRoles.has(role)) {
    return fail("INVALID_INPUT", "Ogiltig roll.", 400);
  }

  const updated = await db.user.update({
    where: { id },
    data: { role: role as "member" | "referee" | "admin" },
    select: { id: true, email: true, role: true, name: true, updatedAt: true },
  });
  return ok(updated);
}
