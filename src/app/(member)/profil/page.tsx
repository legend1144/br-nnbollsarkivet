import Image from "next/image";
import { requireServerUser } from "@/lib/auth/guards";
import { db } from "@/lib/db";
import { ProfileForm } from "@/components/profile-form";
import { PageHeader } from "@/components/ui/page-header";

export default async function ProfilPage() {
  const sessionUser = await requireServerUser();
  const user = await db.user.findUnique({
    where: { id: sessionUser.id },
    select: {
      email: true,
      role: true,
      name: true,
      profileImageUrl: true,
      strengths: true,
      weaknesses: true,
      otherInfo: true,
    },
  });

  if (!user) {
    return <div className="panel panel-row p-5">Profil kunde inte laddas.</div>;
  }

  return (
    <section className="view-stack">
      <PageHeader eyebrow="Spelarprofil" title="Min profil" description="Hantera din profil." />

      <div className="grid gap-4 xl:grid-cols-[minmax(0,0.72fr)_minmax(0,1.28fr)]">
        <aside className="panel panel--elevated panel-row p-5">
          <h2 className="text-xl font-semibold">Spelarprofil</h2>
          <div className="mt-4 flex items-center gap-4">
            <div className="relative h-20 w-20 overflow-hidden rounded-md border border-cyan-300/40 bg-slate-900/40">
              {user.profileImageUrl ? (
                <Image src={user.profileImageUrl} alt="Profilbild" fill className="object-cover" />
              ) : (
                <div className="flex h-full items-center justify-center text-2xl font-bold">{(user.name ?? "M").slice(0, 1).toUpperCase()}</div>
              )}
            </div>
            <div>
              <p className="font-semibold">{user.name ?? "Namn saknas"}</p>
              <p className="text-sm text-slate-300">{user.email}</p>
              <p className="mt-1 text-xs text-slate-400">{user.role}</p>
            </div>
          </div>
        </aside>

        <ProfileForm
          initial={{
            name: user.name ?? "",
            profileImageUrl: user.profileImageUrl ?? "",
            strengths: user.strengths ?? "",
            weaknesses: user.weaknesses ?? "",
            otherInfo: user.otherInfo ?? "",
          }}
        />
      </div>
    </section>
  );
}
