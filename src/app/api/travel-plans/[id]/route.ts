import { handleGetTripPlanDetailRequest } from "@/lib/trip-history/api";
import { requireCurrentUser } from "@/lib/server/auth/current-user";
import {
  getCurrentTripPlanVersionForRecord,
  getTripPlanRecordById,
} from "@/lib/server/trip-history/repository";

export const runtime = "nodejs";

type TripPlanDetailRouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(_request: Request, context: TripPlanDetailRouteContext) {
  const { id } = await context.params;

  return handleGetTripPlanDetailRequest(id, {
    requireCurrentUser,
    getTripPlanRecordById,
    getCurrentTripPlanVersionForRecord,
  });
}
