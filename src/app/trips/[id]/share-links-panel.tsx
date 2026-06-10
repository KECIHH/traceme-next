"use client";

import { useEffect, useRef, useState } from "react";

import {
  createShareLinkClient,
  listShareLinksClient,
  revokeShareLinkClient,
  type SavedTripPlanShareSummary,
  type TripHistoryClientError,
} from "@/lib/services/trip-history-client";
import {
  buildShareLinkCopySuccessFeedback,
  buildShareLinkCreateSuccessFeedback,
  buildShareLinkErrorFeedback,
  buildShareLinkManualCopyFeedback,
  buildShareLinkRevokeConfirmMessage,
  buildShareLinkRevokeSuccessFeedback,
  buildShareLinkSummaryView,
  type ShareFeedbackView,
} from "@/lib/services/trip-share-view";

type ShareLinksState =
  | {
      status: "loading";
    }
  | {
      status: "success";
      shares: SavedTripPlanShareSummary[];
    }
  | {
      status: "error";
      error: TripHistoryClientError;
    };

type ShareLinksPanelProps = {
  tripPlanId: string;
};

function copyTextWithTextArea(text: string) {
  const textArea = document.createElement("textarea");
  textArea.value = text;
  textArea.readOnly = true;
  textArea.style.position = "fixed";
  textArea.style.left = "-9999px";
  textArea.style.top = "0";
  textArea.style.opacity = "0";

  document.body.appendChild(textArea);
  textArea.focus();
  textArea.select();

  try {
    return document.execCommand("copy");
  } finally {
    textArea.remove();
  }
}

async function copyTextToClipboard(text: string) {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return;
    } catch {
      // Fall through to the textarea fallback for browsers with stricter clipboard permissions.
    }
  }

  if (copyTextWithTextArea(text)) {
    return;
  }

  throw new Error("Copy is not available in this browser.");
}

function buildShareUrlFromToken(token: string) {
  return new URL(`/shared/trips/${encodeURIComponent(token)}`, window.location.origin).toString();
}

function ShareLinksErrorState({ error }: { error: TripHistoryClientError }) {
  return (
    <div className="rounded-md border border-red-200 bg-red-50 p-4">
      <p className="text-sm font-semibold text-red-900">无法加载分享链接</p>
      <p className="mt-2 break-words text-sm leading-6 text-red-800">
        {error.message}
      </p>
    </div>
  );
}

