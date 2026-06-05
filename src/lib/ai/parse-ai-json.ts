export class AiJsonParseError extends Error {
  constructor(message = "AI response is not valid JSON.") {
    super(message);
    this.name = "AiJsonParseError";
  }
}

export function parseAiJson(raw: string): unknown {
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    throw new AiJsonParseError();
  }
}
