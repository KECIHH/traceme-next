export class AiJsonParseError extends Error {
  constructor(message = "AI response is not valid JSON.") {
    super(message);
    this.name = "AiJsonParseError";
  }
}

function extractJsonCodeBlock(raw: string) {
  const match = raw.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);

  return match?.[1];
}

function extractFirstJsonObject(raw: string) {
  const startIndex = raw.indexOf("{");

  if (startIndex === -1) {
    return undefined;
  }

  let depth = 0;
  let isInsideString = false;
  let isEscaped = false;

  for (let index = startIndex; index < raw.length; index += 1) {
    const character = raw[index];

    if (isInsideString) {
      if (isEscaped) {
        isEscaped = false;
      } else if (character === "\\") {
        isEscaped = true;
      } else if (character === "\"") {
        isInsideString = false;
      }

      continue;
    }

    if (character === "\"") {
      isInsideString = true;
      continue;
    }

    if (character === "{") {
      depth += 1;
    } else if (character === "}") {
      depth -= 1;

      if (depth === 0) {
        return raw.slice(startIndex, index + 1);
      }
    }
  }

  return undefined;
}

function parseJsonCandidate(candidate: string) {
  return JSON.parse(candidate) as unknown;
}

export function parseAiJson(raw: string): unknown {
  const candidates = [
    raw,
    extractJsonCodeBlock(raw),
    extractFirstJsonObject(raw),
  ].filter((candidate): candidate is string => Boolean(candidate?.trim()));

  for (const candidate of candidates) {
    try {
      return parseJsonCandidate(candidate);
    } catch {
      // Try the next candidate. AI output sometimes wraps JSON in prose or fences.
    }
  }

  throw new AiJsonParseError();
}
