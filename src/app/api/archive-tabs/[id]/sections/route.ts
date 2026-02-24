import { NextRequest } from "next/server";
import { requireApiUser } from "@/lib/auth/guards";
import { fail } from "@/lib/http";

export async function POST(request: NextRequest) {
  const auth = await requireApiUser(request, ["admin"]);
  if (auth.response) return auth.response;

  return fail("NOT_FOUND", "Arkivsektioner har tagits bort. Anvand fliktext i stallet.", 404);
}

