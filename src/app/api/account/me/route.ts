import type { NextRequest } from "next/server";

import { auth, isAuthLoginConfigured } from "../../../../../auth";
import {
  createAccountMeResponse,
  createUnauthorizedAccountResponse,
} from "@/lib/account/current-user-summary";

export const runtime = "nodejs";

type AccountMeRouteContext = {
  params: Promise<Record<string, string | string[] | undefined>>;
};

const getAccountMeWithSession = auth((request) => {
  return createAccountMeResponse(request.auth);
});

export function GET(request: NextRequest, context: AccountMeRouteContext) {
  if (!isAuthLoginConfigured) {
    return createUnauthorizedAccountResponse();
  }

  return getAccountMeWithSession(request, context);
}
