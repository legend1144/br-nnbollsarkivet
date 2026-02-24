import { requireServerUser } from "@/lib/auth/guards";
import { ArchiveHubManager } from "@/components/admin/archive-hub-manager";
import { safeListArchiveTabs } from "@/lib/archive";

export default async function AdminArchivePage() {
  await requireServerUser(["admin"]);

  const tabsResult = await safeListArchiveTabs({ includeInactive: true });

  return <ArchiveHubManager runtimeReady={tabsResult.ok} initialTabs={tabsResult.ok ? tabsResult.data : []} />;
}
