import { handleRestoreTripPlanVersionRequest } from "@/lib/trip-history/api";
import { requireCurrentUser } from "@/lib/server/auth/current-user";
import {
  createTripPlanVersion,
  getTripPlanVersionById,
} from "@/lib/server/trip-history/repository";

export const runtime = "nodejs";

type TripPlanRestoreRouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function POST(request: Request, context: TripPlanRestoreRouteContext) {
  const { id } = await context.params;

  return handleRestoreTripPlanVersionRequest(request, id, {
    requireCurrentUser,
    getTripPlanVersionById,
    createTripPlanVersion,
  });
}
