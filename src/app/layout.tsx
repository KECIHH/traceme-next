import type { Metadata } from "next";

import { AppChrome } from "@/components/navigation/app-chrome";
import { toCurrentUserNavigationSummary } from "@/lib/account/current-user-summary";

import { auth, isAuthLoginConfigured } from "../../auth";
import "./globals.css";

export const metadata: Metadata = {
  title: "TraceMe Next",
  description: "MVP foundation for TraceMe Next.",
};

async function getNavigationUser() {
  if (!isAuthLoginConfigured) {
    return null;
  }

  try {
    return toCurrentUserNavigationSummary(await auth());
  } catch {
    return null;
  }
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const currentUser = await getNavigationUser();

  return (
    <html lang="zh-CN" className="h-full antialiased">
      <body className="min-h-full bg-[#f7f5f0] text-zinc-950">
        <AppChrome
          authConfigured={isAuthLoginConfigured}
          currentUser={currentUser}
        />
        {children}
      </body>
    </html>
  );
}
