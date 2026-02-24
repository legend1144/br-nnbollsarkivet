import Link from "next/link";
import { requireServerUser } from "@/lib/auth/guards";
import { LogoutButton } from "@/components/logout-button";
import { MemberTopNav } from "@/components/ui/member-top-nav";

const mainNav = [
  { href: "/dashboard", label: "Oversikt" },
  { href: "/arkivet", label: "Arkivet" },
  { href: "/kalender", label: "Kalender" },
  { href: "/nyheter", label: "Nyheter" },
  { href: "/profil", label: "Profil" },
];

const adminNav = [
  { href: "/admin", label: "Admin start" },
  { href: "/admin/archive", label: "Arkiv" },
  { href: "/admin/tactics", label: "Taktik" },
  { href: "/admin/news", label: "Nyheter" },
  { href: "/admin/calendar", label: "Kalender" },
  { href: "/admin/users", label: "Anvandare" },
  { href: "/admin/allowlist", label: "Allowlist" },
];

export default async function MemberLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await requireServerUser();
  const accountLabel = `${user.email} (${user.role})`;

  return (
    <div className="shell shell--member app-shell">
      <header className="panel panel--elevated app-shell__header app-shell__header--desktop">
        <div className="app-shell__header-copy stack-2xs">
          <p className="text-xs uppercase tracking-[0.2em] text-cyan-200">Brannbollsarkivet</p>
          <p className="text-sm text-slate-200 text-body">{accountLabel}</p>
        </div>
        <div className="app-shell__header-actions inline-actions">
          {user.role === "admin" && (
            <Link href="/admin" className="btn-secondary">
              Admin
            </Link>
          )}
          <LogoutButton />
        </div>
      </header>

      <MemberTopNav items={mainNav} adminItems={user.role === "admin" ? adminNav : []} accountLabel={accountLabel} />

      <section className="app-shell__main">{children}</section>
    </div>
  );
}


