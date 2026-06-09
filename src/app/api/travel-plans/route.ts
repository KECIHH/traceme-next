import { handleListTripPlansRequest } from "@/lib/trip-history/api";
import { requireCurrentUser } from "@/lib/server/auth/current-user";
import { listTripPlanRecordsByUser } from "@/lib/server/trip-history/repository";

export const runtime = "nodejs";

export function GET() {
  return handleListTripPlansRequest({
    requireCurrentUser,
    listTripPlanRecordsByUser,
  });
}
