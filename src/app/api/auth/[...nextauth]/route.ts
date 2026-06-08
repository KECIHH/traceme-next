import type { NextRequest } from "next/server";

import { handlers, isAuthLoginConfigured } from "../../../../../auth";

export const runtime = "nodejs";

function authNotConfiguredResponse() {
  return Response.json(
    {
      ok: false,
      error: {
        code: "AUTH_PROVIDER_NOT_CONFIGURED",
        message: "Login provider is not configured.",
      },
    },
    { status: 503 },
  );
}

export function GET(request: NextRequest) {
  if (!isAuthLoginConfigured) {
    return authNotConfiguredResponse();
  }

  return handlers.GET(request);
}

export function POST(request: NextRequest) {
  if (!isAuthLoginConfigured) {
    return authNotConfiguredResponse();
  }

  return handlers.POST(request);
}
