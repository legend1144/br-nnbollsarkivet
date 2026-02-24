import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { NextRequest } from "next/server";
import type { AppRole, SessionUser } from "@/lib/types";
import { fail } from "@/lib/http";
import { SESSION_COOKIE } from "@/lib/auth/constants";
import { readSessionFromRequest, readSessionFromToken } from "@/lib/auth/session";

function hasRole(userRole: AppRole, allowedRoles?: AppRole[]) {
  if (!allowedRoles || allowedRoles.length === 0) {
    return true;
  }
  return allowedRoles.includes(userRole);
}

export async function requireServerUser(allowedRoles?: AppRole[]): Promise<SessionUser> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  const user = await readSessionFromToken(token);
  if (!user) {
    redirect("/login");
  }
  if (!hasRole(user.role, allowedRoles)) {
    redirect("/dashboard");
  }
  return user;
}

export async function requireApiUser(request: NextRequest, allowedRoles?: AppRole[]) {
  const user = await readSessionFromRequest(request);
  if (!user) {
    return { user: null as SessionUser | null, response: fail("UNAUTHORIZED", "Inloggning krävs.", 401) };
  }
  if (!hasRole(user.role, allowedRoles)) {
    return { user: null as SessionUser | null, response: fail("FORBIDDEN", "Otillräckliga rättigheter.", 403) };
  }
  return { user, response: null };
}
