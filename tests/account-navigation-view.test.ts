import assert from "node:assert/strict";
import test from "node:test";

import {
  toCurrentUserNavigationSummary,
  type CurrentUserNavigationSummary,
} from "@/lib/account/current-user-summary";
import { buildAccountNavView } from "@/lib/account/navigation-view";

function assertNoSensitiveText(value: unknown) {
  assert.doesNotMatch(
    JSON.stringify(value),
    /userId|DATABASE_URL|AUTH_SECRET|OAuth secret|API Key|Bearer|Authorization|tokenHash|access_token|refresh_token|sessionToken|secret/i,
  );
}

test("current user navigation summary keeps only safe display labels", () => {
  const session = {
    user: {
      id: "123e4567-e89b-12d3-a456-426614174000",
      email: "traveler@example.test",
      name: "TraceMe Traveler",
      image: "https://example.test/avatar.png",
      access_token: "must-not-leak",
      refresh_token: "must-not-leak",
      sessionToken: "must-not-leak",
      secret: "must-not-leak",
    },
  } as unknown as Parameters<typeof toCurrentUserNavigationSummary>[0];
  const summary = toCurrentUserNavigationSummary(session);

  assert.deepEqual(summary, {
    primaryLabel: "TraceMe Traveler",
    secondaryLabel: null,
  });
  assertNoSensitiveText(summary);
  assert.doesNotMatch(JSON.stringify(summary), /traveler@example\.test/i);
});

test("account nav builds stable home, trips, and login callback routes", () => {
  const view = buildAccountNavView({
    authConfigured: true,
    user: null,
    pathname: "/trips/323e4567-e89b-42d3-a456-426614174000",
    search: "panel=share",
  });

  assert.equal(view.homeHref, "/");
  assert.equal(view.tripsHref, "/trips");
  assert.equal(view.isHomeActive, false);
  assert.equal(view.isTripsActive, true);
  assert.equal(view.statusLabel, "未登录");
  assert.equal(view.canSignIn, true);
  assert.equal(view.canSignOut, false);
  assert.equal(view.signInTarget, "_blank");
  assert.equal(view.signInRel, "noreferrer");
  assert.equal(
    view.signInHref,
    "/api/auth/signin?callbackUrl=%2Ftrips%2F323e4567-e89b-42d3-a456-426614174000%3Fpanel%3Dshare",
  );
  assertNoSensitiveText(view);
});

test("account nav degrades without configured auth and avoids invalid auth routes", () => {
  const view = buildAccountNavView({
    authConfigured: false,
    user: null,
    pathname: "//not-a-safe-callback",
  });

  assert.equal(view.isHomeActive, true);
  assert.equal(view.statusLabel, "登录未配置");
  assert.equal(view.signInHref, null);
  assert.equal(view.signInTarget, null);
  assert.equal(view.signInRel, null);
  assert.equal(view.canSignIn, false);
  assert.equal(view.canSignOut, false);
  assertNoSensitiveText(view);
});

test("account nav uses safe authenticated labels and root sign-out redirect", () => {
  const user: CurrentUserNavigationSummary = {
    primaryLabel: "TraceMe Traveler",
    secondaryLabel: null,
  };
  const view = buildAccountNavView({
    authConfigured: true,
    user,
    pathname: "/",
  });

  assert.equal(view.isHomeActive, true);
  assert.equal(view.isAuthenticated, true);
  assert.equal(view.displayName, "TraceMe Traveler");
  assert.equal(view.secondaryLabel, null);
  assert.equal(view.signInHref, null);
  assert.equal(view.signInTarget, null);
  assert.equal(view.signInRel, null);
  assert.equal(view.canSignIn, false);
  assert.equal(view.canSignOut, true);
  assert.equal(view.signOutRedirectTo, "/");
  assertNoSensitiveText(view);
  assert.doesNotMatch(JSON.stringify(view), /traveler@example\.test/i);
});