export function ShareLinksPanel({ tripPlanId }: ShareLinksPanelProps) {
  const [sharesState, setSharesState] = useState<ShareLinksState>({
    status: "loading",
  });
  const [creating, setCreating] = useState(false);
  const [revokingShareId, setRevokingShareId] = useState<string | null>(null);
  const [oneTimeShareUrl, setOneTimeShareUrl] = useState("");
  const [manualCopyText, setManualCopyText] = useState("");
  const [feedback, setFeedback] = useState<ShareFeedbackView | null>(null);
  const manualCopyTextAreaRef = useRef<HTMLTextAreaElement | null>(null);

  async function loadShares() {
    setSharesState({ status: "loading" });

    const result = await listShareLinksClient(tripPlanId);

    if (result.ok) {
      setSharesState({
        status: "success",
        shares: result.data.shares,
      });
      return;
    }

    setSharesState({
      status: "error",
      error: result.error,
    });
  }

  useEffect(() => {
    let isMounted = true;

    async function load() {
      setSharesState({ status: "loading" });
      setOneTimeShareUrl("");
      setManualCopyText("");
      setFeedback(null);

      const result = await listShareLinksClient(tripPlanId);

      if (!isMounted) {
        return;
      }

      if (result.ok) {
        setSharesState({
          status: "success",
          shares: result.data.shares,
        });
        return;
      }

      setSharesState({
        status: "error",
        error: result.error,
      });
    }

    void load();

    return () => {
      isMounted = false;
    };
  }, [tripPlanId]);

  useEffect(() => {
    if (!manualCopyText) {
      return;
    }

    manualCopyTextAreaRef.current?.focus();
    manualCopyTextAreaRef.current?.select();
  }, [manualCopyText]);

  async function handleCopyShareUrl(shareUrl: string) {
    try {
      await copyTextToClipboard(shareUrl);
      setManualCopyText("");
      setFeedback(buildShareLinkCopySuccessFeedback());
    } catch {
      setManualCopyText(shareUrl);
      setFeedback(buildShareLinkManualCopyFeedback());
    }
  }

  async function handleCreate() {
    if (creating) {
      return;
    }

    setCreating(true);
    setFeedback(null);
    setManualCopyText("");

    const result = await createShareLinkClient(tripPlanId);

    if (!result.ok) {
      setCreating(false);
      setFeedback(buildShareLinkErrorFeedback(result.error.message));
      return;
    }

    const shareUrl =
      result.data.shareUrl ?? buildShareUrlFromToken(String(result.data.token));

    setOneTimeShareUrl(shareUrl);
    setFeedback(buildShareLinkCreateSuccessFeedback());
    await loadShares();
    setCreating(false);
  }

  async function handleRevoke(share: SavedTripPlanShareSummary) {
    if (!window.confirm(buildShareLinkRevokeConfirmMessage(share))) {
      return;
    }

    setFeedback(null);
    setRevokingShareId(share.id);

    const result = await revokeShareLinkClient(tripPlanId, share.id);

    if (!result.ok) {
      setRevokingShareId(null);
      setFeedback(buildShareLinkErrorFeedback(result.error.message));
      return;
    }

    if (oneTimeShareUrl) {
      setManualCopyText("");
    }

    setFeedback(buildShareLinkRevokeSuccessFeedback());
    await loadShares();
    setRevokingShareId(null);
  }

  return (
    <section
      className="rounded-md border border-zinc-200 bg-white p-5 shadow-sm"
      data-print-hidden="true"
      aria-label="分享链接"
    >
      <div className="flex min-w-0 flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-emerald-700">分享链接</p>
          <h2 className="mt-2 break-words text-2xl font-semibold tracking-tight text-zinc-950">
            公开只读分享
          </h2>
          <p className="mt-2 max-w-3xl break-words text-sm leading-6 text-zinc-600">
            创建后，拿到链接的人可以查看这份固定快照。链接不会提供保存、恢复、编辑或版本管理能力，请谨慎分享。
          </p>
        </div>
        <button
          type="button"
          onClick={handleCreate}
          disabled={creating}
          className="shrink-0 rounded-md bg-emerald-700 px-3 py-2 text-sm font-semibold text-white transition hover:bg-emerald-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:bg-zinc-400"
        >
          {creating ? "正在创建..." : "创建分享链接"}
        </button>
      </div>

      {feedback ? (
        <p
          aria-live="polite"
          className={`mt-4 break-words rounded-md px-3 py-2 text-sm leading-6 ${
            feedback.tone === "success"
              ? "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200"
              : "bg-red-50 text-red-800 ring-1 ring-red-200"
          }`}
        >
          {feedback.message}
        </p>
      ) : null}

      {oneTimeShareUrl ? (
        <div className="mt-4 rounded-md border border-emerald-200 bg-emerald-50 p-4">
          <div className="flex min-w-0 flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-emerald-950">
                新分享链接
              </p>
              <p className="mt-1 break-all text-sm leading-6 text-emerald-800">
                {oneTimeShareUrl}
              </p>
            </div>
            <button
              type="button"
              onClick={() => handleCopyShareUrl(oneTimeShareUrl)}
              className="shrink-0 rounded-md bg-white px-3 py-2 text-sm font-semibold text-emerald-900 ring-1 ring-emerald-200 transition hover:bg-emerald-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              复制链接
            </button>
          </div>
        </div>
      ) : null}

      {manualCopyText ? (
        <div className="mt-4">
          <p className="mb-2 break-words text-sm leading-6 text-zinc-700">
            自动复制失败，可手动复制完整链接。
          </p>
          <textarea
            ref={manualCopyTextAreaRef}
            readOnly
            value={manualCopyText}
            className="h-24 w-full resize-y rounded-md border border-emerald-200 bg-white p-3 font-mono text-xs leading-5 text-zinc-800 outline-none focus:ring-2 focus:ring-emerald-500"
            aria-label="分享链接"
          />
        </div>
      ) : null}

      <div className="mt-5">
        {sharesState.status === "loading" ? (
          <div className="rounded-md border border-zinc-200 bg-zinc-50 p-4">
            <p className="text-sm leading-6 text-zinc-600">正在加载分享链接...</p>
          </div>
        ) : null}

        {sharesState.status === "error" ? (
          <ShareLinksErrorState error={sharesState.error} />
        ) : null}

        {sharesState.status === "success" ? (
          sharesState.shares.length === 0 ? (
            <div className="rounded-md border border-dashed border-zinc-300 bg-zinc-50 p-4">
              <p className="text-sm leading-6 text-zinc-600">
                还没有分享链接。创建后，完整链接只会在本页显示一次。
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {sharesState.shares.map((share) => {
                const view = buildShareLinkSummaryView(share);
                const isRevoking = revokingShareId === share.id;

                return (
                  <article
                    key={share.id}
                    className="min-w-0 rounded-md border border-zinc-200 bg-zinc-50 p-4"
                  >
                    <div className="flex min-w-0 flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="min-w-0">
                        <div className="flex min-w-0 flex-wrap items-center gap-2">
                          <h3 className="break-words text-base font-semibold text-zinc-950">
                            {view.tokenPreviewLabel}
                          </h3>
                          <span
                            className={`rounded-md px-2 py-1 text-xs font-semibold ${
                              view.statusTone === "active"
                                ? "bg-emerald-100 text-emerald-900"
                                : "bg-zinc-200 text-zinc-700"
                            }`}
                          >
                            {view.statusLabel}
                          </span>
                        </div>
                        <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2 xl:grid-cols-4">
                          <div>
                            <dt className="font-medium text-zinc-500">创建时间</dt>
                            <dd className="mt-1 break-words text-zinc-800">
                              {view.createdAtLabel}
                            </dd>
                          </div>
                          <div>
                            <dt className="font-medium text-zinc-500">失效时间</dt>
                            <dd className="mt-1 break-words text-zinc-800">
                              {view.expiresAtLabel}
                            </dd>
                          </div>
                          <div>
                            <dt className="font-medium text-zinc-500">分享快照</dt>
                            <dd className="mt-1 break-words text-zinc-800">
                              {view.versionLabel}
                            </dd>
                          </div>
                          {view.revokedAtLabel ? (
                            <div>
                              <dt className="font-medium text-zinc-500">撤销时间</dt>
                              <dd className="mt-1 break-words text-zinc-800">
                                {view.revokedAtLabel}
                              </dd>
                            </div>
                          ) : null}
                        </dl>
                      </div>
                      {view.canRevoke ? (
                        <button
                          type="button"
                          onClick={() => handleRevoke(share)}
                          disabled={revokingShareId !== null}
                          className="shrink-0 rounded-md bg-white px-3 py-2 text-sm font-semibold text-red-800 ring-1 ring-red-200 transition hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:cursor-not-allowed disabled:bg-zinc-100 disabled:text-zinc-400"
                        >
                          {isRevoking ? "正在撤销..." : "撤销链接"}
                        </button>
                      ) : null}
                    </div>
                  </article>
                );
              })}
            </div>
          )
        ) : null}
      </div>
    </section>
  );
}
