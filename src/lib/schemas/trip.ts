import { z } from "zod";

import { calculateTripDays, isIsoDateOnly } from "@/lib/utils/date";

const REQUIRE_VERIFY_MESSAGE = "This field contains variable travel information and must set needVerify to true.";
const VARIABLE_INFO_TEXT_PATTERN =
  /门票|票价|购票|预约|入园|限流|闭园|营业时间|开放时间|营业状态|开放状态|闭馆|酒店价格|住宿价格|房态|房价|入住政策|退房时间|行李寄存|交通班次|班次|航班|高铁|车次|退改签|交通耗时|实际耗时|运营时间|打车|网约车|拥堵|实时|天气|降雨|高温|预警|价格|预算|估算|排队/i;
const VARIABLE_INFO_CATEGORY_PATTERNS = [
  {
    category: "ticketReservation",
    pattern: /门票|票价|购票|预约|入园|限流|闭园|票务/i,
  },
  {
    category: "openingHours",
    pattern: /营业时间|开放时间|营业状态|开放状态|闭馆|闭园|运营时间/i,
  },
  {
    category: "hotelPrice",
    pattern: /酒店价格|住宿价格|房态|房价|房型|入住政策|退房时间|行李寄存|取消政策/i,
  },
  {
    category: "transportSchedulePrice",
    pattern: /交通班次|班次|航班|高铁|车次|退改签|交通耗时|实际耗时|耗时|打车|网约车|拥堵|交通价格|市内交通/i,
  },
  {
    category: "weather",
    pattern: /天气|实时天气|降雨|高温|极端天气|天气预警|预警/i,
  },
] as const;

const IsoDateSchema = z
  .string()
  .trim()
  .refine(isIsoDateOnly, "Expected a valid YYYY-MM-DD date.");

const NonEmptyStringSchema = z.string().trim().min(1);

function hasVariableInfoText(...values: Array<string | undefined>) {
  return values.some((value) => value !== undefined && VARIABLE_INFO_TEXT_PATTERN.test(value));
}

function getVariableInfoCategories(...values: Array<string | undefined>) {
  const text = values.filter((value): value is string => value !== undefined).join(" ");
  const categories = new Set<(typeof VARIABLE_INFO_CATEGORY_PATTERNS)[number]["category"]>();

  for (const { category, pattern } of VARIABLE_INFO_CATEGORY_PATTERNS) {
    if (pattern.test(text)) {
      categories.add(category);
    }
  }

  return categories;
}

function requireNeedVerifyForVariableInfoText(
  needVerify: boolean,
  context: z.RefinementCtx,
  values: Array<string | undefined>,
) {
  if (hasVariableInfoText(...values) && !needVerify) {
    context.addIssue({
      code: "custom",
      message: REQUIRE_VERIFY_MESSAGE,
      path: ["needVerify"],
    });
  }
}

export const GenerationModeSchema = z.literal("quick");
export const PaceSchema = z.enum(["relaxed", "balanced", "intensive"]);
export const CurrencySchema = z.literal("CNY");
export const BudgetScopeSchema = z.enum(["total", "perPerson"]);
export const TripPlanSourceSchema = z.object({
  provider: z.enum(["mock", "openai-compatible"]),
  kind: z.enum(["mock", "ai"]),
});

export const BudgetSchema = z.object({
  amount: z.number().positive().max(1_000_000),
  currency: CurrencySchema,
  scope: BudgetScopeSchema.default("total"),
});

export const GenerateTripPlanRequestSchema = z
  .object({
    departureCity: z.string().trim().min(1).max(50),
    destination: z.string().trim().min(1).max(80),
    startDate: IsoDateSchema,
    endDate: IsoDateSchema,
    travelers: z.number().int().min(1).max(20),
    budget: BudgetSchema,
    preferences: z.array(z.string().trim().min(1).max(30)).min(1).max(12),
    customPreference: z.string().trim().max(500).default(""),
    pace: PaceSchema,
    generationMode: GenerationModeSchema,
  })
  .superRefine((value, context) => {
    const days = calculateTripDays(value.startDate, value.endDate);

    if (days === null) {
      context.addIssue({
        code: "custom",
        message: "endDate cannot be earlier than startDate.",
        path: ["endDate"],
      });

      return;
    }

    if (days > 60) {
      context.addIssue({
        code: "custom",
        message: "Trip length cannot exceed 60 days.",
        path: ["endDate"],
      });
    }
  });

export const TripPlanInputSchema = GenerateTripPlanRequestSchema.safeExtend({
  days: z.number().int().min(1).max(60),
});

const VerifyNoteSchema = z.string().trim().min(1).max(300);

const NeedVerifySchema = z.object({
  needVerify: z.boolean(),
  verifyNote: VerifyNoteSchema.optional(),
});

