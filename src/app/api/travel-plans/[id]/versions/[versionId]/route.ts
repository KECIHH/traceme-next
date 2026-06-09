import { handleGetTripPlanVersionDetailRequest } from "@/lib/trip-history/api";
import { requireCurrentUser } from "@/lib/server/auth/current-user";
import { getTripPlanVersionById } from "@/lib/server/trip-history/repository";

export const runtime = "nodejs";

type TripPlanVersionDetailRouteContext = {
  params: Promise<{
    id: string;
    versionId: string;
  }>;
};

export async function GET(_request: Request, context: TripPlanVersionDetailRouteContext) {
  const { id, versionId } = await context.params;

  return handleGetTripPlanVersionDetailRequest(id, versionId, {
    requireCurrentUser,
    getTripPlanVersionById,
  });
}
