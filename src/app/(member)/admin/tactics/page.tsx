import { requireServerUser } from "@/lib/auth/guards";
import { TacticsManager } from "@/components/admin/tactics-manager";

export default async function AdminTacticsPage() {
  await requireServerUser(["admin"]);
  return <TacticsManager />;
}
