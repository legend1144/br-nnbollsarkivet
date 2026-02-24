import { revalidatePath } from "next/cache";
import { NextRequest } from "next/server";
import { requireApiUser } from "@/lib/auth/guards";
import { db } from "@/lib/db";
import { fail, ok } from "@/lib/http";
import { calendarEventSchema } from "@/lib/validation";

export async function GET(request: NextRequest) {
  const auth = await requireApiUser(request);
  if (auth.response) return auth.response;

  const events = await db.calendarEvent.findMany({
    orderBy: { startAt: "asc" },
    include: {
      createdBy: { select: { id: true, name: true, email: true } },
    },
  });
  return ok(events);
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
  const parsed = calendarEventSchema.safeParse(payload);
  if (!parsed.success) {
    return fail("INVALID_INPUT", "Ogiltig kalenderhandelse.", 400, parsed.error.flatten());
  }

  const event = await db.calendarEvent.create({
    data: {
      title: parsed.data.title,
      description: parsed.data.description,
      eventType: parsed.data.eventType,
      startAt: new Date(parsed.data.startAt),
      endAt: new Date(parsed.data.endAt),
      location: parsed.data.location,
      createdById: auth.user!.id,
    },
  });

  revalidatePath("/kalender");
  revalidatePath("/admin/calendar");

  return ok(event, { status: 201 });
}
