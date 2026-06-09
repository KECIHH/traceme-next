import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

const repoRoot = process.cwd();
const dbMigrateScript = path.join(repoRoot, "scripts", "db-migrate.mjs");
const dbSummaryScript = path.join(repoRoot, "scripts", "auth-db-summary.mjs");

function sanitizeEnv() {
  const env = { ...process.env };

  for (const name of [
    "DATABASE_URL",
    "AUTH_SECRET",
    "AUTH_URL",
    "AUTH_GITHUB_ID",
    "AUTH_GITHUB_SECRET",
  ]) {
    delete env[name];
  }

  return env;
}

async function withTempCwd<T>(operation: (cwd: string) => T | Promise<T>) {
  const cwd = await mkdtemp(path.join(os.tmpdir(), "traceme-auth-tooling-"));

  try {
    return await operation(cwd);
  } finally {
    await rm(cwd, { recursive: true, force: true });
  }
}

test("database migration command fails closed without printing connection values", async () => {
  await withTempCwd((cwd) => {
    const result = spawnSync(process.execPath, [dbMigrateScript], {
      cwd,
      encoding: "utf8",
      env: sanitizeEnv(),
    });
    const output = `${result.stdout}\n${result.stderr}`;

    assert.equal(result.status, 1);
    assert.match(output, /DATABASE_URL: missing/);
    assert.match(output, /not verified: DATABASE_URL is missing/);
    assert.doesNotMatch(output, /postgres(?:ql)?:\/\//i);
    assert.doesNotMatch(output, /AUTH_SECRET=/);
    assert.doesNotMatch(output, /AUTH_GITHUB_SECRET=/);
  });
});

test("auth database summary command reports presence only when auth env is missing", async () => {
  await withTempCwd((cwd) => {
    const result = spawnSync(process.execPath, [dbSummaryScript], {
      cwd,
      encoding: "utf8",
      env: sanitizeEnv(),
    });
    const output = `${result.stdout}\n${result.stderr}`;

    assert.equal(result.status, 1);

    for (const name of [
      "DATABASE_URL",
      "AUTH_SECRET",
      "AUTH_URL",
      "AUTH_GITHUB_ID",
      "AUTH_GITHUB_SECRET",
    ]) {
      assert.match(output, new RegExp(`${name}: missing`));
      assert.doesNotMatch(output, new RegExp(`${name}=.+\\S`));
    }
  });
});

test("auth database summary script does not select sensitive auth columns", async () => {
  const sqlScript = await readFile(dbSummaryScript, "utf8");
  const selectStatements = sqlScript.match(/SELECT[\s\S]*?(?:FROM|`)/gi)?.join("\n") ?? "";

  for (const forbiddenColumn of [
    "access_token",
    "refresh_token",
    "id_token",
    "sessionToken",
    "password_hash",
    "secret",
  ]) {
    assert.doesNotMatch(selectStatements, new RegExp(forbiddenColumn, "i"));
  }
});

test("package exposes safe auth acceptance scripts", async () => {
  const packageJson = JSON.parse(await readFile(path.join(repoRoot, "package.json"), "utf8")) as {
    scripts: Record<string, string>;
  };

  assert.equal(packageJson.scripts["db:migrate"], "node scripts/db-migrate.mjs");
  assert.equal(packageJson.scripts["auth:db-summary"], "node scripts/auth-db-summary.mjs");
});
