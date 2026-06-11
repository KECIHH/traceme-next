# Delete, Soft Delete, and Restore Design

## Current Boundary

Round 38 implements the API-only first phase for owner-scoped saved-trip soft delete, restore-deleted, and deleted-list behavior. Round 37 remains the design baseline, while Round 38 is the implemented server boundary.

The current personal beta now has:

- Saved trip records and protected "my trips" list/detail pages.
- Immutable trip plan versions, version listing, version detail, append-version behavior, and version restore.
- Fixed-version share links with owner create/list/revoke controls.
- A public read-only shared-trip page that resolves an active share token.
- A `trip_plan_records.deleted_at` field and existing normal record/version/share queries that exclude soft-deleted records.
- `DELETE /api/travel-plans/[id]` for owner-only soft delete.
- `POST /api/travel-plans/[id]/restore-deleted` for owner-only restore inside the 30-day window.
- `GET /api/travel-plans/deleted` for owner-only deleted record summaries.

The current personal beta does not yet have:

- Detail-page or list-item delete controls.
- A deleted-trip list, undo entry, or recycle-bin UI.
- A hard-delete retention job or account deletion workflow.

Existing `generate`, `compare`, `save`, version restore, share create/list/revoke, and public-share success behavior remains unchanged by Round 38.

## Product Behavior

First-phase trip deletion should be soft delete, not physical delete. Deleting a saved trip sets `TripPlanRecord.deletedAt` and hides the record from normal owner-facing history. It should not delete `TripPlanVersion` rows, share rows, user rows, auth sessions, or generated snapshots.

Soft delete is recommended first because:

- Users need a recovery path for accidental deletion.
- Version snapshots are immutable history and should not disappear without a retention policy.
- Share-link privacy can be made safer by immediately blocking public access while retaining audit context.
- Future account deletion, export, and hard-delete retention rules need separate product and compliance decisions.
- Physical deletion is harder to undo and should wait for backup, retention, and support expectations.

After deletion:

- `/trips` and `GET /api/travel-plans` hide the record.
- `/trips/[id]` and `GET /api/travel-plans/[id]` should treat the record as unavailable.
- API response for deleted, missing, invalid-id, or cross-user records is `404 NOT_FOUND`.
- Recommended UI copy is a generic unavailable state, such as "行程不可访问或已删除", without confirming whether the id exists.

## Restore Window

The first implementation should use a 30-day restore window.

Recommended behavior:

- Restore clears `TripPlanRecord.deletedAt`.
- Restore does not create a new `TripPlanVersion`.
- Restore does not change `currentVersionId`.
- Restore does not rewrite historical version snapshots.
- Restore succeeds only for the current user's own soft-deleted records.
- Restore fails after the 30-day window with `400 BAD_REQUEST`.

The UI may use softer wording such as "近期删除" while the server enforces 30 days. A later product round can switch to 7 days if storage, privacy, or support expectations require a shorter window.

## Version History Impact

Deleted records should keep their version snapshots in storage during the restore window and until a later hard-delete policy exists.

Rules:

- Normal version APIs should not expose versions for soft-deleted records.
- Normal detail pages should not show version history for soft-deleted records.
- A restored record shows its existing version history again.
- Version restore remains a separate behavior from deletion restore.
- Restoring a deleted record should not add a "restored from deleted" version because no trip content changed.

This preserves the current model where `TripPlanVersion` is an immutable snapshot timeline, while `TripPlanRecord.deletedAt` controls list/detail visibility.

## Share Link Impact

Deleting a saved trip must immediately make all public share links for that trip unavailable.

Implemented first-phase rules:

- Public share API and page return `404 NOT_FOUND` for shares whose parent record is soft-deleted.
- Owner share-list APIs also treat a soft-deleted parent record as unavailable through normal detail surfaces.
- Existing fixed-version share rows may remain in storage for audit and future retention handling.
- Deleting a record revokes active share links for that record.
- Restoring a deleted trip should not automatically restore public share access.
- After restore, the owner should create a new share link if they want the trip public again.

Requiring a new share link after restore is the safer first-phase default. It prevents a user from restoring a trip for private review and accidentally reactivating an old public URL that may still exist in chat logs, email, browser history, or third-party previews.

If a later phase wants share reactivation, it should add an explicit owner confirmation and clear UI copy.

## Implemented API

All delete and restore-deleted APIs require login. Every query and mutation must include the current `userId` boundary. Records outside the current user boundary should behave like missing records.

### `DELETE /api/travel-plans/[id]`

Purpose: soft-delete one saved trip owned by the current user.

Authentication: required.

Behavior:

- Validate that `[id]` is a UUID-shaped record id.
- Find a non-deleted `TripPlanRecord` where `id` and `userId` match.
- Set `deletedAt = now()`.
- Do not delete versions.
- Do not physically delete share rows.
- Revoke active share links for the record.
- Return a safe record summary with `deletedAt`.

Recommended responses:

- `401 UNAUTHORIZED`: no authenticated user.
- `404 NOT_FOUND`: invalid id shape, missing record, already-deleted record, or another user's record.
- `500 INTERNAL_ERROR`: unexpected server/database failure.

### `POST /api/travel-plans/[id]/restore-deleted`

Purpose: restore a recently soft-deleted saved trip owned by the current user.

