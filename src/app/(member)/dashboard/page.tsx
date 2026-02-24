import Link from "next/link";
import Image from "next/image";
import { requireServerUser } from "@/lib/auth/guards";
import { db } from "@/lib/db";
import { safeListArchiveTabs } from "@/lib/archive";
import type { DashboardCard } from "@/lib/ui-types";
import { PageHeader } from "@/components/ui/page-header";
import { CardGrid } from "@/components/ui/card-grid";

const dashboardCards: DashboardCard[] = [
  {
    title: "Arkivet",
    href: "/arkivet",
    subtitle: "Se all planering infor turneringen.",
  },
  {
    title: "Nyheter",
    href: "/nyheter",
    subtitle: "Hall dig uppdaterad med de senaste nyheterna.",
  },
  {
    title: "Kalender",
    href: "/kalender",
    subtitle: "Kommande matcher, traningar och viktiga handelser.",
  },
  {
    title: "Profil",
    href: "/profil",
    subtitle: "Hantera dina uppgifter.",
  },
];

export default async function DashboardPage() {
  await requireServerUser();

  const now = new Date();
  const [upcomingEvents, publishedNews, tabsResult] = await Promise.all([
    db.calendarEvent.count({ where: { startAt: { gte: now } } }),
    db.newsPost.count({ where: { status: "published" } }),
    safeListArchiveTabs({ includeInactive: false }),
  ]);

  const activeTabs = tabsResult.ok ? tabsResult.data.length : 0;

  return (
    <section className="view-stack">
      <PageHeader
        eyebrow="Valkommen"
        title="Oversikt"
        description="Direktvy over lagets viktigaste floden."
        actions={
          <div className="dashboard-brand-mark" aria-label="Brannbollsarkivet">
            <Image src="/logo.png" alt="Brannbollsarkivet logotyp" width={52} height={52} className="dashboard-brand-mark__logo" />
            <span className="dashboard-brand-mark__label">Brannbollsarkivet</span>
          </div>
        }
        kpis={[
          { label: "Kommande event", value: `${upcomingEvents}` },
          { label: "Publicerade nyheter", value: `${publishedNews}` },
          { label: "Aktiva arkivflikar", value: `${activeTabs}` },
        ]}
      />

      <CardGrid className="xl:grid-cols-2 2xl:grid-cols-4">
        {dashboardCards.map((card) => (
          <Link key={card.href} href={card.href} className="portal-card panel panel--elevated card-minimal panel-row reveal-up">
            <h2 className="text-2xl font-semibold">{card.title}</h2>
            <p className="mt-1 text-sm text-slate-300 text-body">{card.subtitle}</p>
          </Link>
        ))}
      </CardGrid>
    </section>
  );
}
