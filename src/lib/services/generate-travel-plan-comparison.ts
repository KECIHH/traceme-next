import { buildTravelPlanComparisonPrompt } from "@/lib/ai/build-travel-plan-comparison-prompt";
import {
  AIEmptyResponseError,
  AIProviderConfigError,
  AIProviderError,
  type AIProvider,
  type AIProviderValue,
  type TripPlanPrompt,
} from "@/lib/ai/ai-provider";
import { getAIProvider } from "@/lib/ai/get-ai-provider";
import { AiJsonParseError, parseAiJson } from "@/lib/ai/parse-ai-json";
import {
  TravelPlanComparisonSchema,
  type TravelPlanComparison,
  type TripPlan,
} from "@/lib/schemas/trip";
import type { ApiErrorCode } from "@/lib/services/generate-trip-plan";

export class TravelPlanComparisonGenerationError extends Error {
  code: Exclude<ApiErrorCode, "BAD_REQUEST" | "INTERNAL_ERROR">;

  constructor(
    code: Exclude<ApiErrorCode, "BAD_REQUEST" | "INTERNAL_ERROR">,
    message: string,
  ) {
    super(message);
    this.name = "TravelPlanComparisonGenerationError";
    this.code = code;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function buildServerComparisonFields(tripPlan: TripPlan, providerName: AIProviderValue) {
  return {
    source: {
      provider: providerName,
      kind: providerName === "mock" ? "mock" : "ai",
    },
    generatedAt: providerName === "mock" ? "1970-01-01T00:00:00.000Z" : new Date().toISOString(),
    basePlanId: tripPlan.id,
  };
}

function applyServerComparisonFields(
  parsedComparison: unknown,
  tripPlan: TripPlan,
  providerName: AIProviderValue,
): unknown {
  if (!isRecord(parsedComparison)) {
    return parsedComparison;
  }

  return {
    ...parsedComparison,
    ...buildServerComparisonFields(tripPlan, providerName),
  };
}

function buildRetryPrompt(
  prompt: TripPlanPrompt,
  previousErrorCode: ApiErrorCode,
): TripPlanPrompt {
  return {
    systemPrompt: prompt.systemPrompt,
    userPrompt: [
      prompt.userPrompt,
      "",
      "Retry request: the previous output failed server validation.",
      `Failure type: ${previousErrorCode}`,
      "Return only one valid JSON object matching the required comparison schema.",
    ].join("\n"),
  };
}

function logComparisonSchemaValidationDiagnostic(validationResult: {
  error: {
    issues: Array<{
      code: string;
      message: string;
      path: Array<PropertyKey>;
    }>;
  };
}) {
  console.warn("[travel-plan-comparison-schema-validation]", {
    issues: validationResult.error.issues.slice(0, 12).map((issue) => ({
      code: issue.code,
      path: issue.path.join("."),
      message: issue.message,
    })),
  });
}

function logComparisonConsistencyDiagnostic(details: Record<string, string | number>) {
  console.warn("[travel-plan-comparison-consistency]", details);
}

function hasDailySummaryForEveryTripDay(
  comparison: TravelPlanComparison,
  tripPlan: TripPlan,
) {
  const expectedDays = new Set(tripPlan.dailyItinerary.map((day) => day.day));

  return comparison.variants.every((variant) => {
    const variantDays = new Set(variant.dailySummary.map((summary) => summary.day));

    for (const day of expectedDays) {
      if (!variantDays.has(day)) {
        return false;
      }
    }

    return true;
  });
}

function getMaxAttempts(providerName: AIProviderValue) {
  return providerName === "mock" ? 1 : 2;
}

export async function generateTravelPlanComparison(
  tripPlan: TripPlan,
): Promise<TravelPlanComparison> {
  let provider: AIProvider;

  try {
    provider = getAIProvider();
  } catch (error) {
    if (error instanceof AIProviderConfigError) {
      throw new TravelPlanComparisonGenerationError(
        "AI_PROVIDER_CONFIG_ERROR",
        "AI provider is not configured correctly.",
      );
    }

    throw new TravelPlanComparisonGenerationError(
      "AI_PROVIDER_ERROR",
      "AI provider failed to generate travel plan comparison.",
    );
  }

  const basePrompt = buildTravelPlanComparisonPrompt(tripPlan);
  const maxAttempts = getMaxAttempts(provider.name);
  let lastGenerationError: TravelPlanComparisonGenerationError | null = null;

  for (let attemptIndex = 0; attemptIndex < maxAttempts; attemptIndex += 1) {
    const prompt =
      attemptIndex === 0 || lastGenerationError === null
        ? basePrompt
        : buildRetryPrompt(basePrompt, lastGenerationError.code);
    let rawComparison: string;

    try {
      rawComparison = await provider.generateTravelPlanComparisonRawText({
        tripPlan,
        prompt,
      });
    } catch (error) {
      if (error instanceof AIProviderConfigError) {
        throw new TravelPlanComparisonGenerationError(
          "AI_PROVIDER_CONFIG_ERROR",
          "AI provider is not configured correctly.",
        );
      }

      if (error instanceof AIEmptyResponseError) {
        lastGenerationError = new TravelPlanComparisonGenerationError(
          "AI_EMPTY_RESPONSE",
          "AI provider returned an empty response.",
        );

        continue;
      }

      if (error instanceof AIProviderError) {
        throw new TravelPlanComparisonGenerationError(
          "AI_PROVIDER_ERROR",
          "AI provider failed to generate travel plan comparison.",
        );
      }

      throw new TravelPlanComparisonGenerationError(
        "AI_PROVIDER_ERROR",
        "AI provider failed to generate travel plan comparison.",
      );
    }

    if (!rawComparison.trim()) {
      lastGenerationError = new TravelPlanComparisonGenerationError(
        "AI_EMPTY_RESPONSE",
        "AI provider returned an empty response.",
      );

      continue;
    }

    let parsedComparison: unknown;

    try {
      parsedComparison = parseAiJson(rawComparison);
    } catch (error) {
      if (error instanceof AiJsonParseError) {
        lastGenerationError = new TravelPlanComparisonGenerationError(
          "AI_JSON_PARSE_ERROR",
          "AI response is not valid JSON.",
        );

        continue;
      }

      throw error;
    }

    const comparisonWithServerFields = applyServerComparisonFields(
      parsedComparison,
      tripPlan,
      provider.name,
    );
    const validationResult = TravelPlanComparisonSchema.safeParse(comparisonWithServerFields);

    if (!validationResult.success) {
      logComparisonSchemaValidationDiagnostic(validationResult);
      lastGenerationError = new TravelPlanComparisonGenerationError(
        "AI_SCHEMA_VALIDATION_ERROR",
        "AI response does not match TravelPlanComparison schema.",
      );

      continue;
    }

    if (!hasDailySummaryForEveryTripDay(validationResult.data, tripPlan)) {
      logComparisonConsistencyDiagnostic({
        event: "missing_daily_summary_day",
        basePlanId: tripPlan.id,
        expectedDays: tripPlan.dailyItinerary.length,
      });
      lastGenerationError = new TravelPlanComparisonGenerationError(
        "AI_SCHEMA_VALIDATION_ERROR",
        "AI response does not cover every trip day.",
      );

      continue;
    }

    return validationResult.data;
  }

  throw (
    lastGenerationError
    ?? new TravelPlanComparisonGenerationError(
      "AI_PROVIDER_ERROR",
      "AI provider failed to generate travel plan comparison.",
    )
  );
}
