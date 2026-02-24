import { revalidatePath } from "next/cache";
import { NextRequest } from "next/server";
import { z } from "zod";
import { requireApiUser } from "@/lib/auth/guards";
import { db } from "@/lib/db";
import { fail, ok } from "@/lib/http";
import { calendarEventSchema } from "@/lib/validation";

type Context = {
  params: Promise<{ id: string }>;
};

const calendarEventPatchSchema = z.object({
  title: z.string().min(2).max(160).optional(),
  description: z.string().max(1000).optional().nullable(),
  eventType: z.enum(["training", "match"]).optional(),
  startAt: z.string().datetime().optional(),
  endAt: z.string().datetime().optional(),
  location: z.string().max(200).optional().nullable(),
});

export async function PATCH(request: NextRequest, context: Context) {
  const auth = await requireApiUser(request, ["admin"]);
  if (auth.response) return auth.response;

  const { id } = await context.params;
  const existing = await db.calendarEvent.findUnique({ where: { id } });
  if (!existing) {
    return fail("NOT_FOUND", "Kalenderhandelsen hittades inte.", 404);
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return fail("INVALID_INPUT", "Felaktig payload.", 400);
  }
  const parsed = calendarEventPatchSchema.safeParse(payload);
  if (!parsed.success) {
    return fail("INVALID_INPUT", "Ogiltiga kalenderfalt.", 400, parsed.error.flatten());
  }

  const normalized = calendarEventSchema.safeParse({
    title: parsed.data.title ?? existing.title,
    description: parsed.data.description ?? existing.description,
    eventType: parsed.data.eventType ?? existing.eventType,
    startAt: parsed.data.startAt ?? existing.startAt.toISOString(),
    endAt: parsed.data.endAt ?? existing.endAt.toISOString(),
    location: parsed.data.location ?? existing.location,
  });

  if (!normalized.success) {
    return fail("INVALID_INPUT", "Ogiltig kalenderhandelse.", 400, normalized.error.flatten());
  }

  const event = await db.calendarEvent.update({
    where: { id },
    data: {
      title: normalized.data.title,
      description: normalized.data.description,
      eventType: normalized.data.eventType,
      startAt: new Date(normalized.data.startAt),
      endAt: new Date(normalized.data.endAt),
      location: normalized.data.location,
    },
  });

  revalidatePath("/kalender");
  revalidatePath("/admin/calendar");

  return ok(event);
}

export async function DELETE(request: NextRequest, context: Context) {
  const auth = await requireApiUser(request, ["admin"]);
  if (auth.response) return auth.response;

  const { id } = await context.params;
  await db.calendarEvent.delete({ where: { id } });

  revalidatePath("/kalender");
  revalidatePath("/admin/calendar");

  return ok({ ok: true });
}
