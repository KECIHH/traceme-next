import {
  handleCreateTripPlanShareLinkRequest,
  handleListTripPlanShareLinksRequest,
} from "@/lib/trip-history/api";
import { requireCurrentUser } from "@/lib/server/auth/current-user";
import {
  createTripPlanShareLink,
  listTripPlanShareLinks,
} from "@/lib/server/trip-history/repository";

export const runtime = "nodejs";

type TripPlanShareLinksRouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(_request: Request, context: TripPlanShareLinksRouteContext) {
  const { id } = await context.params;

  return handleListTripPlanShareLinksRequest(id, {
    requireCurrentUser,
    listTripPlanShareLinks,
  });
}

export async function POST(request: Request, context: TripPlanShareLinksRouteContext) {
  const { id } = await context.params;

  return handleCreateTripPlanShareLinkRequest(request, id, {
    requireCurrentUser,
    createTripPlanShareLink,
  });
}
