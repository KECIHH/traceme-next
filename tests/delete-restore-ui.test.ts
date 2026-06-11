import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const uiSourcePaths = [
  path.join(process.cwd(), "src", "app", "trips", "trips-page-client.tsx"),
  path.join(
    process.cwd(),
    "src",
    "app",
    "trips",
    "[id]",
    "trip-detail-page-client.tsx",
  ),
  path.join(process.cwd(), "src", "app", "trips", "deleted", "page.tsx"),
  path.join(
    process.cwd(),
    "src",
    "app",
    "trips",
    "deleted",
    "deleted-trips-page-client.tsx",
  ),
];

async function readUiSource() {
  const sources = await Promise.all(
    uiSourcePaths.map(async (sourcePath) => readFile(sourcePath, "utf8")),
  );

  return sources.join("\n");
}

test("delete and restore UI copy avoids misleading destructive wording", async () => {
  const source = await readUiSource();

  assert.doesNotMatch(source, /hard delete|永久删除|物理删除/i);
  assert.match(source, /30 天/);
  assert.match(source, /最近删除/);
  assert.match(source, /软删除/);
  assert.match(source, /旧分享链接/);
  assert.match(source, /不会自动恢复|已不可用/);
  assert.match(source, /重新创建分享链接/);
});

test("delete and restore UI source avoids sensitive fields and browser TripPlan storage", async () => {
  const source = await readUiSource();

  assert.doesNotMatch(
    source,
    /userId|DATABASE_URL|AUTH_SECRET|OAuth secret|API Key|Bearer|Authorization|tokenHash|SQL|stack/i,
  );
  assert.doesNotMatch(source, /localStorage|sessionStorage/);
});
