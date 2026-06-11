import { handleRestoreDeletedTripPlanRequest } from "@/lib/trip-history/api";
import { requireCurrentUser } from "@/lib/server/auth/current-user";
import { restoreDeletedTripPlanRecord } from "@/lib/server/trip-history/repository";

export const runtime = "nodejs";

type RestoreDeletedTripPlanRouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function POST(
  _request: Request,
  context: RestoreDeletedTripPlanRouteContext,
) {
  const { id } = await context.params;

  return handleRestoreDeletedTripPlanRequest(id, {
    requireCurrentUser,
    restoreDeletedTripPlanRecord,
  });
}
