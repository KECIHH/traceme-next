"use client";

import { useEffect, useRef, useState } from "react";

import { formatTripPlanMarkdown } from "@/lib/markdown/format-trip-plan-markdown";
import type { TripPlan } from "@/lib/schemas/trip";

type ResultActionsProps = {
  tripPlan: TripPlan;
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

export function ResultActions({ tripPlan }: ResultActionsProps) {
  const [feedback, setFeedback] = useState<FeedbackState>(null);
  const [manualCopyText, setManualCopyText] = useState("");
  const feedbackTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const manualCopyTextAreaRef = useRef<HTMLTextAreaElement | null>(null);

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

  return (
    <div className="min-w-0 rounded-md border border-emerald-100 bg-emerald-50 p-4">
      <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-emerald-950">导出计划</p>
          <p className="mt-1 break-words text-sm leading-6 text-emerald-800">
            复制或下载当前旅行计划，内容为 Markdown 参考草稿。
          </p>
        </div>
        <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
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
        </div>
      </div>
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
