"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";

import type { CurrentUserNavigationSummary } from "@/lib/account/current-user-summary";
import { buildAccountNavView } from "@/lib/account/navigation-view";

type AppChromeProps = {
  authConfigured: boolean;
  currentUser: CurrentUserNavigationSummary | null;
};

function navLinkClassName(isActive: boolean) {
  return `rounded-md px-3 py-2 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
    isActive
      ? "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200"
      : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-950"
  }`;
}

export function AppChrome({ authConfigured, currentUser }: AppChromeProps) {
  const pathname = usePathname();
  const view = buildAccountNavView({
    authConfigured,
    user: currentUser,
    pathname,
  });

  async function handleSignOut() {
    await signOut({
      redirectTo: view.signOutRedirectTo,
    });
  }

  return (
    <header
      className="sticky top-0 z-30 border-b border-zinc-200 bg-white/95 text-zinc-950 backdrop-blur"
      data-print-hidden="true"
    >
      <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center justify-between gap-4 px-5 py-3 sm:px-8 lg:px-10">
        <div className="flex min-w-0 flex-wrap items-center gap-4">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-emerald-700">TraceMe Next</p>
            <p className="truncate text-xs leading-5 text-zinc-500">下一站，与你同行</p>
          </div>
          <nav className="flex flex-wrap items-center gap-2" aria-label="全局导航">
            <Link
              href={view.homeHref}
              aria-current={view.isHomeActive ? "page" : undefined}
              className={navLinkClassName(view.isHomeActive)}
            >
              首页
            </Link>
            <Link
              href={view.tripsHref}
              aria-current={view.isTripsActive ? "page" : undefined}
              className={navLinkClassName(view.isTripsActive)}
            >
              我的行程
            </Link>
          </nav>
        </div>

        <div className="flex min-w-0 flex-wrap items-center justify-end gap-3">
          <div className="min-w-0 text-right">
            {view.displayName ? (
              <>
                <p className="max-w-[12rem] truncate text-sm font-semibold text-zinc-950">
                  {view.displayName}
                </p>
                {view.secondaryLabel ? (
                  <p className="max-w-[12rem] truncate text-xs leading-5 text-zinc-500">
                    {view.secondaryLabel}
                  </p>
                ) : (
                  <p className="text-xs leading-5 text-emerald-700">
                    {view.statusLabel}
                  </p>
                )}
              </>
            ) : (
              <>
                <p className="text-sm font-semibold text-zinc-950">{view.statusLabel}</p>
                <p className="text-xs leading-5 text-zinc-500">
                  {authConfigured ? "登录后可保存和分享行程" : "当前仅显示基础入口"}
                </p>
              </>
            )}
          </div>

          {view.canSignIn && view.signInHref ? (
            <Link
              href={view.signInHref}
              target={view.signInTarget ?? undefined}
              rel={view.signInRel ?? undefined}
              className="rounded-md bg-zinc-950 px-3 py-2 text-sm font-semibold text-white transition hover:bg-emerald-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
            >
              登录
            </Link>
          ) : null}

          {view.canSignOut ? (
            <button
              type="button"
              onClick={handleSignOut}
              className="rounded-md bg-white px-3 py-2 text-sm font-semibold text-zinc-800 ring-1 ring-zinc-200 transition hover:bg-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              退出
            </button>
          ) : null}
        </div>
      </div>
    </header>
  );
}
