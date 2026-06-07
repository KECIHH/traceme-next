import assert from "node:assert/strict";
import test from "node:test";

import { parseAiJson } from "@/lib/ai/parse-ai-json";
import { formatTripPlanMarkdown } from "@/lib/markdown/format-trip-plan-markdown";
import { generateMockTripPlanJson } from "@/lib/ai/mock-provider";
import {
  GenerateTripPlanRequestSchema,
  TripPlanSchema,
  type GenerateTripPlanRequest,
  type TripPlan,
} from "@/lib/schemas/trip";
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
