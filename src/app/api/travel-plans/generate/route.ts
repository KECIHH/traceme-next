import { NextResponse } from "next/server";

import {
  generateTripPlan,
  TripGenerationError,
  type ApiErrorCode,
} from "@/lib/services/generate-trip-plan";
import { GenerateTripPlanRequestSchema } from "@/lib/schemas/trip";

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
    case "MOCK_PROVIDER_ERROR":
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

  const validationResult = GenerateTripPlanRequestSchema.safeParse(body);

  if (!validationResult.success) {
    return errorResponse("BAD_REQUEST", "Request body is invalid.", requestId, 400);
  }

  try {
    const tripPlan = await generateTripPlan(validationResult.data);

    return NextResponse.json({
      ok: true,
      data: tripPlan,
    });
  } catch (error) {
    if (error instanceof TripGenerationError) {
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
