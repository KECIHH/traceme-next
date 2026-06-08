import type { TripPlanPrompt } from "@/lib/ai/ai-provider";
import type { TripPlan } from "@/lib/schemas/trip";

const COMPARISON_JSON_SHAPE = `{
  "variants": [{
    "name": string,
    "style": string,
    "suitableFor": string,
    "advantages": string[],
    "tradeOffs": string[],
    "scores": {
      "budgetFriendliness": number,
      "paceRelaxation": number,
      "attractionDensity": number
    },
    "dailySummary": [{ "day": number, "date": "YYYY-MM-DD", "title": string, "summary": string }]
  }],
  "optimization": {
    "paceTightness": string,
    "budgetRisks": string[],
    "scheduleConflicts": string[],
    "replacementIdeas": string[],
    "manualConfirmations": string[]
  },
  "disclaimer": string
}`;

function buildCompactPlanForPrompt(tripPlan: TripPlan) {
  return {
    id: tripPlan.id,
    source: tripPlan.source,
    input: tripPlan.input,
    overview: tripPlan.overview,
    dailyItinerary: tripPlan.dailyItinerary.map((day) => ({
      day: day.day,
      date: day.date,
      title: day.title,
      summary: day.summary,
      items: day.items.map((item) => ({
        timeOfDay: item.timeOfDay,
        title: item.title,
        description: item.description,
        location: item.location,
        needVerify: item.needVerify,
        variableInfoTypes: item.variableInfoTypes,
      })),
    })),
    budgetBreakdown: tripPlan.budgetBreakdown.map((item) => ({
      category: item.category,
      amount: item.amount,
      currency: item.currency,
      description: item.description,
    })),
    riskReminders: tripPlan.riskReminders.map((item) => ({
      title: item.title,
      description: item.description,
      needVerify: item.needVerify,
    })),
    userVerifyItems: tripPlan.userVerifyItems,
  };
}

export function buildTravelPlanComparisonPrompt(tripPlan: TripPlan): TripPlanPrompt {
  const compactPlan = buildCompactPlanForPrompt(tripPlan);

  return {
    systemPrompt: [
      "You are a travel plan comparison assistant.",
      "Generate lightweight alternatives and optimization notes only from the provided TripPlan draft.",
      "Do not browse, search, call maps, call weather, call ticketing, call hotel, or claim real-time data.",
      "Do not describe any output as accurate, official, guaranteed, live, or verified.",
      "All prices, transport timing, opening hours, tickets, reservations, weather, queues, and hotel availability must be described as planning references that require manual confirmation.",
      "Return one complete valid minified JSON object only. Do not return Markdown, code fences, comments, undefined, NaN, or prose outside JSON.",
      "The server will overwrite source, generatedAt, and basePlanId. You may omit them.",
    ].join("\n"),
    userPrompt: [
      "Create 2 or 3 comparable trip variants and one optimization section for the current TripPlan draft.",
      "",
      `Current TripPlan JSON: ${JSON.stringify(compactPlan)}`,
      "",
      "Required JSON shape:",
      COMPARISON_JSON_SHAPE,
      "",
      "Rules:",
      "1. variants must contain 2 or 3 items.",
      "2. Prefer three distinct variants named like relaxed comfort, budget friendly, and attraction rich, translated naturally for the user.",
      "3. Each score must be an integer from 1 to 5.",
      "4. dailySummary must summarize the same trip days as the current plan; do not create a full TripPlan copy.",
      "5. optimization.paceTightness must judge whether the current plan is too tight.",
      "6. budgetRisks, scheduleConflicts, replacementIdeas, and manualConfirmations must each contain at least one concise item.",
      "7. disclaimer must clearly say the comparison is a planning reference and requires manual confirmation for variable travel information.",
      "8. Keep all strings concise.",
    ].join("\n"),
  };
}
