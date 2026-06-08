import {
  TravelPlanComparisonSchema,
  type TravelPlanComparison,
  type TripPlan,
} from "@/lib/schemas/trip";

type ApiErrorCode =
  | "BAD_REQUEST"
  | "AI_PROVIDER_CONFIG_ERROR"
  | "AI_PROVIDER_ERROR"
  | "AI_EMPTY_RESPONSE"
  | "AI_JSON_PARSE_ERROR"
  | "AI_SCHEMA_VALIDATION_ERROR"
  | "INTERNAL_ERROR";

type ApiSuccessResponse = {
  ok: true;
  data: unknown;
};

type ApiErrorResponse = {
  ok: false;
  error: {
    code: ApiErrorCode;
    message: string;
    requestId: string;
  };
};

export type GenerateTravelPlanComparisonClientResult =
  | {
      ok: true;
      data: TravelPlanComparison;
    }
  | {
      ok: false;
      errorCode?: ApiErrorCode;
      errorMessage: string;
    };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isApiSuccessResponse(value: unknown): value is ApiSuccessResponse {
  return isRecord(value) && value.ok === true && "data" in value;
}

function isApiErrorResponse(value: unknown): value is ApiErrorResponse {
  if (!isRecord(value) || value.ok !== false || !isRecord(value.error)) {
    return false;
  }

  return typeof value.error.code === "string";
}

function toUserFacingErrorMessage(code?: string) {
  switch (code) {
    case "BAD_REQUEST":
      return "当前旅行计划无法生成对比方案，请先重新生成主计划。";
    case "AI_PROVIDER_CONFIG_ERROR":
      return "服务端 AI 配置暂时不可用，请稍后再试。";
    case "AI_PROVIDER_ERROR":
    case "AI_EMPTY_RESPONSE":
    case "AI_JSON_PARSE_ERROR":
    case "AI_SCHEMA_VALIDATION_ERROR":
      return "对比方案生成暂时不稳定，请稍后重试。";
    case "INTERNAL_ERROR":
      return "服务暂时不可用，请稍后再试。";
    default:
      return "对比方案生成失败，请稍后再试。";
  }
}

async function readJsonSafely(response: Response) {
  try {
    return (await response.json()) as unknown;
  } catch {
    return null;
  }
}

export async function generateTravelPlanComparisonFromApi(
  tripPlan: TripPlan,
): Promise<GenerateTravelPlanComparisonClientResult> {
  let response: Response;

  try {
    response = await fetch("/api/travel-plans/compare", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ tripPlan }),
    });
  } catch {
    return {
      ok: false,
      errorMessage: "网络连接异常，请检查网络后再试。",
    };
  }

  const json = await readJsonSafely(response);

  if (isApiSuccessResponse(json)) {
    const validationResult = TravelPlanComparisonSchema.safeParse(json.data);

    if (!validationResult.success) {
      return {
        ok: false,
        errorMessage: "对比方案格式异常，请稍后重试。",
      };
    }

    return {
      ok: true,
      data: validationResult.data,
    };
  }

  if (isApiErrorResponse(json)) {
    return {
      ok: false,
      errorCode: json.error.code,
      errorMessage: toUserFacingErrorMessage(json.error.code),
    };
  }

  if (!response.ok) {
    return {
      ok: false,
      errorMessage: toUserFacingErrorMessage(),
    };
  }

  return {
    ok: false,
    errorMessage: "对比方案格式异常，请稍后重试。",
  };
}
