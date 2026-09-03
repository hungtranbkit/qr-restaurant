import { resolveTableByToken } from "@/lib/services/customer-access";
import { createSseResponse } from "@/lib/realtime/sse";
import { toErrorResponse } from "@/lib/api-error";

export async function GET(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await params;
    const table = await resolveTableByToken(token);

    return createSseResponse(
      (event) =>
        event.branchId === table.branchId &&
        (event.tableId === table.id || event.type === "MENU_ITEM_UPDATED"),
    );
  } catch (err) {
    return toErrorResponse(err);
  }
}
