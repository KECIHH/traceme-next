"use client";

import { useEffect, useRef, useState } from "react";

import { formatTripPlanMarkdown } from "@/lib/markdown/format-trip-plan-markdown";
import type { TripPlan } from "@/lib/schemas/trip";
import {
  buildSavingSaveTripPlanActionState,
  buildSaveTripPlanActionView,
  getEffectiveSaveTripPlanActionState,
  settleSaveTripPlanActionState,
  type ScopedSaveTripPlanActionState,
} from "@/lib/services/save-trip-plan-action-view";
import { saveTripPlanClient } from "@/lib/services/save-trip-plan-client";

type ResultActionsProps = {
  tripPlan: TripPlan;
  showSaveAction?: boolean;
};

type FeedbackState = {
  type: "success" | "error";
  message: string;
} | null;

function sanitizeFileNamePart(value: string) {
  return value
    .replace(/[<>:"/\\|?*\u0000-\u001f\u007f]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^\.+|\.+$/g, "");
}

function getMarkdownFileName(plan: TripPlan) {
  const destination = sanitizeFileNamePart(plan.input.destination);
  const prefix = destination ? `${destination}-` : "";

  return `${prefix}旅行计划-${plan.input.startDate}.md`;
}

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

function getTripPlanSnapshotKey(tripPlan: TripPlan) {
  return `${tripPlan.id}:${tripPlan.generatedAt}`;
}

export function ResultActions({ tripPlan, showSaveAction = false }: ResultActionsProps) {
  const snapshotKey = getTripPlanSnapshotKey(tripPlan);
  const [feedback, setFeedback] = useState<FeedbackState>(null);
  const [manualCopyText, setManualCopyText] = useState("");
  const [saveState, setSaveState] = useState<ScopedSaveTripPlanActionState>({
    status: "idle",
  });
  const feedbackTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const manualCopyTextAreaRef = useRef<HTMLTextAreaElement | null>(null);
  const effectiveSaveState = getEffectiveSaveTripPlanActionState(saveState, snapshotKey);
  const saveActionView = buildSaveTripPlanActionView(effectiveSaveState);

  function showFeedback(nextFeedback: NonNullable<FeedbackState>) {
    setFeedback(nextFeedback);

    if (feedbackTimeoutRef.current) {
      clearTimeout(feedbackTimeoutRef.current);
    }

    feedbackTimeoutRef.current = setTimeout(() => {
      setFeedback(null);
      feedbackTimeoutRef.current = null;
    }, 2600);
  }

  useEffect(() => {
    return () => {
      if (feedbackTimeoutRef.current) {
        clearTimeout(feedbackTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!manualCopyText) {
      return;
    }

    manualCopyTextAreaRef.current?.focus();
    manualCopyTextAreaRef.current?.select();
  }, [manualCopyText]);

  async function handleCopy() {
    const markdown = formatTripPlanMarkdown(tripPlan);

    try {
      await copyTextToClipboard(markdown);
      setManualCopyText("");
      showFeedback({
        type: "success",
        message: "已复制 Markdown 全文。",
      });
    } catch {
      setManualCopyText(markdown);
      showFeedback({
        type: "success",
        message: "已展开 Markdown 全文，可手动复制。",
      });
    }
  }

  function handleDownload() {
    try {
      const markdown = formatTripPlanMarkdown(tripPlan);
      const blob = new Blob([markdown], {
        type: "text/markdown;charset=utf-8",
      });
      const objectUrl = URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = getMarkdownFileName(tripPlan);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);

      showFeedback({
        type: "success",
        message: "已开始下载 Markdown 文件。",
      });
    } catch {
      showFeedback({
        type: "error",
        message: "下载失败，请稍后重试。",
      });
    }
  }

  function handlePrint() {
    if (typeof window.print !== "function") {
      showFeedback({
        type: "error",
        message: "当前浏览器不支持打印功能，请尝试使用浏览器菜单打印。",
      });
      return;
    }

    setManualCopyText("");
    showFeedback({
      type: "success",
      message: "即将打开浏览器打印窗口，可在打印对话框中选择保存为 PDF。",
    });
    window.print();
  }

  async function handleSave() {
    if (
      !showSaveAction ||
      effectiveSaveState.status === "saving" ||
      effectiveSaveState.status === "saved"
    ) {
      return;
    }

    const requestSnapshotKey = snapshotKey;
    setManualCopyText("");
    setSaveState(buildSavingSaveTripPlanActionState(requestSnapshotKey));

    const result = await saveTripPlanClient(tripPlan);

    if (result.ok) {
      setSaveState((currentState) =>
        settleSaveTripPlanActionState(currentState, requestSnapshotKey, {
          status: "saved",
          data: result.data,
        }),
      );
      return;
    }

    setSaveState((currentState) =>
      settleSaveTripPlanActionState(currentState, requestSnapshotKey, {
        status: "error",
        error: result.error,
      }),
    );
  }

  return (
    <div
      className="min-w-0 rounded-md border border-emerald-100 bg-emerald-50 p-4"
      data-print-hidden="true"
    >
      <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-emerald-950">导出计划</p>
          <p className="mt-1 break-words text-sm leading-6 text-emerald-800">
            可复制全文、下载 Markdown，或使用浏览器打印/保存 PDF。当前内容仍是 AI
            旅行计划草稿，实时或易变信息请在出发前人工确认。
          </p>
        </div>
        <div className="flex shrink-0 flex-col gap-2 sm:flex-row" data-print-hidden="true">
          {showSaveAction ? (
            <button
              type="button"
              onClick={handleSave}
              disabled={saveActionView.buttonDisabled}
              className="rounded-md bg-zinc-950 px-3 py-2 text-sm font-semibold text-white transition hover:bg-emerald-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:bg-zinc-400"
            >
              {saveActionView.buttonLabel}
            </button>
          ) : null}
          <button
            type="button"
            onClick={handleCopy}
            className="rounded-md bg-white px-3 py-2 text-sm font-semibold text-emerald-900 ring-1 ring-emerald-200 transition hover:bg-emerald-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            复制全文
          </button>
          <button
            type="button"
            onClick={handleDownload}
            className="rounded-md bg-emerald-700 px-3 py-2 text-sm font-semibold text-white transition hover:bg-emerald-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
          >
            下载 Markdown
          </button>
          <button
            type="button"
            onClick={handlePrint}
            className="rounded-md bg-white px-3 py-2 text-sm font-semibold text-emerald-900 ring-1 ring-emerald-200 transition hover:bg-emerald-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            打印 / 保存 PDF
          </button>
        </div>
      </div>
      {showSaveAction && saveActionView.feedback ? (
        <div
          aria-live="polite"
          className={`mt-3 break-words rounded-md px-3 py-2 text-sm leading-6 ${
            saveActionView.feedback.tone === "success"
              ? "bg-white text-emerald-800 ring-1 ring-emerald-200"
              : "bg-red-50 text-red-800 ring-1 ring-red-200"
          }`}
        >
          <p>{saveActionView.feedback.message}</p>
          {saveActionView.loginLink ? (
            <a
              href={saveActionView.loginLink.href}
              target={saveActionView.loginLink.target}
              rel={saveActionView.loginLink.rel}
              className="mt-2 inline-flex rounded-md bg-white px-3 py-2 font-semibold text-red-800 ring-1 ring-red-200 transition hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-500"
            >
              {saveActionView.loginLink.label}
            </a>
          ) : null}
          {saveActionView.detailLink || saveActionView.listLink ? (
            <div className="mt-2 flex flex-wrap gap-2">
              {saveActionView.detailLink ? (
                <a
                  href={saveActionView.detailLink}
                  className="inline-flex rounded-md bg-emerald-700 px-3 py-2 font-semibold text-white transition hover:bg-emerald-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  查看详情
                </a>
              ) : null}
              {saveActionView.listLink ? (
                <a
                  href={saveActionView.listLink}
                  className="inline-flex rounded-md bg-white px-3 py-2 font-semibold text-emerald-900 ring-1 ring-emerald-200 transition hover:bg-emerald-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  查看我的行程
                </a>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}
      {feedback ? (
        <p
          aria-live="polite"
          className={`mt-3 break-words rounded-md px-3 py-2 text-sm leading-6 ${
            feedback.type === "success"
              ? "bg-white text-emerald-800 ring-1 ring-emerald-200"
              : "bg-red-50 text-red-800 ring-1 ring-red-200"
          }`}
        >
          {feedback.message}
        </p>
      ) : null}
      {manualCopyText ? (
        <div className="mt-3">
          <p className="mb-2 break-words text-sm leading-6 text-emerald-900">
            已展开 Markdown 全文，可手动复制。
          </p>
          <textarea
            ref={manualCopyTextAreaRef}
            readOnly
            value={manualCopyText}
            className="h-48 w-full resize-y rounded-md border border-emerald-200 bg-white p-3 font-mono text-xs leading-5 text-zinc-800 outline-none focus:ring-2 focus:ring-emerald-500"
            aria-label="Markdown 全文"
          />
        </div>
      ) : null}
    </div>
  );
}
