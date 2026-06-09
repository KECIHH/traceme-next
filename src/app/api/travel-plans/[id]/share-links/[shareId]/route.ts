import { handleRevokeTripPlanShareLinkRequest } from "@/lib/trip-history/api";
import { requireCurrentUser } from "@/lib/server/auth/current-user";
import { revokeTripPlanShareLink } from "@/lib/server/trip-history/repository";

export const runtime = "nodejs";

type TripPlanShareLinkRouteContext = {
  params: Promise<{
    id: string;
    shareId: string;
  }>;
};

export async function PATCH(request: Request, context: TripPlanShareLinkRouteContext) {
  const { id, shareId } = await context.params;

  return handleRevokeTripPlanShareLinkRequest(request, id, shareId, {
    requireCurrentUser,
    revokeTripPlanShareLink,
  });
}
