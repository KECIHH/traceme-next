import assert from "node:assert/strict";
import test from "node:test";

import {
  createAccountMeResponse,
  toCurrentUser,
} from "@/lib/account/current-user-summary";
import { hasRequiredAuthEnvironment } from "@/lib/server/auth/config";

test("protected account API returns 401 when no login session is available", async () => {
  const response = createAccountMeResponse(null);
  assert.ok(response instanceof Response);

  const json = (await response.json()) as {
    ok: false;
    error: {
      code: string;
      message: string;
    };
  };

  assert.equal(response.status, 401);
  assert.equal(json.ok, false);
  assert.equal(json.error.code, "UNAUTHORIZED");
});

test("real auth login requires database, secret, callback URL, and OAuth credentials", () => {
  const completeEnvironment = {
    DATABASE_URL: "present",
    AUTH_SECRET: "present",
    AUTH_URL: "present",
    AUTH_GITHUB_ID: "present",
    AUTH_GITHUB_SECRET: "present",
  };

  assert.equal(hasRequiredAuthEnvironment(completeEnvironment), true);
  assert.equal(
    hasRequiredAuthEnvironment({
      ...completeEnvironment,
      AUTH_URL: "",
    }),
    false,
  );
  assert.equal(
    hasRequiredAuthEnvironment({
      ...completeEnvironment,
      AUTH_GITHUB_SECRET: "   ",
    }),
    false,
  );
});

test("account API summary exposes only non-sensitive fields", async () => {
  const session = {
    user: {
      id: "123e4567-e89b-12d3-a456-426614174000",
      email: "user@example.test",
      name: "TraceMe Tester",
      image: "https://example.test/avatar.png",
      access_token: "must-not-leak",
      refresh_token: "must-not-leak",
      sessionToken: "must-not-leak",
      password_hash: "must-not-leak",
      secret: "must-not-leak",
    },
    expires: "2099-01-01T00:00:00.000Z",
  };

  const currentUser = toCurrentUser(session);
  const response = createAccountMeResponse(session);
  const json = (await response.json()) as {
    ok: true;
    data: {
      user: {
        id: string;
        name: string | null;
        image: string | null;
        email?: unknown;
      };
    };
  };

  assert.deepEqual(currentUser, {
    id: "123e4567-e89b-12d3-a456-426614174000",
    email: "user@example.test",
    name: "TraceMe Tester",
    image: "https://example.test/avatar.png",
  });
  assert.equal(response.status, 200);
  assert.equal(json.ok, true);
  assert.deepEqual(json.data.user, {
    id: "123e4567-e89b-12d3-a456-426614174000",
    name: "TraceMe Tester",
    image: "https://example.test/avatar.png",
  });
  assert.equal("email" in json.data.user, false);
  assert.doesNotMatch(JSON.stringify(json), /user@example\.test/i);

  for (const forbiddenField of [
    "email",
    "access_token",
    "refresh_token",
    "sessionToken",
    "password_hash",
    "secret",
  ]) {
    assert.equal(forbiddenField in json.data.user, false);
  }
});