const ItineraryItemSchema = NeedVerifySchema.extend({
  timeOfDay: z.enum(["morning", "afternoon", "evening", "fullDay"]),
  title: NonEmptyStringSchema.max(80),
  description: NonEmptyStringSchema.max(500),
  location: z.string().trim().min(1).max(120).optional(),
  variableInfoTypes: z
    .array(z.enum(["ticket", "openingHours", "transportDuration", "transportPrice", "reservation", "weather"]))
    .default([]),
}).superRefine((value, context) => {
  if (value.variableInfoTypes.length > 0 && !value.needVerify) {
    context.addIssue({
      code: "custom",
      message: REQUIRE_VERIFY_MESSAGE,
      path: ["needVerify"],
    });
  }

  requireNeedVerifyForVariableInfoText(value.needVerify, context, [
    value.title,
    value.description,
    value.location,
    value.verifyNote,
  ]);
});

const DailyItinerarySchema = z.object({
  day: z.number().int().min(1),
  date: IsoDateSchema,
  title: NonEmptyStringSchema.max(80),
  summary: NonEmptyStringSchema.max(500),
  items: z.array(ItineraryItemSchema).min(1),
});

const AttractionSchema = NeedVerifySchema.extend({
  name: NonEmptyStringSchema.max(80),
  reason: NonEmptyStringSchema.max(500),
  suggestedDuration: NonEmptyStringSchema.max(80),
  ticketInfo: z.string().trim().min(1).max(200).optional(),
  openingHours: z.string().trim().min(1).max(200).optional(),
}).superRefine((value, context) => {
  if ((value.ticketInfo || value.openingHours) && !value.needVerify) {
    context.addIssue({
      code: "custom",
      message: REQUIRE_VERIFY_MESSAGE,
      path: ["needVerify"],
    });
  }

  requireNeedVerifyForVariableInfoText(value.needVerify, context, [
    value.name,
    value.reason,
    value.suggestedDuration,
    value.ticketInfo,
    value.openingHours,
    value.verifyNote,
  ]);
});

const FoodSuggestionSchema = NeedVerifySchema.extend({
  areaOrRestaurant: NonEmptyStringSchema.max(100),
  cuisine: NonEmptyStringSchema.max(60),
  reason: NonEmptyStringSchema.max(500),
  priceLevel: z.enum(["budget", "midRange", "premium", "unknown"]),
}).superRefine((value, context) => {
  if (value.priceLevel !== "unknown" && !value.needVerify) {
    context.addIssue({
      code: "custom",
      message: REQUIRE_VERIFY_MESSAGE,
      path: ["needVerify"],
    });
  }

  requireNeedVerifyForVariableInfoText(value.needVerify, context, [
    value.areaOrRestaurant,
    value.cuisine,
    value.reason,
    value.verifyNote,
  ]);
});

const AccommodationSuggestionSchema = NeedVerifySchema.extend({
  area: NonEmptyStringSchema.max(100),
  reason: NonEmptyStringSchema.max(500),
  priceLevel: z.enum(["budget", "midRange", "premium", "unknown"]),
}).superRefine((value, context) => {
  if (value.priceLevel !== "unknown" && !value.needVerify) {
    context.addIssue({
      code: "custom",
      message: REQUIRE_VERIFY_MESSAGE,
      path: ["needVerify"],
    });
  }

  requireNeedVerifyForVariableInfoText(value.needVerify, context, [
    value.area,
    value.reason,
    value.verifyNote,
  ]);
});

const TransportationSchema = NeedVerifySchema.extend({
  route: NonEmptyStringSchema.max(120),
  method: NonEmptyStringSchema.max(60),
  description: NonEmptyStringSchema.max(500),
  estimatedDuration: z.string().trim().min(1).max(120).optional(),
  estimatedPrice: z.string().trim().min(1).max(120).optional(),
}).superRefine((value, context) => {
  if ((value.estimatedDuration || value.estimatedPrice) && !value.needVerify) {
    context.addIssue({
      code: "custom",
      message: REQUIRE_VERIFY_MESSAGE,
      path: ["needVerify"],
    });
  }

  requireNeedVerifyForVariableInfoText(value.needVerify, context, [
    value.route,
    value.method,
    value.description,
    value.estimatedDuration,
    value.estimatedPrice,
    value.verifyNote,
  ]);
});

const BudgetBreakdownItemSchema = NeedVerifySchema.extend({
  category: z.enum(["transportation", "accommodation", "food", "attractions", "shopping", "other"]),
  amount: z.number().positive(),
  currency: CurrencySchema,
  description: NonEmptyStringSchema.max(300),
}).superRefine((value, context) => {
  if (!value.needVerify) {
    context.addIssue({
      code: "custom",
      message: REQUIRE_VERIFY_MESSAGE,
      path: ["needVerify"],
    });
  }

  requireNeedVerifyForVariableInfoText(value.needVerify, context, [
    value.description,
    value.verifyNote,
  ]);
});

