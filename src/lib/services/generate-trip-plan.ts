import { generateMockTripPlanJson } from "@/lib/ai/mock-provider";
import { AiJsonParseError, parseAiJson } from "@/lib/ai/parse-ai-json";
import {
  TripPlanSchema,
  type GenerateTripPlanRequest,
  type TripPlan,
} from "@/lib/schemas/trip";

export const API_ERROR_CODES = [
  "BAD_REQUEST",
  "MOCK_PROVIDER_ERROR",
  "AI_JSON_PARSE_ERROR",
  "AI_SCHEMA_VALIDATION_ERROR",
  "INTERNAL_ERROR",
] as const;

export type ApiErrorCode = (typeof API_ERROR_CODES)[number];

export class TripGenerationError extends Error {
  code: Exclude<ApiErrorCode, "BAD_REQUEST" | "INTERNAL_ERROR">;

  constructor(
    code: Exclude<ApiErrorCode, "BAD_REQUEST" | "INTERNAL_ERROR">,
    message: string,
  ) {
    super(message);
    this.name = "TripGenerationError";
    this.code = code;
  }
}

export async function generateTripPlan(request: GenerateTripPlanRequest): Promise<TripPlan> {
  let rawTripPlan: string;

  try {
    rawTripPlan = await generateMockTripPlanJson(request);
  } catch {
    throw new TripGenerationError("MOCK_PROVIDER_ERROR", "Mock provider failed to generate a trip plan.");
  }

  let parsedTripPlan: unknown;

  try {
    parsedTripPlan = parseAiJson(rawTripPlan);
  } catch (error) {
    if (error instanceof AiJsonParseError) {
      throw new TripGenerationError("AI_JSON_PARSE_ERROR", "AI response is not valid JSON.");
    }

    throw error;
  }

  const validationResult = TripPlanSchema.safeParse(parsedTripPlan);

  if (!validationResult.success) {
    throw new TripGenerationError(
      "AI_SCHEMA_VALIDATION_ERROR",
      "AI response does not match TripPlan schema.",
    );
  }

  return validationResult.data;
}
