import assert from "node:assert/strict";
import test from "node:test";

import {
  createAccountMeResponse,
  toCurrentUser,
} from "@/lib/account/current-user-summary";

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
      user: NonNullable<typeof currentUser>;
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
  assert.deepEqual(json.data.user, currentUser);

  for (const forbiddenField of [
    "access_token",
    "refresh_token",
    "sessionToken",
    "password_hash",
    "secret",
  ]) {
    assert.equal(forbiddenField in json.data.user, false);
  }
});
