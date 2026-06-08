import {
  AIEmptyResponseError,
  AIProviderError,
  type AIProvider,
  type GenerateTravelPlanComparisonRawTextInput,
  type GenerateTripPlanRawTextInput,
  type TripPlanPrompt,
} from "@/lib/ai/ai-provider";

type OpenAICompatibleProviderConfig = {
  apiKey: string;
  model: string;
  chatCompletionsUrl: string;
  requestTimeoutMs: number;
};

const MAX_COMPLETION_TOKENS = 4_096;
const MAX_OUTPUT_TOKENS = 2_048;
const MAX_PROVIDER_ATTEMPTS = 2;

type ChatCompletionResponse = {
  choices?: Array<{
    message?: {
      content?: unknown;
    };
  }>;
};

type ResponsesApiResponse = {
  output_text?: unknown;
  output?: Array<{
    content?: Array<{
      text?: unknown;
    }>;
  }>;
};

type ProviderResponsePayload =
  | {
      kind: "json";
      value: unknown;
    }
  | {
      kind: "rawText";
      value: string;
    };

class TransientAIProviderError extends AIProviderError {
  constructor(message = "AI provider request failed temporarily.") {
    super(message);
    this.name = "TransientAIProviderError";
  }
}

function normalizeChatCompletionsUrl(url: string) {
  const parsedUrl = new URL(url);
  const pathname = parsedUrl.pathname.replace(/\/+$/, "");

  if (/\/chat\/completions$/i.test(pathname)) {
    return parsedUrl.toString();
  }

  parsedUrl.pathname =
    pathname === "" || pathname === "/"
      ? "/v1/chat/completions"
      : `${pathname}/chat/completions`;

  return parsedUrl.toString();
}

function normalizeResponsesUrl(url: string) {
  const parsedUrl = new URL(url);
  const pathname = parsedUrl.pathname.replace(/\/+$/, "");

  if (/\/responses$/i.test(pathname)) {
    return parsedUrl.toString();
  }

  parsedUrl.pathname =
    pathname === "" || pathname === "/"
      ? "/v1/responses"
      : `${pathname}/responses`;

  return parsedUrl.toString();
}

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

function readResponsesContent(value: unknown) {
  if (!isRecord(value)) {
    return "";
  }

  const response = value as ResponsesApiResponse;

  if (typeof response.output_text === "string") {
    return response.output_text.trim();
  }

  const content = response.output
    ?.flatMap((item) => item.content ?? [])
    .map((item) => item.text)
    .filter((text): text is string => typeof text === "string")
    .join("\n")
    .trim();

  return content ?? "";
}

function logProviderDiagnostic(details: Record<string, string | number>) {
  console.warn("[ai-provider:openai-compatible]", details);
}

function isTransientHttpStatus(status: number) {
  return status === 408 || status === 409 || status === 425 || status === 429 || status >= 500;
}

