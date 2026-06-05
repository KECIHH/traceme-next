import {
  AIEmptyResponseError,
  AIProviderError,
  type AIProvider,
  type GenerateTripPlanRawTextInput,
} from "@/lib/ai/ai-provider";

type OpenAICompatibleProviderConfig = {
  apiKey: string;
  model: string;
  chatCompletionsUrl: string;
  requestTimeoutMs: number;
};

type ChatCompletionResponse = {
  choices?: Array<{
    message?: {
      content?: unknown;
    };
  }>;
};

function getSafeUrlHost(url: string) {
  try {
    return new URL(url).host;
  } catch {
    return "invalid-url";
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function readMessageContent(value: unknown) {
  if (!isRecord(value)) {
    return "";
  }

  const response = value as ChatCompletionResponse;
  const content = response.choices?.[0]?.message?.content;

  return typeof content === "string" ? content.trim() : "";
}

function logProviderDiagnostic(details: Record<string, string | number>) {
  console.warn("[ai-provider:openai-compatible]", details);
}

export function createOpenAICompatibleProvider(
  config: OpenAICompatibleProviderConfig,
): AIProvider {
  return {
    name: "openai-compatible",
    async generateTripPlanRawText({ prompt }: GenerateTripPlanRawTextInput) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), config.requestTimeoutMs);

      try {
        const response = await fetch(config.chatCompletionsUrl, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${config.apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: config.model,
            messages: [
              {
                role: "system",
                content: prompt.systemPrompt,
              },
              {
                role: "user",
                content: prompt.userPrompt,
              },
            ],
          }),
          signal: controller.signal,
        });

        if (!response.ok) {
          logProviderDiagnostic({
            event: "non_2xx_response",
            model: config.model,
            urlHost: getSafeUrlHost(config.chatCompletionsUrl),
            status: response.status,
          });
          throw new AIProviderError("AI provider request failed.");
        }

        let json: unknown;

        try {
          json = (await response.json()) as unknown;
        } catch {
          logProviderDiagnostic({
            event: "invalid_json_response",
            model: config.model,
            urlHost: getSafeUrlHost(config.chatCompletionsUrl),
          });
          throw new AIProviderError("AI provider response was not valid JSON.");
        }

        const rawText = readMessageContent(json);

        if (!rawText) {
          logProviderDiagnostic({
            event: "empty_message_content",
            model: config.model,
            urlHost: getSafeUrlHost(config.chatCompletionsUrl),
          });
          throw new AIEmptyResponseError();
        }

        return rawText;
      } catch (error) {
        if (error instanceof AIEmptyResponseError || error instanceof AIProviderError) {
          throw error;
        }

        logProviderDiagnostic({
          event: error instanceof DOMException && error.name === "AbortError" ? "timeout" : "request_error",
          model: config.model,
          urlHost: getSafeUrlHost(config.chatCompletionsUrl),
        });
        throw new AIProviderError("AI provider request failed.");
      } finally {
        clearTimeout(timeout);
      }
    },
  };
}
