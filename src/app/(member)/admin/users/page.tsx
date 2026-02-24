import { requireServerUser } from "@/lib/auth/guards";
import { db } from "@/lib/db";
import { UserRoleManager } from "@/components/admin/user-role-manager";

export default async function AdminUsersPage() {
  await requireServerUser(["admin"]);
  const users = await db.user.findMany({
    orderBy: { createdAt: "desc" },
    select: { id: true, email: true, name: true, role: true },
  });

  return <UserRoleManager initialUsers={users} />;
}