export function createOpenAICompatibleProvider(
  config: OpenAICompatibleProviderConfig,
): AIProvider {
  const chatCompletionsUrl = normalizeChatCompletionsUrl(config.chatCompletionsUrl);
  const responsesUrl = normalizeResponsesUrl(config.chatCompletionsUrl);

  async function readResponsePayload(
    response: Response,
    protocol: string,
  ): Promise<ProviderResponsePayload> {
    const responseText = await response.text();

    try {
      return {
        kind: "json",
        value: JSON.parse(responseText) as unknown,
      };
    } catch {
      logProviderDiagnostic({
        event: "invalid_json_response",
        model: config.model,
        protocol,
        urlHost: getSafeUrlHost(response.url),
        status: response.status,
      });

      return {
        kind: "rawText",
        value: responseText.trim(),
      };
    }
  }

  async function generateRawTextWithPrompt(prompt: TripPlanPrompt) {
    async function generateWithChatCompletions(signal: AbortSignal) {
      const response = await fetch(chatCompletionsUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${config.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: config.model,
          max_tokens: MAX_COMPLETION_TOKENS,
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
        signal,
      });

      if (!response.ok) {
        logProviderDiagnostic({
          event: "non_2xx_response",
          model: config.model,
          protocol: "chat_completions",
          urlHost: getSafeUrlHost(chatCompletionsUrl),
          status: response.status,
        });

        if (response.status === 400 || response.status === 404) {
          return {
            shouldFallbackToResponses: true,
            rawText: "",
          };
        }

        if (isTransientHttpStatus(response.status)) {
          throw new TransientAIProviderError();
        }

        throw new AIProviderError("AI provider request failed.");
      }

      const payload = await readResponsePayload(response, "chat_completions");
      const rawText =
        payload.kind === "json" ? readMessageContent(payload.value) : payload.value;

      if (!rawText) {
        logProviderDiagnostic({
          event: "empty_message_content",
          model: config.model,
          protocol: "chat_completions",
          urlHost: getSafeUrlHost(chatCompletionsUrl),
        });
        throw new AIEmptyResponseError();
      }

      return {
        shouldFallbackToResponses: false,
        rawText,
      };
    }

    async function generateWithResponses(signal: AbortSignal) {
      const response = await fetch(responsesUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${config.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: config.model,
          instructions: prompt.systemPrompt,
          input: prompt.userPrompt,
          max_output_tokens: MAX_OUTPUT_TOKENS,
        }),
        signal,
      });

      if (!response.ok) {
        logProviderDiagnostic({
          event: "non_2xx_response",
          model: config.model,
          protocol: "responses",
          urlHost: getSafeUrlHost(responsesUrl),
          status: response.status,
        });

        if (isTransientHttpStatus(response.status)) {
          throw new TransientAIProviderError();
        }

        throw new AIProviderError("AI provider request failed.");
      }

      const payload = await readResponsePayload(response, "responses");
      const rawText =
        payload.kind === "json" ? readResponsesContent(payload.value) : payload.value;

      if (!rawText) {
        logProviderDiagnostic({
          event: "empty_message_content",
          model: config.model,
          protocol: "responses",
          urlHost: getSafeUrlHost(responsesUrl),
        });
        throw new AIEmptyResponseError();
      }

      return rawText;
    }

    async function generateOnce() {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), config.requestTimeoutMs);

      try {
        if (/\/responses\/?$/i.test(new URL(config.chatCompletionsUrl).pathname)) {
          return await generateWithResponses(controller.signal);
        }

        const chatResult = await generateWithChatCompletions(controller.signal);

        if (!chatResult.shouldFallbackToResponses) {
          return chatResult.rawText;
        }

        return await generateWithResponses(controller.signal);
      } catch (error) {
        if (error instanceof AIEmptyResponseError || error instanceof AIProviderError) {
          throw error;
        }

        logProviderDiagnostic({
          event:
            error instanceof DOMException && error.name === "AbortError"
              ? "timeout"
              : "request_error",
          model: config.model,
          protocol: "auto",
          urlHost: getSafeUrlHost(config.chatCompletionsUrl),
        });
        throw new TransientAIProviderError();
      } finally {
        clearTimeout(timeout);
      }
    }

    for (let attemptIndex = 0; attemptIndex < MAX_PROVIDER_ATTEMPTS; attemptIndex += 1) {
      try {
        return await generateOnce();
      } catch (error) {
        if (
          error instanceof TransientAIProviderError
          && attemptIndex < MAX_PROVIDER_ATTEMPTS - 1
        ) {
          logProviderDiagnostic({
            event: "retry_transient_error",
            model: config.model,
            protocol: "auto",
            urlHost: getSafeUrlHost(config.chatCompletionsUrl),
            attempt: attemptIndex + 1,
          });
          continue;
        }

        if (error instanceof TransientAIProviderError) {
          throw new AIProviderError("AI provider request failed.");
        }

        throw error;
      }
    }

    throw new AIProviderError("AI provider request failed.");
  }

  return {
    name: "openai-compatible",
    generateTripPlanRawText({ prompt }: GenerateTripPlanRawTextInput) {
      return generateRawTextWithPrompt(prompt);
    },
    generateTravelPlanComparisonRawText({
      prompt,
    }: GenerateTravelPlanComparisonRawTextInput) {
      return generateRawTextWithPrompt(prompt);
    },
  };
}
