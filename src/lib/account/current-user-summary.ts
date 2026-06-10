export type CurrentUser = {
  id: string;
  email: string | null;
  name: string | null;
  image: string | null;
};

export type CurrentUserNavigationSummary = {
  primaryLabel: string;
  secondaryLabel: string | null;
};

type AuthSessionLike = {
  user?: {
    id?: string | null;
    email?: string | null;
    name?: string | null;
    image?: string | null;
  } | null;
} | null;

export type AccountMeResponse =
  | {
      ok: true;
      data: {
        user: CurrentUser;
      };
    }
  | {
      ok: false;
      error: {
        code: "UNAUTHORIZED";
        message: string;
      };
    };

export function toCurrentUser(session: AuthSessionLike): CurrentUser | null {
  const sessionUser = session?.user;

  if (!sessionUser?.id) {
    return null;
  }

  return {
    id: sessionUser.id,
    email: sessionUser.email ?? null,
    name: sessionUser.name ?? null,
    image: sessionUser.image ?? null,
  };
}

function normalizeNavigationLabel(value: string | null | undefined) {
  const trimmed = value?.trim();

  return trimmed ? trimmed : null;
}

export function toCurrentUserNavigationSummary(
  session: AuthSessionLike,
): CurrentUserNavigationSummary | null {
  const sessionUser = session?.user;

  if (!sessionUser) {
    return null;
  }

  const name = normalizeNavigationLabel(sessionUser.name);
  const email = normalizeNavigationLabel(sessionUser.email);

  return {
    primaryLabel: name ?? email ?? "已登录",
    secondaryLabel: name !== null && email !== null && email !== name ? email : null,
  };
}

export function createUnauthorizedAccountResponse() {
  const body: AccountMeResponse = {
    ok: false,
    error: {
      code: "UNAUTHORIZED",
      message: "Authentication is required.",
    },
  };

  return Response.json(body, { status: 401 });
}

export function createAccountMeResponse(session: AuthSessionLike) {
  const currentUser = toCurrentUser(session);

  if (!currentUser) {
    return createUnauthorizedAccountResponse();
  }

  const body: AccountMeResponse = {
    ok: true,
    data: {
      user: currentUser,
    },
  };

  return Response.json(body);
}
