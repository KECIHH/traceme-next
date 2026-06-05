import { mockTripPlan } from "@/lib/mock/mock-trip-plan";
import type { DailyItinerary, GenerateTripPlanRequest, TripPlan } from "@/lib/schemas/trip";
import { addDaysToIsoDate, calculateTripDays } from "@/lib/utils/date";

function buildDailyItinerary(request: GenerateTripPlanRequest, days: number): DailyItinerary[] {
  return Array.from({ length: days }, (_, index) => {
    const template = mockTripPlan.dailyItinerary[index % mockTripPlan.dailyItinerary.length];
    const date = addDaysToIsoDate(request.startDate, index);

    if (date === null) {
      throw new Error("Unable to build mock itinerary date.");
    }

    return {
      ...template,
      day: index + 1,
      date,
      title: `第 ${index + 1} 天：${request.destination}行程参考`,
      summary: `基于 mock 模板生成的第 ${index + 1} 天安排，可按实际体力、天气和预约情况调整。`,
      items: template.items.map((item) => ({ ...item })),
    };
  });
}

export async function generateMockTripPlanJson(request: GenerateTripPlanRequest): Promise<string> {
  const days = calculateTripDays(request.startDate, request.endDate);

  if (days === null) {
    throw new Error("Cannot generate mock trip plan for an invalid date range.");
  }

  const plan: TripPlan = {
    ...mockTripPlan,
    id: `mock-${Date.now()}`,
    generatedAt: new Date().toISOString(),
    generationMode: request.generationMode,
    input: {
      ...request,
      days,
    },
    overview: `这是一份从${request.departureCity}出发前往${request.destination}的 ${days} 天 mock 旅行计划草稿，节奏为 ${request.pace}。当前内容用于打通后端生成、JSON 解析和 schema 校验流程，不包含实时票价、实时酒店价格、实时天气或实时交通数据。`,
    dailyItinerary: buildDailyItinerary(request, days),
  };

  return JSON.stringify(plan);
}
