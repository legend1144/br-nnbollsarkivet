export type DashboardCard = {
  title: string;
  href: string;
  subtitle: string;
};

export type HeaderKpi = {
  label: string;
  value: string;
};

export type ArchiveTabDto = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  introMarkdown: string | null;
  order: number;
  isActive: boolean;
};

export type ArchiveRuntimeStatus = "ready" | "not_ready";

export function resolveArchiveTab(
  requestedSlug: string | undefined,
  tabs: ArchiveTabDto[],
): ArchiveTabDto | null {
  if (tabs.length === 0) {
    return null;
  }
  const fromQuery = requestedSlug ? tabs.find((tab) => tab.slug === requestedSlug) : null;
  if (fromQuery) {
    return fromQuery;
  }
  return tabs[0] ?? null;
}
