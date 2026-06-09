import NextAuth, { type NextAuthConfig } from "next-auth";
import GitHub from "next-auth/providers/github";
import PostgresAdapter from "@auth/pg-adapter";

import { getDatabasePool } from "@/lib/server/db/connection";
import { hasRequiredAuthEnvironment } from "@/lib/server/auth/config";

const hasDatabase = Boolean(process.env.DATABASE_URL?.trim());

export const isAuthLoginConfigured = hasRequiredAuthEnvironment();

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
