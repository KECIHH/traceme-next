import { z } from "zod";

import {
  BudgetSchema,
  GenerationModeSchema,
  TripPlanSourceSchema,
  type TripPlan,
  type TripPlanSource,
} from "@/lib/schemas/trip";
import { calculateTripDays } from "@/lib/utils/date";

export type SaveTripPlanClientErrorKind =
  | "unauthorized"
  | "bad_request"
  | "server_error"
  | "network_error"
  | "invalid_response";

export type SaveTripPlanClientError = {
  kind: SaveTripPlanClientErrorKind;
  message: string;
  status?: number;
};

export type SaveTripPlanClientResult =
  | {
      ok: true;
      data: SavedTripPlanSaveData;
    }
  | {
      ok: false;
      error: SaveTripPlanClientError;
    };

export type SavedTripPlanSaveSummary = {
  id: string;
  title: string;
  destination: string;
  departureCity: string;
  startDate: string;
  endDate: string;
  days: number | null;
  travelers: number;
  budget: z.infer<typeof BudgetSchema>;
  source: TripPlanSource;
  generationMode: z.infer<typeof GenerationModeSchema>;
  createdAt: string;
  updatedAt: string;
};

export type SavedTripPlanSaveData = {
  record: SavedTripPlanSaveSummary;
  currentVersion: {
    id: string;
    versionNumber: number;
    generatedAt: string;
    createdAt: string;
  };
};

type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

const ApiRecordSchema = z
  .object({
    id: z.string().min(1),
    title: z.string().min(1),
    destination: z.string().min(1),
    departureCity: z.string().min(1),
    startDate: z.string().min(1),
    endDate: z.string().min(1),
    travelers: z.number().int().positive(),
    budget: BudgetSchema,
    source: TripPlanSourceSchema,
    generationMode: GenerationModeSchema,
    createdAt: z.string().min(1),
    updatedAt: z.string().min(1),
  })
  .strip();

const SaveSuccessResponseSchema = z
  .object({
    ok: z.literal(true),
    data: z
      .object({
        record: ApiRecordSchema,
        currentVersion: z
          .object({
            id: z.string().min(1),
            versionNumber: z.number().int().positive(),
            generatedAt: z.string().min(1),
            createdAt: z.string().min(1),
          })
          .strip(),
      })
      .strip(),
  })
  .strip();

const ApiErrorResponseSchema = z
  .object({
    ok: z.literal(false),
    error: z
      .object({
        code: z.string().min(1),
        message: z.string().optional(),
        requestId: z.string().optional(),
      })
      .strip(),
  })
  .strip();

function toSavedTripPlanSaveSummary(
  record: z.infer<typeof ApiRecordSchema>,
): SavedTripPlanSaveSummary {
  return {
    ...record,
    days: calculateTripDays(record.startDate, record.endDate),
  };
}

function toErrorMessage(kind: SaveTripPlanClientErrorKind) {
  switch (kind) {
    case "unauthorized":
      return "请先登录后保存。";
    case "bad_request":
      return "当前计划无法保存，请重新生成后再试。";
    case "server_error":
      return "保存服务暂时不可用，请稍后重试。";
    case "network_error":
      return "网络连接异常，请检查网络后重试。";
    case "invalid_response":
      return "保存结果格式异常，请稍后重试。";
  }
}

function toErrorKind(status: number, apiCode?: string): SaveTripPlanClientErrorKind {
  if (status === 401 || apiCode === "UNAUTHORIZED") {
    return "unauthorized";
  }

  if (status === 400 || apiCode === "BAD_REQUEST") {
    return "bad_request";
  }

  if (status >= 500 || apiCode === "INTERNAL_ERROR") {
    return "server_error";
  }

  return "invalid_response";
}

async function readJsonSafely(response: Response) {
  try {
    return (await response.json()) as unknown;
  } catch {
    return null;
  }
}

function errorResultFromResponse(
  response: Response,
  json: unknown,
): SaveTripPlanClientResult {
  const apiError = ApiErrorResponseSchema.safeParse(json);
  const kind = toErrorKind(
    response.status,
    apiError.success ? apiError.data.error.code : undefined,
  );

  return {
    ok: false,
    error: {
      kind,
      message: toErrorMessage(kind),
      status: response.status,
    },
  };
}

export async function saveTripPlanClient(
  tripPlan: TripPlan,
  fetcher: FetchLike = fetch,
): Promise<SaveTripPlanClientResult> {
  let response: Response;

  try {
    response = await fetcher("/api/travel-plans/save", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ tripPlan }),
    });
  } catch {
    return {
      ok: false,
      error: {
        kind: "network_error",
        message: toErrorMessage("network_error"),
      },
    };
  }

  const json = await readJsonSafely(response);

  if (!response.ok) {
    return errorResultFromResponse(response, json);
  }

  const validationResult = SaveSuccessResponseSchema.safeParse(json);

  if (validationResult.success) {
    return {
      ok: true,
      data: {
        record: toSavedTripPlanSaveSummary(validationResult.data.data.record),
        currentVersion: validationResult.data.data.currentVersion,
      },
    };
  }

  return errorResultFromResponse(response, json);
}
