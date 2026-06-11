import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const resultActionsPath = path.join(
  process.cwd(),
  "src",
  "components",
  "trip",
  "result-actions.tsx",
);

async function readResultActionsSource() {
  return readFile(resultActionsPath, "utf8");
}

test("result export feedback explains manual copy, download, and browser PDF limits", async () => {
  const source = await readResultActionsSource();

  assert.match(source, /浏览器未允许自动复制/);
  assert.match(source, /从下方文本框手动复制/);
  assert.match(source, /已触发 Markdown 下载/);
  assert.match(source, /浏览器下载列表/);
  assert.match(source, /这不是服务端精排 PDF/);
  assert.match(source, /浏览器或系统打印对话框/);
  assert.doesNotMatch(source, /服务端 PDF|精确排版 PDF/);
});

test("result export feedback source stays inside browser-only export boundary", async () => {
  const source = await readResultActionsSource();

  assert.match(source, /buildTripPlanMarkdownDownload/);
  assert.doesNotMatch(source, /\/api\/.*pdf|pdfkit|puppeteer|playwright/i);
  assert.doesNotMatch(
    source,
    /DATABASE_URL|AUTH_SECRET|OAuth secret|AI key|Bearer|Authorization|tokenHash|owner email/i,
  );
});
