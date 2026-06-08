import NextAuth, { type NextAuthConfig } from "next-auth";
import GitHub from "next-auth/providers/github";
import PostgresAdapter from "@auth/pg-adapter";

import { getDatabasePool } from "@/lib/server/db/connection";

const hasGithubProvider =
  Boolean(process.env.AUTH_GITHUB_ID?.trim()) &&
  Boolean(process.env.AUTH_GITHUB_SECRET?.trim());

const hasDatabase = Boolean(process.env.DATABASE_URL?.trim());
const hasAuthSecret = Boolean(process.env.AUTH_SECRET?.trim());

export const isAuthLoginConfigured = hasGithubProvider && hasDatabase && hasAuthSecret;

const providers: NextAuthConfig["providers"] = isAuthLoginConfigured ? [GitHub] : [];

const authConfig: NextAuthConfig = {
  providers,
  secret: process.env.AUTH_SECRET,
  session: {
    strategy: hasDatabase ? "database" : "jwt",
  },
  callbacks: {
    session({ session, user }) {
      if (session.user) {
        session.user.id = user.id;
      }

      return session;
    },
  },
};

if (hasDatabase) {
  authConfig.adapter = PostgresAdapter(getDatabasePool());
}

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);
