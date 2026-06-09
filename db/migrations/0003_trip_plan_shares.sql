CREATE TABLE trip_plan_shares (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  trip_plan_record_id uuid NOT NULL REFERENCES trip_plan_records(id) ON DELETE CASCADE,
  version_id uuid NOT NULL REFERENCES trip_plan_versions(id) ON DELETE CASCADE,
  token_hash text NOT NULL UNIQUE,
  token_preview text NOT NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'revoked')),
  expires_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  last_accessed_at timestamptz,
  access_count integer NOT NULL DEFAULT 0 CHECK (access_count >= 0),
  CONSTRAINT trip_plan_shares_token_hash_not_empty CHECK (length(token_hash) > 0),
  CONSTRAINT trip_plan_shares_token_preview_not_empty CHECK (length(token_preview) > 0),
  CONSTRAINT trip_plan_shares_revoked_at_check CHECK (
    (status = 'revoked' AND revoked_at IS NOT NULL)
    OR (status = 'active' AND revoked_at IS NULL)
  )
);

CREATE INDEX trip_plan_shares_owner_record_created_at_idx
  ON trip_plan_shares (owner_user_id, trip_plan_record_id, created_at DESC);

CREATE INDEX trip_plan_shares_owner_record_status_idx
  ON trip_plan_shares (owner_user_id, trip_plan_record_id, status);

CREATE INDEX trip_plan_shares_active_token_hash_idx
  ON trip_plan_shares (token_hash)
  WHERE status = 'active';

CREATE INDEX trip_plan_shares_version_id_idx
  ON trip_plan_shares (version_id);