Authentication: required.

Behavior:

- Validate that `[id]` is a UUID-shaped record id.
- Find a soft-deleted `TripPlanRecord` where `id` and `userId` match.
- Ensure `deletedAt` is within the 30-day restore window.
- Clear `deletedAt`.
- Keep the same `currentVersionId`.
- Keep version snapshots unchanged.
- Keep old public share links unavailable; require creating a new share link after restore.
- Do not reactivate revoked share rows.
- Return a safe restored record summary.

Recommended responses:

- `401 UNAUTHORIZED`: no authenticated user.
- `404 NOT_FOUND`: invalid id shape, missing record, not the owner, or no restorable deleted record.
- `400 BAD_REQUEST`: record exists for the owner but is outside the restore window or is not in a restorable state.
- `500 INTERNAL_ERROR`: unexpected server/database failure.

### `GET /api/travel-plans/deleted`

Purpose: endpoint for a future "recently deleted" or undo surface.

Authentication: required.

Behavior:

- Return only the current user's soft-deleted records.
- Return safe summaries only.
- Sort by `deletedAt` descending.
- Do not return version snapshots by default.
- Do not return raw share tokens, token hashes, owner ids, emails, SQL, stack traces, connection strings, or server configuration.

Recommended responses:

- `401 UNAUTHORIZED`: no authenticated user.
- `400 BAD_REQUEST`: invalid pagination/filter input if future filters are added.
- `500 INTERNAL_ERROR`: unexpected server/database failure.

## Permission Boundary

Permission rules must stay owner-only:

- A user can delete only their own saved trips.
- A user can restore only their own soft-deleted saved trips.
- A user can list only their own recently deleted saved trips.
- Public share tokens cannot delete, restore, list deleted records, list versions, or inspect owner-only metadata.
- Cross-user ids, deleted records outside the allowed surface, revoked shares, expired shares, and invalid tokens should not reveal whether the underlying private record exists.

Error responses should use the existing safe shape:

```json
{
  "ok": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "Trip plan was not found.",
    "requestId": "[request id]"
  }
}
```

The response body must not include internal user ids, owner ids, raw tokens, token hashes, authorization headers, bearer values, database URLs, SQL details, stack traces, provider credentials, or server IPs.

## UI Draft

First-phase UI can stay small and conservative.

Recommended owner detail page:

- Add a delete action near owner-only management actions, separated from export/share actions.
- Require a confirmation dialog before deletion.
- Confirmation copy should say the trip will leave "我的行程" and can be restored for 30 days.
- After success, navigate back to `/trips` and show a short undo/restoration entry if available.

Recommended "我的行程" list:

- Add a per-item delete action only for the owner.
- Require confirmation before calling the delete API.
- Remove the item from the list after success.
- If the deleted item was the only item, show the normal empty state.

Recommended undo and deleted-list entry:

- Minimal first phase can show a toast/action immediately after deletion.
- Optional fuller phase can add a "最近删除" entry backed by `GET /api/travel-plans/deleted`.
- Empty deleted state copy: "暂无最近删除的行程".
- Expired deleted records should not offer restore.

Recommended unavailable states:

- Deleted detail page: "行程不可访问或已删除".
- Public share page after deletion: "分享链接不可用或已失效".
- Avoid explaining whether the trip exists, belongs to another user, expired, was revoked, or was deleted.

## Data and Retention Notes

No new migration is needed for the first implementation if `trip_plan_records.deleted_at` remains sufficient. Future hard-delete or stronger share invalidation may need additional fields.

Possible future fields, not part of Round 38:

- `deleteReason`: optional owner/system reason.
- `deletedByUserId`: useful only if multi-user ownership is added later.
- `purgeAfter`: scheduled hard-delete timestamp.
- `shareInvalidatedByRecordDeletionAt`: explicit share blocking marker if restore behavior later needs to distinguish old share rows.

Future hard delete should be a separate design. It must define:

- Retention window.
- Backup interaction.
- Account deletion behavior.
- Version snapshot removal.
- Share-row removal or anonymization.
- Audit/log minimization.
- User-facing expectations.

## Risks

- Mistaken deletion: mitigated by confirmation, soft delete, and a 30-day restore window.
- Share leakage: mitigated by making shares unavailable immediately after deletion and requiring new share creation after restore.
- Cross-user access: mitigated by always scoping delete, restore, deleted-list, version, and share owner operations by current `userId`.
- Existence probing: mitigated by returning `404 NOT_FOUND` for missing, deleted, invalid, and cross-user resources.
- Restore-window confusion: mitigated by clear UI wording and server-enforced 30-day rules.
- Future hard deletion: needs a separate retention design before any physical deletion job is added.
- Snapshot privacy: version snapshots remain stored after soft delete, so product copy must not imply immediate permanent erasure.
- Sensitive output: logs, docs, UI, and API errors must not expose real IPs, secrets, connection strings, raw share tokens, token hashes, SQL details, stack traces, or provider credentials.

## Out of Scope After Round 38

- Implementing delete UI or undo UI.
- Adding a deleted-list page or recycle-bin UI.
- Adding database migrations.
- Changing `package.json` dependencies.
- Adding admin, maps, weather, search, preproduction, domain, HTTPS, or reverse-proxy work.
