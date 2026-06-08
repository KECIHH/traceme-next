CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE,
  display_name text,
  avatar_url text,
  auth_provider text NOT NULL DEFAULT 'local',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  last_login_at timestamptz,
  deleted_at timestamptz
);

CREATE TABLE trip_plan_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  title text NOT NULL,
  destination text NOT NULL,
  departure_city text NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  travelers integer NOT NULL CHECK (travelers > 0),
  budget_amount numeric(12, 2) NOT NULL CHECK (budget_amount > 0),
  budget_currency text NOT NULL,
  budget_scope text NOT NULL CHECK (budget_scope IN ('total', 'perPerson')),
  current_version_id uuid,
  source_provider text NOT NULL CHECK (source_provider IN ('mock', 'openai-compatible')),
  source_kind text NOT NULL CHECK (source_kind IN ('mock', 'ai')),
  generation_mode text NOT NULL CHECK (generation_mode IN ('quick')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  CONSTRAINT trip_plan_records_date_range_check CHECK (end_date >= start_date)
);

CREATE TABLE trip_plan_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_plan_record_id uuid NOT NULL REFERENCES trip_plan_records(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  version_number integer NOT NULL CHECK (version_number > 0),
  trip_plan_snapshot jsonb NOT NULL,
  source_provider text NOT NULL CHECK (source_provider IN ('mock', 'openai-compatible')),
  source_kind text NOT NULL CHECK (source_kind IN ('mock', 'ai')),
  generation_mode text NOT NULL CHECK (generation_mode IN ('quick')),
  generated_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  restore_from_version_id uuid REFERENCES trip_plan_versions(id) ON DELETE SET NULL,
  note text,
  CONSTRAINT trip_plan_versions_snapshot_object_check CHECK (jsonb_typeof(trip_plan_snapshot) = 'object'),
  CONSTRAINT trip_plan_versions_record_version_unique UNIQUE (trip_plan_record_id, version_number)
);

ALTER TABLE trip_plan_records
  ADD CONSTRAINT trip_plan_records_current_version_id_fkey
  FOREIGN KEY (current_version_id) REFERENCES trip_plan_versions(id) ON DELETE SET NULL;

CREATE INDEX trip_plan_records_user_updated_at_idx
  ON trip_plan_records (user_id, updated_at DESC);

CREATE INDEX trip_plan_records_user_deleted_at_idx
  ON trip_plan_records (user_id, deleted_at);

CREATE INDEX trip_plan_versions_record_version_number_idx
  ON trip_plan_versions (trip_plan_record_id, version_number DESC);

CREATE INDEX trip_plan_versions_user_id_idx
  ON trip_plan_versions (user_id);
