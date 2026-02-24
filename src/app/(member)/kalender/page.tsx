import { db } from "@/lib/db";
import { requireServerUser } from "@/lib/auth/guards";
import { formatStockholm } from "@/lib/utils";
import { PageHeader } from "@/components/ui/page-header";
import { CardGrid } from "@/components/ui/card-grid";

export default async function KalenderPage() {
  await requireServerUser();

  const events = await db.calendarEvent.findMany({
    orderBy: { startAt: "asc" },
  });

  return (
    <section className="view-stack">
      <PageHeader eyebrow="Kalender" title="Schema" description="Match/traningskalender" />
      <CardGrid className="xl:grid-cols-2 2xl:grid-cols-3">
        {events.length === 0 ? (
          <p className="panel panel-row p-5 text-slate-300">Inga handelser an.</p>
        ) : (
          events.map((event) => (
            <article key={event.id} className="panel panel--elevated panel-row card-minimal p-5 reveal-up">
              <h2 className="text-lg font-semibold">{event.title}</h2>
              <p className="mt-1 text-slate-300">
                {formatStockholm(event.startAt)} - {event.location ?? event.eventType}
              </p>
            </article>
          ))
        )}
      </CardGrid>
    </section>
  );
}
