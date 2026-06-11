import { handleListDeletedTripPlansRequest } from "@/lib/trip-history/api";
import { requireCurrentUser } from "@/lib/server/auth/current-user";
import { listDeletedTripPlanRecordsByUser } from "@/lib/server/trip-history/repository";

export const runtime = "nodejs";

export function GET() {
  return handleListDeletedTripPlansRequest({
    requireCurrentUser,
    listDeletedTripPlanRecordsByUser,
  });
}
