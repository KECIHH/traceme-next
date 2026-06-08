import "server-only";

import { auth, isAuthLoginConfigured } from "../../../../auth";
import {
  toCurrentUser as mapSessionToCurrentUser,
  type CurrentUser,
} from "@/lib/account/current-user-summary";

export { mapSessionToCurrentUser as toCurrentUser, type CurrentUser };

export class AuthenticationRequiredError extends Error {
  constructor(message = "Authentication is required.") {
    super(message);
    this.name = "AuthenticationRequiredError";
  }
}

export async function getOptionalCurrentUser(): Promise<CurrentUser | null> {
  if (!isAuthLoginConfigured) {
    return null;
  }

  return mapSessionToCurrentUser(await auth());
}

export async function getCurrentUser(): Promise<CurrentUser | null> {
  return getOptionalCurrentUser();
}

export async function requireCurrentUser(): Promise<CurrentUser> {
  const currentUser = await getOptionalCurrentUser();

  if (!currentUser) {
    throw new AuthenticationRequiredError();
  }

  return currentUser;
}
