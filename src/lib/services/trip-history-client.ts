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
    source: TripPlanSource;
    generationMode: z.infer<typeof GenerationModeSchema>;
    generatedAt: string;
    createdAt: string;
    tripPlan: TripPlan;
  };
};

export type SavedTripPlanVersionSummary = {
  id: string;
  versionNumber: number;
  source: TripPlanSource;
  generationMode: z.infer<typeof GenerationModeSchema>;
  generatedAt: string;
  createdAt: string;
};

export type SavedTripPlanVersionDetail = SavedTripPlanVersionSummary & {
  tripPlan: TripPlan;
};

export type SavedTripPlanShareSummary = {
  id: string;
  tokenPreview: string;
  status: "active" | "revoked";
  versionId: string;
  expiresAt: string | null;
  revokedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CreatedTripPlanShareLink = {
  share: SavedTripPlanShareSummary;
  shareUrl?: string;
  token?: string;
};

export type PublicSharedTrip = {
  tripPlan: TripPlan;
  share: {
    sharedAt: string;
    expiresAt: string | null;
    version: {
      versionNumber: number;
      source: TripPlanSource;
      generationMode: z.infer<typeof GenerationModeSchema>;
      generatedAt: string;
      createdAt: string;
    };
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
            source: TripPlanSourceSchema,
            generationMode: GenerationModeSchema,
            generatedAt: z.string().min(1),
            createdAt: z.string().min(1),
            tripPlan: TripPlanSchema,
          })
          .strip(),
      })
      .strip(),
  })
  .strip();

const ApiVersionSummarySchema = z
  .object({
    id: z.string().min(1),
    versionNumber: z.number().int().positive(),
    source: TripPlanSourceSchema,
    generationMode: GenerationModeSchema,
    generatedAt: z.string().min(1),
    createdAt: z.string().min(1),
  })
  .strip();

const VersionsListSuccessResponseSchema = z
  .object({
    ok: z.literal(true),
    data: z
      .object({
        versions: z.array(ApiVersionSummarySchema),
      })
      .strip(),
  })
  .strip();

const VersionDetailSuccessResponseSchema = z
  .object({
    ok: z.literal(true),
    data: z
      .object({
        version: ApiVersionSummarySchema.extend({
          tripPlan: TripPlanSchema,
        }).strip(),
      })
      .strip(),
  })
  .strip();

const RestoreSuccessResponseSchema = z
  .object({
    ok: z.literal(true),
    data: z
      .object({
        currentVersion: ApiVersionSummarySchema,
      })
      .strip(),
  })
  .strip();

const ApiShareSummarySchema = z
  .object({
    id: z.string().min(1),
    tokenPreview: z.string().min(1),
    status: z.enum(["active", "revoked"]),
    versionId: z.string().min(1),
    expiresAt: z.string().nullable(),
    revokedAt: z.string().nullable(),
    createdAt: z.string().min(1),
    updatedAt: z.string().min(1),
  })
  .strip();

const CreateShareLinkSuccessResponseSchema = z
  .object({
    ok: z.literal(true),
    data: z
      .object({
        share: ApiShareSummarySchema,
        shareUrl: z.string().min(1).optional(),
        token: z.string().min(1).optional(),
      })
      .strip()
      .refine((data) => data.shareUrl !== undefined || data.token !== undefined),
  })
  .strip();

const ShareLinksListSuccessResponseSchema = z
  .object({
    ok: z.literal(true),
    data: z
      .object({
        shares: z.array(ApiShareSummarySchema),
      })
      .strip(),
  })
  .strip();

const RevokeShareLinkSuccessResponseSchema = z
  .object({
    ok: z.literal(true),
    data: z
      .object({
        share: ApiShareSummarySchema,
      })
      .strip(),
  })
  .strip();

