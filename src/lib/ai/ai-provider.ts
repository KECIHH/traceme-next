import type { GenerateTripPlanRequest, TripPlan } from "@/lib/schemas/trip";

export const AI_PROVIDER_VALUES = ["mock", "openai-compatible"] as const;

export type AIProviderValue = (typeof AI_PROVIDER_VALUES)[number];

export type TripPlanPrompt = {
  systemPrompt: string;
  userPrompt: string;
};

export type GenerateTripPlanRawTextInput = {
  request: GenerateTripPlanRequest;
  prompt: TripPlanPrompt;
};

export type GenerateTravelPlanComparisonRawTextInput = {
  tripPlan: TripPlan;
  prompt: TripPlanPrompt;
};

export interface AIProvider {
  name: AIProviderValue;
  generateTripPlanRawText(input: GenerateTripPlanRawTextInput): Promise<string>;
  generateTravelPlanComparisonRawText(
    input: GenerateTravelPlanComparisonRawTextInput,
  ): Promise<string>;
}

export class AIProviderConfigError extends Error {
  constructor(message = "AI provider is not configured correctly.") {
    super(message);
    this.name = "AIProviderConfigError";
  }
}

export class AIProviderError extends Error {
  constructor(message = "AI provider request failed.") {
    super(message);
    this.name = "AIProviderError";
  }
}

export class AIEmptyResponseError extends Error {
  constructor(message = "AI provider returned an empty response.") {
    super(message);
    this.name = "AIEmptyResponseError";
  }
}
