import { requireApiUser } from "@/lib/auth/guard";
import { createSseResponse } from "@/lib/realtime/sse";
import { toErrorResponse } from "@/lib/api-error";

export async function GET() {
  try {
    const user = await requireApiUser();
    if (!user.branchId) {
      return new Response(null, { status: 204 });
    }
    return createSseResponse((event) => event.branchId === user.branchId);
  } catch (err) {
    return toErrorResponse(err);
  }
}
