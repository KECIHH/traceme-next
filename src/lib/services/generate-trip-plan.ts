import { buildTripPlanPrompt } from "@/lib/ai/build-trip-plan-prompt";
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
  TripPlanSchema,
  type GenerateTripPlanRequest,
  type TripPlan,
} from "@/lib/schemas/trip";
import { calculateTripDays } from "@/lib/utils/date";

export const API_ERROR_CODES = [
  "BAD_REQUEST",
  "AI_PROVIDER_CONFIG_ERROR",
  "AI_PROVIDER_ERROR",
  "AI_EMPTY_RESPONSE",
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function buildServerTripPlanFields(
  request: GenerateTripPlanRequest,
  providerName: AIProviderValue,
) {
  const days = calculateTripDays(request.startDate, request.endDate);

  if (days === null) {
    throw new TripGenerationError("AI_SCHEMA_VALIDATION_ERROR", "Trip date range is invalid.");
  }

  return {
    id: `trip-${crypto.randomUUID()}`,
    generatedAt: new Date().toISOString(),
    generationMode: request.generationMode,
    source: {
      provider: providerName,
      kind: providerName === "mock" ? "mock" : "ai",
    },
    input: {
      ...request,
      days,
    },
  };
}

function applyServerTripPlanFields(
  parsedTripPlan: unknown,
  request: GenerateTripPlanRequest,
  providerName: AIProviderValue,
): unknown {
  if (!isRecord(parsedTripPlan)) {
    return parsedTripPlan;
  }

  return {
    ...parsedTripPlan,
    ...buildServerTripPlanFields(request, providerName),
  };
}

function buildRetryPrompt(prompt: TripPlanPrompt, previousErrorCode: ApiErrorCode): TripPlanPrompt {
  return {
    systemPrompt: prompt.systemPrompt,
    userPrompt: [
      prompt.userPrompt,
      "",
      "重试要求：上一次输出未能通过服务端校验。",
      `失败类型：${previousErrorCode}`,
      "请只返回一个合法 JSON object，严格匹配字段结构，不要输出解释文字、Markdown 或代码块。",
    ].join("\n"),
  };
}

function getMaxAttempts(providerName: AIProviderValue) {
  return providerName === "mock" ? 1 : 2;
}

export async function generateTripPlan(request: GenerateTripPlanRequest): Promise<TripPlan> {
  let provider: AIProvider;

  try {
    provider = getAIProvider();
  } catch (error) {
    if (error instanceof AIProviderConfigError) {
      throw new TripGenerationError(
        "AI_PROVIDER_CONFIG_ERROR",
        "AI provider is not configured correctly.",
      );
    }

    throw new TripGenerationError("AI_PROVIDER_ERROR", "AI provider failed to generate a trip plan.");
  }

  const basePrompt = buildTripPlanPrompt(request);
  const maxAttempts = getMaxAttempts(provider.name);
  let lastGenerationError: TripGenerationError | null = null;

  for (let attemptIndex = 0; attemptIndex < maxAttempts; attemptIndex += 1) {
    const prompt =
      attemptIndex === 0 || lastGenerationError === null
        ? basePrompt
        : buildRetryPrompt(basePrompt, lastGenerationError.code);
    let rawTripPlan: string;

    try {
      rawTripPlan = await provider.generateTripPlanRawText({ request, prompt });
    } catch (error) {
      if (error instanceof AIProviderConfigError) {
        throw new TripGenerationError(
          "AI_PROVIDER_CONFIG_ERROR",
          "AI provider is not configured correctly.",
        );
      }

      if (error instanceof AIEmptyResponseError) {
        lastGenerationError = new TripGenerationError(
          "AI_EMPTY_RESPONSE",
          "AI provider returned an empty response.",
        );

        continue;
      }

      if (error instanceof AIProviderError) {
        throw new TripGenerationError("AI_PROVIDER_ERROR", "AI provider failed to generate a trip plan.");
      }

      throw new TripGenerationError("AI_PROVIDER_ERROR", "AI provider failed to generate a trip plan.");
    }

    if (!rawTripPlan.trim()) {
      lastGenerationError = new TripGenerationError(
        "AI_EMPTY_RESPONSE",
        "AI provider returned an empty response.",
      );

      continue;
    }

    let parsedTripPlan: unknown;

    try {
      parsedTripPlan = parseAiJson(rawTripPlan);
    } catch (error) {
      if (error instanceof AiJsonParseError) {
        lastGenerationError = new TripGenerationError(
          "AI_JSON_PARSE_ERROR",
          "AI response is not valid JSON.",
        );

        continue;
      }

      throw error;
    }

    const tripPlanWithServerFields = applyServerTripPlanFields(
      parsedTripPlan,
      request,
      provider.name,
    );
    const validationResult = TripPlanSchema.safeParse(tripPlanWithServerFields);

    if (!validationResult.success) {
      lastGenerationError = new TripGenerationError(
        "AI_SCHEMA_VALIDATION_ERROR",
        "AI response does not match TripPlan schema.",
      );

      continue;
    }

    return validationResult.data;
  }

  throw lastGenerationError ?? new TripGenerationError(
    "AI_PROVIDER_ERROR",
    "AI provider failed to generate a trip plan.",
  );
}
