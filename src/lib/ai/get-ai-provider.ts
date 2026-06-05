import {
  AI_PROVIDER_VALUES,
  AIProviderConfigError,
  type AIProvider,
  type AIProviderValue,
} from "@/lib/ai/ai-provider";
import { mockAIProvider } from "@/lib/ai/mock-provider";
import { createOpenAICompatibleProvider } from "@/lib/ai/openai-compatible-provider";

const DEFAULT_REQUEST_TIMEOUT_MS = 60_000;

function getProviderValue(): AIProviderValue {
  const provider = process.env.AI_PROVIDER?.trim() || "mock";

  if (AI_PROVIDER_VALUES.includes(provider as AIProviderValue)) {
    return provider as AIProviderValue;
  }

  throw new AIProviderConfigError("AI_PROVIDER must be mock or openai-compatible.");
}

function getRequiredEnv(name: string) {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new AIProviderConfigError(`${name} is required for AI_PROVIDER=openai-compatible.`);
  }

  return value;
}

function getRequestTimeoutMs() {
  const rawValue = process.env.AI_REQUEST_TIMEOUT_MS?.trim();

  if (!rawValue) {
    return DEFAULT_REQUEST_TIMEOUT_MS;
  }

  const timeout = Number(rawValue);

  if (!Number.isInteger(timeout) || timeout <= 0) {
    throw new AIProviderConfigError("AI_REQUEST_TIMEOUT_MS must be a positive integer.");
  }

  return timeout;
}

export function getAIProvider(): AIProvider {
  const provider = getProviderValue();

  if (provider === "mock") {
    return mockAIProvider;
  }

  return createOpenAICompatibleProvider({
    apiKey: getRequiredEnv("AI_API_KEY"),
    model: getRequiredEnv("AI_MODEL"),
    chatCompletionsUrl: getRequiredEnv("AI_CHAT_COMPLETIONS_URL"),
    requestTimeoutMs: getRequestTimeoutMs(),
  });
}
