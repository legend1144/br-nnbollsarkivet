import Link from "next/link";
import { unstable_noStore as noStore } from "next/cache";
import { requireServerUser } from "@/lib/auth/guards";
import { safeListArchiveTabs } from "@/lib/archive";
import { resolveArchiveTab } from "@/lib/ui-types";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/ui/page-header";
import { TabNav } from "@/components/ui/tab-nav";
import { MarkdownContent } from "@/components/ui/markdown-content";
import { ArchiveTacticsPanel } from "@/components/archive/archive-tactics-panel";
import { defaultCones, normalizeCones, normalizePassChains, normalizeTacticPlayers } from "@/lib/tactics";
import type { TacticCone, TacticPassChain, TacticPlayer } from "@/lib/types";

type SearchParams = Promise<{
  tab?: string;
}>;

type Props = {
  searchParams: SearchParams;
};

const TACTIC_BOARD_KEY = "default";

type TacticBoardRecord = {
  playersData: unknown;
  passChainsData: unknown;
  conesData: unknown;
};

type TacticBoardModel = {
  findUnique: (args: unknown) => Promise<TacticBoardRecord | null>;
};

export default async function ArkivetPage({ searchParams }: Props) {
  noStore();

  const user = await requireServerUser();
  const params = await searchParams;

  const tabsResult = await safeListArchiveTabs({
    includeInactive: user.role === "admin",
  });

  if (!tabsResult.ok) {
    return (
      <section className="view-stack">
        <PageHeader
          eyebrow="Arkivet"
          title="Arkivet ar tillfalligt otillgangligt"
          description="Datamodellen for arkivflikar ar inte initialiserad i denna miljo."
        />
        <article className="panel panel-row p-5">
          <h2 className="text-xl font-semibold">{user.role === "admin" ? "Atgard for admin" : "Tillfalligt driftlage"}</h2>
          <p className="mt-2 text-slate-300">
            {user.role === "admin" ? "Kor setup-stegen nedan och ladda om sidan." : "Admin arbetar med att aterstalla arkivet."}
          </p>
          {user.role === "admin" ? (
            <div className="mt-3 space-y-2 text-sm text-slate-300">
              <p>1. `npm run prisma:generate`</p>
              <p>2. `npm run prisma:migrate`</p>
              <p>3. `npm run archive:backfill-tabs`</p>
              <div className="pt-2">
                <Link href="/admin/archive" className="btn-primary">
                  Oppna admin for arkivet
                </Link>
              </div>
            </div>
          ) : (
            <p className="mt-3 text-slate-300">Forsok igen om en stund.</p>
          )}
        </article>
      </section>
    );
  }

  const tabs = tabsResult.data;
  const activeTab = resolveArchiveTab(params.tab, tabs);

  let players: TacticPlayer[] = [];
  let passChains: TacticPassChain[] = [];
  let cones: TacticCone[] = defaultCones;

  if (activeTab?.slug === "taktik") {
    const tacticBoardModel = (db as unknown as { tacticBoard?: TacticBoardModel }).tacticBoard;
    const board = tacticBoardModel ? await tacticBoardModel.findUnique({ where: { key: TACTIC_BOARD_KEY } }) : null;
    if (board) {
      players = normalizeTacticPlayers(board.playersData);
      passChains = normalizePassChains(board.passChainsData, players);
      cones = normalizeCones(board.conesData);
    }
  }

  return (
    <section className="view-stack">
      <PageHeader eyebrow="Arkivet" title="Arkivet" description="Las hur NBK ska spela." />

      {tabs.length === 0 || !activeTab ? (
        <article className="panel panel-row p-5">
          <h2 className="text-xl font-semibold">Inget publicerat innehall</h2>
          <p className="mt-2 text-slate-300">Skapa och publicera flikar i admin innan arkivet kan visas.</p>
          {user.role === "admin" ? (
            <Link href="/admin/archive" className="btn-primary mt-4">
              Oppna arkivadministration
            </Link>
          ) : (
            <p className="mt-3 text-slate-300">Ingen tillganglig flik just nu.</p>
          )}
        </article>
      ) : (
        <article className="panel panel--elevated overflow-hidden archive-view-shell">
          <div className="archive-tabs-shell">
            <TabNav
              activeKey={activeTab.slug}
              items={tabs.map((tab) => ({
                key: tab.slug,
                label: tab.title,
                href: `/arkivet?tab=${tab.slug}`,
              }))}
            />
          </div>
          {activeTab.slug === "taktik" ? (
            <ArchiveTacticsPanel players={players} passChains={passChains} cones={cones} introMarkdown={activeTab.introMarkdown} />
          ) : activeTab.introMarkdown ? (
            <div className="archive-tabs-content">
              <MarkdownContent markdown={activeTab.introMarkdown} />
            </div>
          ) : null}
        </article>
      )}
    </section>
  );
}
