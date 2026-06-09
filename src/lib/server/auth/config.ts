export const REQUIRED_AUTH_ENV_NAMES = [
  "DATABASE_URL",
  "AUTH_SECRET",
  "AUTH_URL",
  "AUTH_GITHUB_ID",
  "AUTH_GITHUB_SECRET",
] as const;

type AuthEnvironment = Record<string, string | undefined>;

export function hasRequiredAuthEnvironment(env: AuthEnvironment = process.env) {
  return REQUIRED_AUTH_ENV_NAMES.every((name) => Boolean(env[name]?.trim()));
}
