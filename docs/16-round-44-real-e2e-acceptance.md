# Round 44 Real E2E Acceptance Notes

This note supports the Round 44 real-browser acceptance pass. It prepares a multi-version saved trip through the current authenticated browser session so the version restore UI can be verified without direct database access or new product UI.

## Scope

- Use only a controlled local/test environment and a throwaway saved trip.
- Do not use this on an important personal record.
- Do not record account identity, session values, provider secrets, database connection values, raw share material, public share URLs, or owner email in docs, screenshots, logs, or final reports.
- Do not add admin, map, weather, search, production, reverse proxy, HTTPS, hard delete, or server-side PDF behavior.

## Preconditions

- `[本地验证 URL]` is open in a real browser with an authenticated `[测试账号]`.
- Migrations are applied to `[测试数据库]`.
- The test account can create, revoke, delete, and restore test trip plans.
- A throwaway trip has been generated and saved, and its owner detail page is open at `/trips/[测试行程]`.

## Safe Multi-Version Preparation

Run this snippet from the browser console while viewing the owned throwaway trip detail page. It uses the current browser session through same-origin requests, appends one valid test version, and prints only safe counts and UI instructions.

```js
const marker = "R44版本验收";
const match = window.location.pathname.match(/^\/trips\/([^/?#]+)$/);

if (!match) {
  throw new Error("Open an owned /trips/[id] detail page before running this snippet.");
}

const tripId = match[1];
const detailUrl = `/api/travel-plans/${encodeURIComponent(tripId)}`;
const versionsUrl = `${detailUrl}/versions`;

async function readJson(response, label) {
  if (!response.ok) {
    throw new Error(`${label} failed with HTTP ${response.status}.`);
  }

  return response.json();
}

function appendMarker(value, maxLength) {
  const normalized = String(value ?? "").replace(/\s+/g, " ").trim();
  const suffix = ` ${marker}`;
  const keptLength = Math.max(1, maxLength - suffix.length);

  return `${normalized.slice(0, keptLength)}${suffix}`;
}

const versionsBefore = await readJson(
  await fetch(versionsUrl, { credentials: "same-origin" }),
  "Read versions before append",
);

const detail = await readJson(
  await fetch(detailUrl, { credentials: "same-origin" }),
  "Read current trip detail",
);

if (!detail?.ok || !detail.data?.currentVersion?.tripPlan) {
  throw new Error("Current trip detail did not include a TripPlan snapshot.");
}

const nextPlan = structuredClone(detail.data.currentVersion.tripPlan);
nextPlan.id = `round-44-${Date.now()}`;
nextPlan.generatedAt = new Date().toISOString();
nextPlan.input.destination = appendMarker(nextPlan.input.destination, 80);
nextPlan.overview = appendMarker(nextPlan.overview, 1000);

const appendResult = await readJson(
  await fetch(versionsUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "same-origin",
    body: JSON.stringify({ tripPlan: nextPlan }),
  }),
  "Append version",
);

const versionsAfter = await readJson(
  await fetch(versionsUrl, { credentials: "same-origin" }),
  "Read versions after append",
);

if (!appendResult?.ok) {
  throw new Error("Append version did not return ok=true.");
}

console.log({
  status: "Round 44 version data ready",
  versionsBefore: versionsBefore?.data?.versions?.length ?? null,
  appendedVersionNumber: appendResult.data.version.versionNumber,
  versionsAfter: versionsAfter?.data?.versions?.length ?? null,
  nextStep:
    "Refresh the detail page, preview an older version, restore it, and confirm a new current version is created.",
});
```

Expected result:

- The console output says `Round 44 version data ready`.
- `versionsAfter` is greater than `versionsBefore`.
- After refreshing `/trips/[测试行程]`, the version history shows the appended current version and at least one older version.
- Restoring an older version creates a new current version and leaves the version history visible.

## Real Browser Checklist

- Generate a plan from `/`, then save it.
- Open `/trips`, confirm the saved trip appears without deleted records.
- Open the saved detail page and confirm the current snapshot plus export actions render.
- Run the safe multi-version snippet above on a throwaway detail page.
- Refresh detail, preview an older version, restore it, and confirm restore creates a new current version instead of mutating history.
- Create a share link, open the public read-only page, revoke the share, then confirm the public page shows the generic unavailable state.
- Delete the trip, confirm it disappears from normal `/trips`, appears in `/trips/deleted`, can be restored, and old share material remains unavailable after restore.
- Use copy, Markdown download, and browser print/save-PDF entry from the generated result or saved detail page.

## Download Acceptance

If the browser automation exposes the downloaded file path:

- Read the `.md` file from the download directory.
- Confirm it is non-empty.
- Confirm it contains `每日行程`, `用户自行确认事项`, and `免责声明`.
- Confirm it does not contain `undefined` or `null`.

If the browser does not expose downloaded files:

- Record the environment limitation in `docs/08-project-state.md`.
- Rely on the Round 44 Markdown download helper test to verify generated download content.
- Still verify that the page shows clearer download-trigger feedback after clicking `下载 Markdown`.

## Print Acceptance

- Clicking `打印 / 保存 PDF` should show page feedback and call the browser print flow.
- The system print dialog may not be inspectable in the in-app browser.
- The UI must describe this as browser print/save PDF only, not server-side precision PDF export.
