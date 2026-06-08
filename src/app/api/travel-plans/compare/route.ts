import { NextResponse } from "next/server";

import { TravelPlanComparisonRequestSchema } from "@/lib/schemas/trip";
import {
  generateTravelPlanComparison,
  TravelPlanComparisonGenerationError,
} from "@/lib/services/generate-travel-plan-comparison";
import type { ApiErrorCode } from "@/lib/services/generate-trip-plan";

type ErrorResponse = {
  ok: false;
  error: {
    code: ApiErrorCode;
    message: string;
    requestId: string;
  };
};

function createRequestId() {
  return crypto.randomUUID();
}

function errorResponse(
  code: ApiErrorCode,
  message: string,
  requestId: string,
  status: number,
) {
  return NextResponse.json<ErrorResponse>(
    {
      ok: false,
      error: {
        code,
        message,
        requestId,
      },
    },
    { status },
  );
}

function getGenerationErrorStatus(code: ApiErrorCode) {
  switch (code) {
    case "AI_PROVIDER_CONFIG_ERROR":
      return 500;
    case "AI_PROVIDER_ERROR":
    case "AI_EMPTY_RESPONSE":
    case "AI_JSON_PARSE_ERROR":
    case "AI_SCHEMA_VALIDATION_ERROR":
      return 502;
    case "BAD_REQUEST":
      return 400;
    case "INTERNAL_ERROR":
      return 500;
  }
}

export async function POST(request: Request) {
  const requestId = createRequestId();

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return errorResponse("BAD_REQUEST", "Request body must be valid JSON.", requestId, 400);
  }

  const validationResult = TravelPlanComparisonRequestSchema.safeParse(body);

  if (!validationResult.success) {
    return errorResponse("BAD_REQUEST", "Request body is invalid.", requestId, 400);
  }

  try {
    const comparison = await generateTravelPlanComparison(validationResult.data.tripPlan);

    return NextResponse.json({
      ok: true,
      data: comparison,
    });
  } catch (error) {
    if (error instanceof TravelPlanComparisonGenerationError) {
      return errorResponse(
        error.code,
        error.message,
        requestId,
        getGenerationErrorStatus(error.code),
      );
    }

    return errorResponse("INTERNAL_ERROR", "Internal server error.", requestId, 500);
  }
}
