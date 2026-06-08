import assert from "node:assert/strict";
import test from "node:test";

import { POST as compareTravelPlansPost } from "@/app/api/travel-plans/compare/route";
import { parseAiJson } from "@/lib/ai/parse-ai-json";
import { formatTripPlanMarkdown } from "@/lib/markdown/format-trip-plan-markdown";
import {
  generateMockTravelPlanComparisonJson,
  generateMockTripPlanJson,
} from "@/lib/ai/mock-provider";
import {
  GenerateTripPlanRequestSchema,
  TravelPlanComparisonSchema,
  TripPlanSchema,
  type GenerateTripPlanRequest,
  type TripPlan,
} from "@/lib/schemas/trip";
import { generateTravelPlanComparison } from "@/lib/services/generate-travel-plan-comparison";
import { getBudgetSummary } from "@/lib/utils/budget";

const validRequest: GenerateTripPlanRequest = {
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

function cloneTripPlan(plan: TripPlan): TripPlan {
  return structuredClone(plan) as TripPlan;
}

async function buildValidTripPlan() {
  const raw = await generateMockTripPlanJson(validRequest);
  return TripPlanSchema.parse(JSON.parse(raw));
}

test("GenerateTripPlanRequestSchema accepts a valid MVP request", () => {
  const result = GenerateTripPlanRequestSchema.safeParse(validRequest);

  assert.equal(result.success, true);
  assert.equal(result.success ? result.data.budget.scope : undefined, "total");
});

test("GenerateTripPlanRequestSchema rejects invalid request inputs", () => {
  const invalidCases: unknown[] = [
    { ...validRequest, departureCity: "" },
    { ...validRequest, endDate: "2026-06-30" },
    { ...validRequest, travelers: 0 },
    { ...validRequest, budget: { ...validRequest.budget, amount: 0 } },
    { ...validRequest, preferences: [] },
    { ...validRequest, generationMode: "referenceEnhanced" },
  ];

  for (const invalidRequest of invalidCases) {
    assert.equal(GenerateTripPlanRequestSchema.safeParse(invalidRequest).success, false);
  }
});

test("TripPlanSchema enforces day count consistency", async () => {
  const validPlan = await buildValidTripPlan();
  const mismatchedInputDays = cloneTripPlan(validPlan);
  mismatchedInputDays.input.days = validPlan.input.days + 1;

  assert.equal(TripPlanSchema.safeParse(mismatchedInputDays).success, false);

  const mismatchedItineraryLength = cloneTripPlan(validPlan);
  mismatchedItineraryLength.dailyItinerary = mismatchedItineraryLength.dailyItinerary.slice(1);

  assert.equal(TripPlanSchema.safeParse(mismatchedItineraryLength).success, false);
});

test("TripPlanSchema requires all five user verification categories", async () => {
  const validPlan = await buildValidTripPlan();
  const requiredCategories = [
    "ticketReservation",
    "openingHours",
    "hotelPrice",
    "transportSchedulePrice",
    "weather",
  ];

  assert.deepEqual(
    requiredCategories.every((category) =>
      validPlan.userVerifyItems.some((item) => item.category === category),
    ),
    true,
  );

  for (const category of requiredCategories) {
    const invalidPlan = cloneTripPlan(validPlan);
    invalidPlan.userVerifyItems = invalidPlan.userVerifyItems.filter(
      (item) => item.category !== category,
    );

    assert.equal(TripPlanSchema.safeParse(invalidPlan).success, false);
  }
});

test("parseAiJson parses plain JSON and fenced json code blocks", () => {
  assert.deepEqual(parseAiJson('{"ok":true,"items":[1,2]}'), {
    ok: true,
    items: [1, 2],
  });

  assert.deepEqual(
    parseAiJson('```json\n{"ok":true,"name":"TraceMe"}\n```'),
    {
      ok: true,
      name: "TraceMe",
    },
  );
});

test("formatTripPlanMarkdown includes key sections and omits undefined/null literals", async () => {
  const plan = await buildValidTripPlan();
  const markdown = formatTripPlanMarkdown(plan);

  for (const expectedText of ["基本信息", "每日行程", "用户自行确认事项", "免责声明"]) {
    assert.match(markdown, new RegExp(expectedText));
  }

  assert.doesNotMatch(markdown, /\bundefined\b|\bnull\b/);
});

test("getBudgetSummary keeps total and per-person budget semantics", () => {
  assert.deepEqual(
    getBudgetSummary({ amount: 9000, currency: "CNY", scope: "total" }, 3),
    {
      submittedAmount: 9000,
      submittedLabel: "总预算",
      totalAmount: 9000,
      perPersonAmount: 3000,
    },
  );

  assert.deepEqual(
    getBudgetSummary({ amount: 3000, currency: "CNY", scope: "perPerson" }, 3),
    {
      submittedAmount: 3000,
      submittedLabel: "人均预算",
      totalAmount: 9000,
      perPersonAmount: 3000,
    },
  );
});

test("TravelPlanComparisonSchema accepts valid mock comparison output", async () => {
  const plan = await buildValidTripPlan();
  const raw = await generateMockTravelPlanComparisonJson(plan);
  const comparison = TravelPlanComparisonSchema.parse(JSON.parse(raw));

  assert.equal(comparison.basePlanId, plan.id);
  assert.equal(comparison.source.provider, "mock");
  assert.equal(comparison.source.kind, "mock");
  assert.equal(comparison.variants.length, 3);

  for (const variant of comparison.variants) {
    assert.ok(variant.dailySummary.length >= plan.dailyItinerary.length);
    assert.ok(variant.dailySummary.every((summary) => summary.summary.trim().length > 0));
    assert.ok(variant.scores.budgetFriendliness >= 1 && variant.scores.budgetFriendliness <= 5);
    assert.ok(variant.scores.paceRelaxation >= 1 && variant.scores.paceRelaxation <= 5);
    assert.ok(variant.scores.attractionDensity >= 1 && variant.scores.attractionDensity <= 5);
  }
});

test("generateTravelPlanComparison returns stable mock variants and optimization", async () => {
  const previousProvider = process.env.AI_PROVIDER;
  const plan = await buildValidTripPlan();

  process.env.AI_PROVIDER = "mock";

  try {
    const comparison = await generateTravelPlanComparison(plan);

    assert.equal(comparison.generatedAt, "1970-01-01T00:00:00.000Z");
    assert.deepEqual(
      comparison.variants.map((variant) => variant.name),
      ["轻松舒适", "预算友好", "景点丰富"],
    );
    assert.ok(comparison.optimization.paceTightness.length > 0);
    assert.ok(comparison.optimization.manualConfirmations.length >= 1);
  } finally {
    if (previousProvider === undefined) {
      delete process.env.AI_PROVIDER;
    } else {
      process.env.AI_PROVIDER = previousProvider;
    }
  }
});

test("compare API rejects invalid request bodies with BAD_REQUEST", async () => {
  const response = await compareTravelPlansPost(
    new Request("http://localhost/api/travel-plans/compare", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ tripPlan: { id: "invalid" } }),
    }),
  );
  const json = await response.json() as {
    ok: false;
    error: {
      code: string;
      requestId: string;
    };
  };

  assert.equal(response.status, 400);
  assert.equal(json.ok, false);
  assert.equal(json.error.code, "BAD_REQUEST");
  assert.ok(json.error.requestId);
});
