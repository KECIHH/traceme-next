import { handleGetPublicSharedTripRequest } from "@/lib/trip-history/api";
import { getPublicSharedTripByToken } from "@/lib/server/trip-history/repository";

export const runtime = "nodejs";

type SharedTripRouteContext = {
  params: Promise<{
    token: string;
  }>;
};

export async function GET(_request: Request, context: SharedTripRouteContext) {
  const { token } = await context.params;

  return handleGetPublicSharedTripRequest(token, {
    getPublicSharedTripByToken,
  });
}
