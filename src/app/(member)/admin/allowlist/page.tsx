import { requireServerUser } from "@/lib/auth/guards";
import { db } from "@/lib/db";
import { AllowlistManager } from "@/components/admin/allowlist-manager";

export default async function AdminAllowlistPage() {
  await requireServerUser(["admin"]);
  const rows = await db.allowedEmail.findMany({
    orderBy: { createdAt: "desc" },
  });

  return (
    <AllowlistManager
      initialRows={rows.map((row) => ({
        id: row.id,
        email: row.email,
        active: row.active,
        createdAt: row.createdAt.toISOString(),
      }))}
    />
  );
}