const PackingChecklistItemSchema = z.object({
  category: z.enum(["documents", "clothing", "electronics", "health", "other"]),
  items: z.array(NonEmptyStringSchema.max(80)).min(1),
});

const RiskReminderSchema = NeedVerifySchema.extend({
  title: NonEmptyStringSchema.max(80),
  description: NonEmptyStringSchema.max(500),
}).superRefine((value, context) => {
  requireNeedVerifyForVariableInfoText(value.needVerify, context, [
    value.title,
    value.description,
    value.verifyNote,
  ]);
});

const UserVerifyItemSchema = z.object({
  category: z.enum(["ticketReservation", "openingHours", "hotelPrice", "transportSchedulePrice", "weather", "other"]),
  item: NonEmptyStringSchema.max(120),
  reason: NonEmptyStringSchema.max(300),
  suggestedAction: NonEmptyStringSchema.max(300),
});

export const TripPlanSchema = z
  .object({
    id: NonEmptyStringSchema.max(80),
    generatedAt: z.iso.datetime(),
    generationMode: GenerationModeSchema,
    source: TripPlanSourceSchema,
    input: TripPlanInputSchema,
    overview: NonEmptyStringSchema.max(1000),
    dailyItinerary: z.array(DailyItinerarySchema).min(1),
    attractions: z.array(AttractionSchema).min(1),
    foodSuggestions: z.array(FoodSuggestionSchema).min(1),
    accommodationSuggestions: z.array(AccommodationSuggestionSchema).min(1),
    transportation: z.array(TransportationSchema).min(1),
    budgetBreakdown: z.array(BudgetBreakdownItemSchema).min(1),
    packingChecklist: z.array(PackingChecklistItemSchema).min(1),
    riskReminders: z.array(RiskReminderSchema).min(1),
    userVerifyItems: z.array(UserVerifyItemSchema).min(1),
    disclaimer: NonEmptyStringSchema.max(1000),
  })
  .superRefine((value, context) => {
    const expectedDays = calculateTripDays(value.input.startDate, value.input.endDate);

    if (expectedDays === null || value.input.days !== expectedDays) {
      context.addIssue({
        code: "custom",
        message: "input.days must match the inclusive date range.",
        path: ["input", "days"],
      });
    }

    if (value.dailyItinerary.length !== value.input.days) {
      context.addIssue({
        code: "custom",
        message: "dailyItinerary length must equal input.days.",
        path: ["dailyItinerary"],
      });
    }

    const requiredVerifyCategories = [
      "ticketReservation",
      "openingHours",
      "hotelPrice",
      "transportSchedulePrice",
      "weather",
    ] as const;
    const presentVerifyCategories = new Set(value.userVerifyItems.map((item) => item.category));

    for (const category of requiredVerifyCategories) {
      if (!presentVerifyCategories.has(category)) {
        context.addIssue({
          code: "custom",
          message: `userVerifyItems must include ${category}.`,
          path: ["userVerifyItems"],
        });
      }
    }

    const topLevelVariableCategories = getVariableInfoCategories(value.overview, value.disclaimer);

    for (const category of topLevelVariableCategories) {
      if (!presentVerifyCategories.has(category)) {
        context.addIssue({
          code: "custom",
          message: `Top-level variable travel information must be covered by userVerifyItems category ${category}.`,
          path: ["userVerifyItems"],
        });
      }
    }
  });

export type GenerationMode = z.infer<typeof GenerationModeSchema>;
export type Pace = z.infer<typeof PaceSchema>;
export type BudgetScope = z.infer<typeof BudgetScopeSchema>;
export type Budget = z.infer<typeof BudgetSchema>;
export type TripPlanSource = z.infer<typeof TripPlanSourceSchema>;
export type GenerateTripPlanRequest = z.infer<typeof GenerateTripPlanRequestSchema>;
export type TripPlanInput = z.infer<typeof TripPlanInputSchema>;
export type TripPlan = z.infer<typeof TripPlanSchema>;
export type DailyItinerary = z.infer<typeof DailyItinerarySchema>;
export type ItineraryItem = z.infer<typeof ItineraryItemSchema>;
export type Attraction = z.infer<typeof AttractionSchema>;
export type FoodSuggestion = z.infer<typeof FoodSuggestionSchema>;
export type AccommodationSuggestion = z.infer<typeof AccommodationSuggestionSchema>;
export type Transportation = z.infer<typeof TransportationSchema>;
export type BudgetBreakdownItem = z.infer<typeof BudgetBreakdownItemSchema>;
export type PackingChecklistItem = z.infer<typeof PackingChecklistItemSchema>;
export type RiskReminder = z.infer<typeof RiskReminderSchema>;
export type UserVerifyItem = z.infer<typeof UserVerifyItemSchema>;
