import { requireServerUser } from "@/lib/auth/guards";
import { db } from "@/lib/db";
import { CalendarManager } from "@/components/admin/calendar-manager";

export default async function AdminCalendarPage() {
  await requireServerUser(["admin"]);
  const rows = await db.calendarEvent.findMany({
    orderBy: { startAt: "asc" },
    select: {
      id: true,
      title: true,
      eventType: true,
      startAt: true,
      endAt: true,
      location: true,
    },
  });

  return (
    <CalendarManager
      initialRows={rows.map((row) => ({
        ...row,
        startAt: row.startAt.toISOString(),
        endAt: row.endAt.toISOString(),
      }))}
    />
  );
}
