import type { CurrentUserNavigationSummary } from "@/lib/account/current-user-summary";

export type AccountNavView = {
  homeHref: "/";
  tripsHref: "/trips";
  isHomeActive: boolean;
  isTripsActive: boolean;
  statusLabel: string;
  displayName: string | null;
  secondaryLabel: string | null;
  signInHref: string | null;
  signInTarget: "_blank" | null;
  signInRel: "noreferrer" | null;
  signOutRedirectTo: "/";
  canSignIn: boolean;
  canSignOut: boolean;
  isAuthenticated: boolean;
};

function normalizeCallbackPath(pathname: string | null | undefined) {
  const trimmedPathname = pathname?.trim();

  if (!trimmedPathname || !trimmedPathname.startsWith("/") || trimmedPathname.startsWith("//")) {
    return "/";
  }

  return trimmedPathname;
}

function normalizeSearch(search: string | null | undefined) {
  return search?.trim().replace(/^\?/, "") ?? "";
}

function buildCallbackPath(pathname: string | null | undefined, search: string | null | undefined) {
  const callbackPath = normalizeCallbackPath(pathname);
  const normalizedSearch = normalizeSearch(search);

  return normalizedSearch ? `${callbackPath}?${normalizedSearch}` : callbackPath;
}

function buildSignInHref(callbackPath: string) {
  const params = new URLSearchParams({
    callbackUrl: callbackPath,
  });

  return `/api/auth/signin?${params.toString()}`;
}

function isTripsPath(pathname: string) {
  return pathname === "/trips" || pathname.startsWith("/trips/");
}

export function buildAccountNavView({
  authConfigured,
  user,
  pathname,
  search,
}: {
  authConfigured: boolean;
  user: CurrentUserNavigationSummary | null;
  pathname?: string | null;
  search?: string | null;
}): AccountNavView {
  const currentPathname = normalizeCallbackPath(pathname);
  const callbackPath = buildCallbackPath(pathname, search);
  const sharedView = {
    homeHref: "/" as const,
    tripsHref: "/trips" as const,
    isHomeActive: currentPathname === "/",
    isTripsActive: isTripsPath(currentPathname),
    signOutRedirectTo: "/" as const,
  };

  if (!authConfigured) {
    return {
      ...sharedView,
      statusLabel: "登录未配置",
      displayName: null,
      secondaryLabel: null,
      signInHref: null,
      signInTarget: null,
      signInRel: null,
      canSignIn: false,
      canSignOut: false,
      isAuthenticated: false,
    };
  }

  if (!user) {
    return {
      ...sharedView,
      statusLabel: "未登录",
      displayName: null,
      secondaryLabel: null,
      signInHref: buildSignInHref(callbackPath),
      signInTarget: "_blank",
      signInRel: "noreferrer",
      canSignIn: true,
      canSignOut: false,
      isAuthenticated: false,
    };
  }

  return {
    ...sharedView,
    statusLabel: "已登录",
    displayName: user.primaryLabel,
    secondaryLabel: user.secondaryLabel,
    signInHref: null,
    signInTarget: null,
    signInRel: null,
    canSignIn: false,
    canSignOut: true,
    isAuthenticated: true,
  };
}