const PublicSharedTripSuccessResponseSchema = z
  .object({
    ok: z.literal(true),
    data: z
      .object({
        tripPlan: TripPlanSchema,
        share: z
          .object({
            sharedAt: z.string().min(1),
            expiresAt: z.string().nullable(),
            version: z
              .object({
                versionNumber: z.number().int().positive(),
                source: TripPlanSourceSchema,
                generationMode: GenerationModeSchema,
                generatedAt: z.string().min(1),
                createdAt: z.string().min(1),
              })
              .strip(),
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

async function postJson(path: string, body: unknown, fetcher: FetchLike) {
  let response: Response;

  try {
    response = await fetcher(path, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
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

async function patchJson(path: string, body: unknown, fetcher: FetchLike) {
  let response: Response;

  try {
    response = await fetcher(path, {
      method: "PATCH",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
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

export async function createShareLinkClient(
  id: string,
  fetcher: FetchLike = fetch,
): Promise<TripHistoryClientResult<CreatedTripPlanShareLink>> {
  const requestResult = await postJson(
    `/api/travel-plans/${encodeURIComponent(id)}/share-links`,
    {},
    fetcher,
  );

  if (!requestResult.ok) {
    return requestResult;
  }

  if (!requestResult.response.ok) {
    return errorResultFromResponse(requestResult.response, requestResult.json);
  }

  const validationResult = CreateShareLinkSuccessResponseSchema.safeParse(
    requestResult.json,
  );

  if (validationResult.success) {
    return {
      ok: true,
      data: validationResult.data.data,
    };
  }

  return errorResultFromResponse(requestResult.response, requestResult.json);
}

export async function listShareLinksClient(
  id: string,
  fetcher: FetchLike = fetch,
): Promise<TripHistoryClientResult<{ shares: SavedTripPlanShareSummary[] }>> {
  const requestResult = await getJson(
    `/api/travel-plans/${encodeURIComponent(id)}/share-links`,
    fetcher,
  );

  if (!requestResult.ok) {
    return requestResult;
  }

  if (!requestResult.response.ok) {
    return errorResultFromResponse(requestResult.response, requestResult.json);
  }

  const validationResult = ShareLinksListSuccessResponseSchema.safeParse(
    requestResult.json,
  );

  if (validationResult.success) {
    return {
      ok: true,
      data: validationResult.data.data,
    };
  }

  return errorResultFromResponse(requestResult.response, requestResult.json);
}

export async function revokeShareLinkClient(
  id: string,
  shareId: string,
  fetcher: FetchLike = fetch,
): Promise<TripHistoryClientResult<{ share: SavedTripPlanShareSummary }>> {
  const requestResult = await patchJson(
    `/api/travel-plans/${encodeURIComponent(id)}/share-links/${encodeURIComponent(shareId)}`,
    { status: "revoked" },
    fetcher,
  );

  if (!requestResult.ok) {
    return requestResult;
  }

  if (!requestResult.response.ok) {
    return errorResultFromResponse(requestResult.response, requestResult.json);
  }

  const validationResult = RevokeShareLinkSuccessResponseSchema.safeParse(
    requestResult.json,
  );

  if (validationResult.success) {
    return {
      ok: true,
      data: validationResult.data.data,
    };
  }

  return errorResultFromResponse(requestResult.response, requestResult.json);
}

export async function getSharedTripClient(
  token: string,
  fetcher: FetchLike = fetch,
): Promise<TripHistoryClientResult<PublicSharedTrip>> {
  const requestResult = await getJson(
    `/api/shared/trips/${encodeURIComponent(token)}`,
    fetcher,
  );

  if (!requestResult.ok) {
    return requestResult;
  }

  if (!requestResult.response.ok) {
    return errorResultFromResponse(requestResult.response, requestResult.json);
  }

  const validationResult = PublicSharedTripSuccessResponseSchema.safeParse(
    requestResult.json,
  );

  if (validationResult.success) {
    return {
      ok: true,
      data: validationResult.data.data,
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

export async function listTripPlanVersionsClient(
  id: string,
  fetcher: FetchLike = fetch,
): Promise<TripHistoryClientResult<{ versions: SavedTripPlanVersionSummary[] }>> {
  const requestResult = await getJson(
    `/api/travel-plans/${encodeURIComponent(id)}/versions`,
    fetcher,
  );

  if (!requestResult.ok) {
    return requestResult;
  }

  if (!requestResult.response.ok) {
    return errorResultFromResponse(requestResult.response, requestResult.json);
  }

  const validationResult = VersionsListSuccessResponseSchema.safeParse(
    requestResult.json,
  );

  if (validationResult.success) {
    return {
      ok: true,
      data: validationResult.data.data,
    };
  }

  return errorResultFromResponse(requestResult.response, requestResult.json);
}

export async function getTripPlanVersionClient(
  id: string,
  versionId: string,
  fetcher: FetchLike = fetch,
): Promise<TripHistoryClientResult<SavedTripPlanVersionDetail>> {
  const requestResult = await getJson(
    `/api/travel-plans/${encodeURIComponent(id)}/versions/${encodeURIComponent(versionId)}`,
    fetcher,
  );

  if (!requestResult.ok) {
    return requestResult;
  }

  if (!requestResult.response.ok) {
    return errorResultFromResponse(requestResult.response, requestResult.json);
  }

  const validationResult = VersionDetailSuccessResponseSchema.safeParse(
    requestResult.json,
  );

  if (validationResult.success) {
    return {
      ok: true,
      data: validationResult.data.data.version,
    };
  }

  return errorResultFromResponse(requestResult.response, requestResult.json);
}

export async function restoreTripPlanVersionClient(
  id: string,
  versionId: string,
  fetcher: FetchLike = fetch,
): Promise<
  TripHistoryClientResult<{ currentVersion: SavedTripPlanVersionSummary }>
> {
  const requestResult = await postJson(
    `/api/travel-plans/${encodeURIComponent(id)}/restore`,
    { versionId },
    fetcher,
  );

  if (!requestResult.ok) {
    return requestResult;
  }

  if (!requestResult.response.ok) {
    return errorResultFromResponse(requestResult.response, requestResult.json);
  }

  const validationResult = RestoreSuccessResponseSchema.safeParse(requestResult.json);

  if (validationResult.success) {
    return {
      ok: true,
      data: validationResult.data.data,
    };
  }

  return errorResultFromResponse(requestResult.response, requestResult.json);
}
