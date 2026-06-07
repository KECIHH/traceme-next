#!/usr/bin/env node

const DEFAULT_BASE_URL = "http://127.0.0.1:3000";
const EXPECTED_PROVIDERS = new Set(["mock", "openai-compatible", "missing-config"]);
const REQUIRED_VERIFY_CATEGORIES = [
  "ticketReservation",
  "openingHours",
  "hotelPrice",
  "transportSchedulePrice",
  "weather",
];
const SENSITIVE_RESPONSE_PATTERN =
  /sk-[A-Za-z0-9]|Bearer\s+|Authorization|AI_API_KEY|api-key|stack/i;

const sampleRequest = {
  departureCity: "上海",
  destination: "厦门",
  startDate: "2026-07-01",
  endDate: "2026-07-03",
  travelers: 2,
  budget: {
    amount: 6000,
    currency: "CNY",
    scope: "total",
  },
  preferences: ["美食", "文化"],
  customPreference: "每天不要太赶。",
  pace: "balanced",
  generationMode: "quick",
};

function readArgs(argv) {
  const args = {
    baseUrl: DEFAULT_BASE_URL,
    expectProvider: "mock",
  };

  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];

    if (value === "--base-url") {
      args.baseUrl = argv[index + 1];
      index += 1;
      continue;
    }

    if (value === "--expect-provider") {
      args.expectProvider = argv[index + 1];
      index += 1;
      continue;
    }

    throw new Error(`Unknown argument: ${value}`);
  }

  if (!args.baseUrl) {
    throw new Error("--base-url cannot be empty.");
  }

  if (!EXPECTED_PROVIDERS.has(args.expectProvider)) {
    throw new Error("--expect-provider must be mock, openai-compatible, or missing-config.");
  }

  return args;
}

function buildUrl(baseUrl, pathname) {
  const url = new URL(baseUrl);
  url.pathname = pathname;
  url.search = "";
  url.hash = "";
  return url.toString();
}

async function readJsonResponse(response) {
  const text = await response.text();

  try {
    return {
      payload: JSON.parse(text),
      sensitivePatternMatched: SENSITIVE_RESPONSE_PATTERN.test(text),
    };
  } catch {
    throw new Error(`Expected JSON response, received HTTP ${response.status}.`);
  }
}

function hasRequiredVerifyCategories(items) {
  const categories = new Set((items ?? []).map((item) => item.category));
  return REQUIRED_VERIFY_CATEGORIES.every((category) => categories.has(category));
}

function assertSuccessPayload(payload, expectedProvider) {
  if (payload?.ok !== true) {
    throw new Error("Expected ok=true response.");
  }

  const data = payload.data;
  const expectedKind = expectedProvider === "mock" ? "mock" : "ai";

  if (data?.source?.provider !== expectedProvider) {
    throw new Error(`Expected provider=${expectedProvider}.`);
  }

  if (data?.source?.kind !== expectedKind) {
    throw new Error(`Expected source.kind=${expectedKind}.`);
  }

  if (!Array.isArray(data.dailyItinerary) || data.input?.days !== data.dailyItinerary.length) {
    throw new Error("Expected input.days to match dailyItinerary length.");
  }

  if (!hasRequiredVerifyCategories(data.userVerifyItems)) {
    throw new Error("Expected all required user verification categories.");
  }

  return {
    ok: true,
    provider: data.source.provider,
    kind: data.source.kind,
    inputDays: data.input.days,
    itineraryLength: data.dailyItinerary.length,
    daysMatch: data.input.days === data.dailyItinerary.length,
    requiredVerifyCategoriesPresent: true,
  };
}

function assertMissingConfigPayload(response, payload) {
  if (response.status !== 500) {
    throw new Error(`Expected HTTP 500 for missing config, received ${response.status}.`);
  }

  if (payload?.ok !== false) {
    throw new Error("Expected ok=false response for missing config.");
  }

  if (payload?.error?.code !== "AI_PROVIDER_CONFIG_ERROR") {
    throw new Error("Expected AI_PROVIDER_CONFIG_ERROR.");
  }

  if (!payload.error.requestId) {
    throw new Error("Expected requestId in error response.");
  }

  return {
    ok: false,
    errorCode: payload.error.code,
    hasRequestId: true,
  };
}

async function main() {
  const args = readArgs(process.argv.slice(2));
  const baseUrl = args.baseUrl.replace(/\/+$/, "");
  const homeResponse = await fetch(buildUrl(baseUrl, "/"));
  const homeText = await homeResponse.text();

  if (!homeResponse.ok) {
    throw new Error(`Homepage returned HTTP ${homeResponse.status}.`);
  }

  if (!homeText.includes("迹遇 Next")) {
    throw new Error("Homepage did not include the app signal text.");
  }

  const apiResponse = await fetch(buildUrl(baseUrl, "/api/travel-plans/generate"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(sampleRequest),
  });
  const { payload, sensitivePatternMatched } = await readJsonResponse(apiResponse);

  const apiSummary =
    args.expectProvider === "missing-config"
      ? assertMissingConfigPayload(apiResponse, payload)
      : assertSuccessPayload(payload, args.expectProvider);

  const summary = {
    baseUrl,
    expectProvider: args.expectProvider,
    homepageStatus: homeResponse.status,
    homepageHasAppSignal: true,
    apiStatus: apiResponse.status,
    sensitivePatternMatched,
    ...apiSummary,
  };

  process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
}

main().catch((error) => {
  process.stderr.write(`Smoke test failed: ${error.message}\n`);
  process.exitCode = 1;
});
