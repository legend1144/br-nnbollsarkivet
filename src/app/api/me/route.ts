import { NextRequest } from "next/server";
import { requireApiUser } from "@/lib/auth/guards";
import { db } from "@/lib/db";
import { fail, ok } from "@/lib/http";
import { profileUpdateSchema } from "@/lib/validation";

export async function GET(request: NextRequest) {
  const auth = await requireApiUser(request);
  if (auth.response) return auth.response;

  const user = await db.user.findUnique({
    where: { id: auth.user!.id },
    select: {
      id: true,
      email: true,
      role: true,
      name: true,
      profileImageUrl: true,
      strengths: true,
      weaknesses: true,
      otherInfo: true,
      createdAt: true,
    },
  });

  if (!user) {
    return fail("NOT_FOUND", "Användaren hittades inte.", 404);
  }

  return ok(user);
}

export async function PATCH(request: NextRequest) {
  const auth = await requireApiUser(request);
  if (auth.response) return auth.response;

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return fail("INVALID_INPUT", "Felaktig payload.", 400);
  }

  const parsed = profileUpdateSchema.safeParse(payload);
  if (!parsed.success) {
    return fail("INVALID_INPUT", "Ogiltiga profilfält.", 400, parsed.error.flatten());
  }

  const user = await db.user.update({
    where: { id: auth.user!.id },
    data: parsed.data,
    select: {
      id: true,
      email: true,
      role: true,
      name: true,
      profileImageUrl: true,
      strengths: true,
      weaknesses: true,
      otherInfo: true,
      updatedAt: true,
    },
  });

  return ok(user);
}
