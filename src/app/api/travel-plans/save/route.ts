import { handleSaveTripPlanRequest } from "@/lib/trip-history/api";
import { requireCurrentUser } from "@/lib/server/auth/current-user";
import { createTripPlanRecordWithInitialVersion } from "@/lib/server/trip-history/repository";

export const runtime = "nodejs";

export function POST(request: Request) {
  return handleSaveTripPlanRequest(request, {
    requireCurrentUser,
    createTripPlanRecordWithInitialVersion,
  });
}
