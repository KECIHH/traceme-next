import { TripPlanSchema, type GenerateTripPlanRequest, type TripPlan } from "@/lib/schemas/trip";

type ApiErrorCode =
  | "BAD_REQUEST"
  | "MOCK_PROVIDER_ERROR"
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

export type GenerateTripPlanClientResult =
  | {
      ok: true;
      data: TripPlan;
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
      return "请检查出发地、目的地、日期、人数、预算和偏好是否填写正确。";
    case "MOCK_PROVIDER_ERROR":
    case "AI_JSON_PARSE_ERROR":
    case "AI_SCHEMA_VALIDATION_ERROR":
      return "生成的旅行计划草稿暂时不稳定，请稍后重试。";
    case "INTERNAL_ERROR":
      return "服务暂时不可用，请稍后再试。";
    default:
      return "生成失败，请稍后再试。";
  }
}

async function readJsonSafely(response: Response) {
  try {
    return (await response.json()) as unknown;
  } catch {
    return null;
  }
}

export async function generateTripPlanFromApi(
  request: GenerateTripPlanRequest,
): Promise<GenerateTripPlanClientResult> {
  let response: Response;

  try {
    response = await fetch("/api/travel-plans/generate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(request),
    });
  } catch {
    return {
      ok: false,
      errorMessage: "网络连接异常，请检查网络后再试。",
    };
  }

  const json = await readJsonSafely(response);

  if (isApiSuccessResponse(json)) {
    const validationResult = TripPlanSchema.safeParse(json.data);

    if (!validationResult.success) {
      return {
        ok: false,
        errorMessage: "生成结果格式异常，请稍后重试。",
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
    errorMessage: "生成结果格式异常，请稍后重试。",
  };
}
