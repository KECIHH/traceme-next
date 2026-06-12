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

async function readSource(sourcePath: string) {
  return readFile(sourcePath, "utf8");
}

async function readUiSource() {
  const sources = await Promise.all(
    uiSourcePaths.map(async (sourcePath) => readSource(sourcePath)),
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

test("owner workbench error states expose retry and return actions", async () => {
  const [tripsSource, tripDetailSource, deletedTripsSource] = await Promise.all([
    readSource(uiSourcePaths[0]),
    readSource(uiSourcePaths[1]),
    readSource(uiSourcePaths[3]),
  ]);

  assert.match(tripsSource, /重试加载/);
  assert.match(tripsSource, /返回生成页/);
  assert.match(deletedTripsSource, /重试加载/);
  assert.match(deletedTripsSource, /返回我的行程/);
  assert.match(tripDetailSource, /重试加载/);
  assert.match(tripDetailSource, /返回我的行程/);
});

test("delete and restore UI source avoids sensitive fields and browser TripPlan storage", async () => {
  const source = await readUiSource();

  assert.doesNotMatch(
    source,
    /userId|DATABASE_URL|AUTH_SECRET|OAuth secret|API Key|Bearer|Authorization|tokenHash|SQL|stack/i,
  );
  assert.doesNotMatch(source, /localStorage|sessionStorage/);
});
