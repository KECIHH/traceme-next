import { z } from "zod";

import {
  BudgetSchema,
  GenerationModeSchema,
  TripPlanSchema,
  TripPlanSourceSchema,
  type TripPlan,
  type TripPlanSource,
} from "@/lib/schemas/trip";
import { calculateTripDays } from "@/lib/utils/date";

export type TripHistoryClientErrorKind =
  | "unauthorized"
  | "not_found"
  | "server_error"
  | "network_error"
  | "invalid_response";

export type TripHistoryClientError = {
  kind: TripHistoryClientErrorKind;
  message: string;
  status?: number;
};

export type TripHistoryClientResult<TData> =
  | {
      ok: true;
      data: TData;
    }
  | {
      ok: false;
      error: TripHistoryClientError;
    };

export type SavedTripPlanSummary = {
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

export type SavedTripPlanDetail = {
  record: SavedTripPlanSummary;
  currentVersion: {
    versionNumber: number;
    generatedAt: string;
    createdAt: string;
    tripPlan: TripPlan;
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

const ListSuccessResponseSchema = z
  .object({
    ok: z.literal(true),
    data: z
      .object({
        records: z.array(ApiRecordSchema),
      })
      .strip(),
  })
  .strip();

const DetailSuccessResponseSchema = z
  .object({
    ok: z.literal(true),
    data: z
      .object({
        record: ApiRecordSchema,
        currentVersion: z
          .object({
            versionNumber: z.number().int().positive(),
            generatedAt: z.string().min(1),
            createdAt: z.string().min(1),
            tripPlan: TripPlanSchema,
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

function toSavedTripPlanSummary(record: z.infer<typeof ApiRecordSchema>): SavedTripPlanSummary {
  return {
    ...record,
    days: calculateTripDays(record.startDate, record.endDate),
  };
}

function toErrorMessage(kind: TripHistoryClientErrorKind) {
  switch (kind) {
    case "unauthorized":
      return "请先登录后查看我的行程。";
    case "not_found":
      return "没有找到这份已保存的行程。";
    case "server_error":
      return "历史行程服务暂时不可用，请稍后重试。";
    case "network_error":
      return "网络连接异常，请检查网络后重试。";
    case "invalid_response":
      return "历史行程数据格式异常，请稍后重试。";
  }
}

function toErrorKind(status: number, apiCode?: string): TripHistoryClientErrorKind {
  if (status === 401 || apiCode === "UNAUTHORIZED") {
    return "unauthorized";
  }

  if (status === 404 || apiCode === "NOT_FOUND") {
    return "not_found";
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

async function getJson(path: string, fetcher: FetchLike) {
  let response: Response;

  try {
    response = await fetcher(path, {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
      cache: "no-store",
    });
  } catch {
    return {
      ok: false as const,
      error: {
        kind: "network_error" as const,
        message: toErrorMessage("network_error"),
      },
    };
  }

  return {
    ok: true as const,
    response,
    json: await readJsonSafely(response),
  };
}

function errorResultFromResponse(
  response: Response,
  json: unknown,
): TripHistoryClientResult<never> {
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

export function getSavedTripPlanSourceKindLabel(source: TripPlanSource) {
  return source.kind === "ai" ? "AI 草稿" : "Mock 草稿";
}

export function getSavedTripPlanSourceProviderLabel(source: TripPlanSource) {
  return source.provider === "openai-compatible" ? "OpenAI-compatible" : "本地 mock";
}

export function getSavedTripPlanSourceLabel(source: TripPlanSource) {
  return `${getSavedTripPlanSourceKindLabel(source)} · ${getSavedTripPlanSourceProviderLabel(source)}`;
}

export async function listSavedTripPlans(
  fetcher: FetchLike = fetch,
): Promise<TripHistoryClientResult<{ records: SavedTripPlanSummary[] }>> {
  const requestResult = await getJson("/api/travel-plans", fetcher);

  if (!requestResult.ok) {
    return requestResult;
  }

  if (!requestResult.response.ok) {
    return errorResultFromResponse(requestResult.response, requestResult.json);
  }

  const validationResult = ListSuccessResponseSchema.safeParse(requestResult.json);

  if (validationResult.success) {
    return {
      ok: true,
      data: {
        records: validationResult.data.data.records.map(toSavedTripPlanSummary),
      },
    };
  }

  return errorResultFromResponse(requestResult.response, requestResult.json);
}

export async function getSavedTripPlanDetail(
  id: string,
  fetcher: FetchLike = fetch,
): Promise<TripHistoryClientResult<SavedTripPlanDetail>> {
  const requestResult = await getJson(
    `/api/travel-plans/${encodeURIComponent(id)}`,
    fetcher,
  );

  if (!requestResult.ok) {
    return requestResult;
  }

  if (!requestResult.response.ok) {
    return errorResultFromResponse(requestResult.response, requestResult.json);
  }

  const validationResult = DetailSuccessResponseSchema.safeParse(requestResult.json);

  if (validationResult.success) {
    return {
      ok: true,
      data: {
        record: toSavedTripPlanSummary(validationResult.data.data.record),
        currentVersion: validationResult.data.data.currentVersion,
      },
    };
  }

  return errorResultFromResponse(requestResult.response, requestResult.json);
}
