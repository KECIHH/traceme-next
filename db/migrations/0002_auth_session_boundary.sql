ALTER TABLE users
  ADD COLUMN IF NOT EXISTS name text,
  ADD COLUMN IF NOT EXISTS image text,
  ADD COLUMN IF NOT EXISTS "emailVerified" timestamptz;

UPDATE users
SET
  name = COALESCE(name, display_name),
  image = COALESCE(image, avatar_url);

CREATE OR REPLACE FUNCTION sync_user_auth_profile_fields()
RETURNS trigger AS $$
BEGIN
  NEW.display_name := COALESCE(NEW.display_name, NEW.name);
  NEW.avatar_url := COALESCE(NEW.avatar_url, NEW.image);
  NEW.name := COALESCE(NEW.name, NEW.display_name);
  NEW.image := COALESCE(NEW.image, NEW.avatar_url);
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS users_sync_auth_profile_fields ON users;

CREATE TRIGGER users_sync_auth_profile_fields
BEFORE INSERT OR UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION sync_user_auth_profile_fields();

CREATE TABLE accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId" uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type varchar(255) NOT NULL,
  provider varchar(255) NOT NULL,
  "providerAccountId" varchar(255) NOT NULL,
  refresh_token text,
  access_token text,
  expires_at bigint,
  id_token text,
  scope text,
  session_state text,
  token_type text,
  CONSTRAINT accounts_provider_account_unique UNIQUE (provider, "providerAccountId")
);

CREATE TABLE sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "sessionToken" varchar(255) NOT NULL UNIQUE,
  "userId" uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires timestamptz NOT NULL
);

CREATE TABLE verification_token (
  identifier text NOT NULL,
  token text NOT NULL,
  expires timestamptz NOT NULL,
  PRIMARY KEY (identifier, token)
);

CREATE INDEX accounts_user_id_idx
  ON accounts ("userId");

CREATE INDEX sessions_user_id_idx
  ON sessions ("userId");

CREATE INDEX sessions_expires_idx
  ON sessions (expires);
