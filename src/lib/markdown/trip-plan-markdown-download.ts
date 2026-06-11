import { formatTripPlanMarkdown } from "@/lib/markdown/format-trip-plan-markdown";
import type { TripPlan } from "@/lib/schemas/trip";

export const TRIP_PLAN_MARKDOWN_MIME_TYPE = "text/markdown;charset=utf-8";

export type TripPlanMarkdownDownload = {
  filename: string;
  mimeType: typeof TRIP_PLAN_MARKDOWN_MIME_TYPE;
  contents: string;
};

export function sanitizeMarkdownFileNamePart(value: string) {
  return value
    .replace(/[<>:"/\\|?*\u0000-\u001f\u007f]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^\.+|\.+$/g, "");
}

export function getTripPlanMarkdownFileName(plan: TripPlan) {
  const destination = sanitizeMarkdownFileNamePart(plan.input.destination);
  const prefix = destination ? `${destination}-` : "";

  return `${prefix}旅行计划-${plan.input.startDate}.md`;
}

export function buildTripPlanMarkdownDownload(plan: TripPlan): TripPlanMarkdownDownload {
  return {
    filename: getTripPlanMarkdownFileName(plan),
    mimeType: TRIP_PLAN_MARKDOWN_MIME_TYPE,
    contents: formatTripPlanMarkdown(plan),
  };
}
