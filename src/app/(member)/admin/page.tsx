import Link from "next/link";
import { requireServerUser } from "@/lib/auth/guards";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/ui/page-header";
import { CardGrid } from "@/components/ui/card-grid";

const adminLinks = [
  { href: "/admin/allowlist", label: "Allowlist e-post", description: "Hantera tillatna adresser och status." },
  { href: "/admin/users", label: "Anvandare och roller", description: "Tilldela roller och medlemsatkomst." },
  { href: "/admin/news", label: "Nyheter", description: "Skapa och publicera interna nyhetsinlagg." },
  { href: "/admin/archive", label: "Arkiv", description: "Styr flikar och sektioner i medlemsarkivet." },
  { href: "/admin/tactics", label: "Taktik", description: "Bygg och spara en live spelplan for medlemmar." },
  { href: "/admin/calendar", label: "Kalender", description: "Hantera tranings- och matchschema." },
];

export default async function AdminPage() {
  await requireServerUser(["admin"]);

  const now = new Date();
  const [activeAllowlist, userCount, draftNews, upcomingEvents] = await Promise.all([
    db.allowedEmail.count({ where: { active: true } }),
    db.user.count(),
    db.newsPost.count({ where: { status: "draft" } }),
    db.calendarEvent.count({ where: { startAt: { gte: now } } }),
  ]);

  return (
    <section className="view-stack">
      <PageHeader
        eyebrow="Administration"
        title="Adminpanel"
        description="Samlad styrning av innehall, medlemsatkomst och planering."
        kpis={[
          { label: "Aktiv allowlist", value: `${activeAllowlist}` },
          { label: "Anvandare", value: `${userCount}` },
          { label: "Draft-nyheter", value: `${draftNews}` },
          { label: "Kommande event", value: `${upcomingEvents}` },
        ]}
      />

      <CardGrid className="xl:grid-cols-2 2xl:grid-cols-3">
        {adminLinks.map((item) => (
          <Link key={item.href} href={item.href} className="portal-card panel panel--elevated card-minimal panel-row reveal-up">
            <h2 className="text-xl font-semibold">{item.label}</h2>
            <p className="mt-1 text-slate-300 text-body">{item.description}</p>
          </Link>
        ))}
      </CardGrid>
    </section>
  );
}
