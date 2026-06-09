import {
  handleAppendTripPlanVersionRequest,
  handleListTripPlanVersionsRequest,
} from "@/lib/trip-history/api";
import { requireCurrentUser } from "@/lib/server/auth/current-user";
import {
  createTripPlanVersion,
  getTripPlanRecordById,
  listTripPlanVersionsForRecord,
} from "@/lib/server/trip-history/repository";

export const runtime = "nodejs";

type TripPlanVersionsRouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(_request: Request, context: TripPlanVersionsRouteContext) {
  const { id } = await context.params;

  return handleListTripPlanVersionsRequest(id, {
    requireCurrentUser,
    listTripPlanVersionsForRecord,
  });
}

export async function POST(request: Request, context: TripPlanVersionsRouteContext) {
  const { id } = await context.params;

  return handleAppendTripPlanVersionRequest(request, id, {
    requireCurrentUser,
    getTripPlanRecordById,
    createTripPlanVersion,
  });
}
