import type {
  AIProvider,
  GenerateTravelPlanComparisonRawTextInput,
  GenerateTripPlanRawTextInput,
} from "@/lib/ai/ai-provider";
import type {
  AccommodationSuggestion,
  Attraction,
  BudgetBreakdownItem,
  DailyItinerary,
  FoodSuggestion,
  GenerateTripPlanRequest,
  PackingChecklistItem,
  RiskReminder,
  Transportation,
  TravelPlanComparison,
  TravelPlanVariant,
  TripPlan,
  UserVerifyItem,
} from "@/lib/schemas/trip";
import { getBudgetSummary } from "@/lib/utils/budget";
import { addDaysToIsoDate, calculateTripDays } from "@/lib/utils/date";

const paceLabels: Record<GenerateTripPlanRequest["pace"], string> = {
  relaxed: "舒缓",
  balanced: "适中",
  intensive: "紧凑",
};

const dayThemes = [
  "抵达与市区适应",
  "代表性景点与本地餐饮",
  "文化街区与轻松散步",
  "自然/近郊机动安排",
  "返程前弹性收尾",
];

function getDayTheme(dayIndex: number, totalDays: number) {
  if (dayIndex === 0) {
    return dayThemes[0];
  }

  if (dayIndex === totalDays - 1) {
    return dayThemes[4];
  }

  return dayThemes[dayIndex % (dayThemes.length - 1)];
}

function buildDailyItinerary(request: GenerateTripPlanRequest, days: number): DailyItinerary[] {
  return Array.from({ length: days }, (_, index) => {
    const date = addDaysToIsoDate(request.startDate, index);
    const dayNumber = index + 1;
    const theme = getDayTheme(index, days);

    if (date === null) {
      throw new Error("Unable to build mock itinerary date.");
    }

    if (index === 0) {
      return {
        day: dayNumber,
        date,
        title: `第 ${dayNumber} 天：${request.destination}${theme}`,
        summary: `抵达${request.destination}后先安顿住宿，再用轻量活动熟悉周边。`,
        items: [
          {
            timeOfDay: "morning",
            title: `${request.departureCity}出发前往${request.destination}`,
            description: "根据预算、时间和体力选择合适的交通方式，抵达后预留取行李和进城缓冲。",
            location: `${request.departureCity}至${request.destination}`,
            needVerify: true,
            verifyNote: "航班、高铁、车次、票价和实际交通耗时会变化，出发前请自行确认。",
            variableInfoTypes: ["transportDuration", "transportPrice"],
          },
          {
            timeOfDay: "afternoon",
            title: `${request.destination}核心城区入住`,
            description: "优先选择交通方便、餐饮选择较多的住宿区域，减少后续通勤成本。",
            location: `${request.destination}核心城区`,
            needVerify: true,
            verifyNote: "酒店价格、房态、位置、取消政策和入住规则会变化，预订前请自行确认。",
            variableInfoTypes: ["reservation"],
          },
          {
            timeOfDay: "evening",
            title: `${request.destination}本地风味晚餐`,
            description: "第一晚以轻松晚餐和短距离散步为主，按当天抵达时间调整强度。",
            location: `${request.destination}住宿周边`,
            needVerify: true,
            verifyNote: "餐厅营业时间、价格、排队和预约状态会变化，请提前或现场确认。",
            variableInfoTypes: ["openingHours", "reservation"],
          },
        ],
      };
    }

    if (index === days - 1) {
      return {
        day: dayNumber,
        date,
        title: `第 ${dayNumber} 天：${request.destination}${theme}`,
        summary: "返程日只安排低强度内容，优先照顾交通衔接和行李处理。",
        items: [
          {
            timeOfDay: "morning",
            title: "住宿周边早餐与退房",
            description: "根据返程时间安排早餐、整理行李和退房，避免远距离移动。",
            location: `${request.destination}住宿周边`,
            needVerify: true,
            verifyNote: "酒店退房时间、行李寄存政策和早餐供应时间会变化，请提前确认。",
            variableInfoTypes: ["openingHours"],
          },
          {
            timeOfDay: "afternoon",
            title: `从${request.destination}返程`,
            description: "预留进站、安检、换乘和市内交通缓冲，避免返程日安排过满。",
            location: `${request.destination}至${request.departureCity}`,
            needVerify: true,
            verifyNote: "返程班次、票价、市内交通耗时和排队情况会变化，请自行确认。",
            variableInfoTypes: ["transportDuration", "transportPrice"],
          },
          {
            timeOfDay: "evening",
            title: `抵达${request.departureCity}`,
            description: "完成返程，可整理照片、账单和下一次旅行的调整想法。",
            location: request.departureCity,
            needVerify: false,
            variableInfoTypes: [],
          },
        ],
      };
    }

    return {
      day: dayNumber,
      date,
      title: `第 ${dayNumber} 天：${request.destination}${theme}`,
      summary: `围绕${request.destination}的${theme}展开，保留餐饮和休息弹性。`,
      items: [
        {
          timeOfDay: "morning",
          title: `${request.destination}代表性景点参观`,
          description: "选择一处最符合偏好的代表性景点或文化空间，上午出发更利于控制节奏。",
          location: `${request.destination}代表性景点`,
          needVerify: true,
          verifyNote: "门票、预约规则、开放时间、临时闭园或限流信息会变化，请确认官方信息。",
          variableInfoTypes: ["ticket", "openingHours", "reservation"],
        },
        {
          timeOfDay: "afternoon",
          title: `${request.destination}街区散步与休息`,
          description: "安排街区漫步、咖啡茶饮或轻量参观，按天气和体力调整停留时间。",
          location: `${request.destination}特色街区`,
          needVerify: true,
          verifyNote: "营业时间、天气、排队和现场活动会变化，建议当天再确认。",
          variableInfoTypes: ["openingHours", "weather"],
        },
        {
          timeOfDay: "evening",
          title: `${request.destination}晚餐与自由活动`,
          description: "根据口味选择当地餐饮，晚间保留自由活动和临时调整空间。",
          location: `${request.destination}餐饮区域`,
          needVerify: true,
          verifyNote: "餐饮价格、预约、排队和营业状态会变化，请以实际信息为准。",
          variableInfoTypes: ["openingHours", "reservation"],
        },
      ],
    };
  });
}

function buildAttractions(destination: string): Attraction[] {
  return [
    {
      name: `${destination}代表性景点`,
      reason: `适合作为初次了解${destination}的主线体验，可按个人偏好选择城市地标、历史文化空间或自然景观。`,
      suggestedDuration: "半天左右",
      ticketInfo: "门票和预约方式仅作提醒，不作为确定事实。",
      openingHours: "开放时间需以官方最新公告为准。",
      needVerify: true,
      verifyNote: "请确认门票、预约规则、开放时间、临时闭园或限流信息。",
    },
    {
      name: `${destination}特色街区`,
      reason: "适合安排散步、拍照、餐饮和轻量购物，能给行程保留更多弹性。",
      suggestedDuration: "2 到 3 小时",
      openingHours: "商户和街区活动时间可能调整。",
      needVerify: true,
      verifyNote: "请确认营业时间、现场活动、排队情况和天气影响。",
    },
    {
      name: `${destination}文化体验点`,
      reason: "适合补充博物馆、展览、非遗体验或本地生活观察，让行程不只停留在打卡。",
      suggestedDuration: "2 到 3 小时",
      ticketInfo: "票务和预约规则可能变化。",
      openingHours: "开放时间和闭馆日需自行确认。",
      needVerify: true,
      verifyNote: "请确认预约要求、开放时间、闭馆日和临时活动安排。",
    },
  ];
}

function buildFoodSuggestions(destination: string): FoodSuggestion[] {
  return [
    {
      areaOrRestaurant: `${destination}本地风味餐饮区`,
      cuisine: "本地菜 / 小吃",
      reason: "适合集中体验当地口味，安排弹性较高。",
      priceLevel: "midRange",
      needVerify: true,
      verifyNote: "具体商户价格、营业时间、排队情况和预约状态会变化，请以现场或平台信息为准。",
    },
    {
      areaOrRestaurant: `${destination}夜间餐饮街区`,
      cuisine: "晚餐 / 夜宵",
      reason: "适合作为晚间自由活动的一部分，便于根据当天体力调整。",
      priceLevel: "midRange",
      needVerify: true,
      verifyNote: "商户营业状态、价格和食品安全评价会变化，不建议视为确定事实。",
    },
    {
      areaOrRestaurant: `${destination}舒适正餐选择`,
      cuisine: "正餐 / 特色餐厅",
      reason: "适合安排一次更完整的本地餐饮体验，也便于照顾同行人口味。",
      priceLevel: "premium",
      needVerify: true,
      verifyNote: "价格、排队、预约和菜单供应会变化，建议提前确认。",
    },
  ];
}

function buildAccommodationSuggestions(destination: string): AccommodationSuggestion[] {
  return [
    {
      area: `${destination}核心城区`,
      reason: "交通、餐饮和夜间步行选择通常更集中，适合希望减少换乘成本的旅客。",
      priceLevel: "premium",
      needVerify: true,
      verifyNote: "酒店价格、房态、取消政策、实际位置和周边环境会变化，请预订前确认。",
    },
    {
      area: `${destination}交通枢纽周边`,
      reason: "更方便衔接抵达和返程，也适合行程较短或重视交通效率的安排。",
      priceLevel: "midRange",
      needVerify: true,
      verifyNote: "酒店价格、房态、噪音、施工和通勤时间需自行确认。",
    },
  ];
}

function buildTransportation(request: GenerateTripPlanRequest): Transportation[] {
  return [
    {
      route: `${request.departureCity}至${request.destination}`,
      method: "飞机、高铁、火车或长途交通",
      description: "根据预算、时间和出行偏好选择往返方式。",
      estimatedDuration: "耗时随交通方式和班次变化",
      estimatedPrice: "价格随班次、购票时间和舱位变化",
      needVerify: true,
      verifyNote: "请确认最新班次、票价、退改签规则和实际耗时。",
    },
    {
      route: `${request.destination}市内日常移动`,
      method: "公共交通、出租车或网约车",
      description: "市内移动优先选择稳定路线，疲劳或晚间可改用出租车或网约车。",
      estimatedDuration: "实际耗时受拥堵、换乘和天气影响",
      estimatedPrice: "打车、网约车和公共交通费用会变化",
      needVerify: true,
      verifyNote: "请按当天交通、天气、运营时间和平台价格确认。",
    },
    {
      route: "住宿至主要景点",
      method: "公共交通接驳或打车",
      description: "具体路线按住宿位置、景点分布和当天体力调整。",
      estimatedDuration: "耗时需按实际住址和当天交通确认",
      estimatedPrice: "价格会随交通方式变化",
      needVerify: true,
      verifyNote: "请确认当天路线、运营时间、打车价格和拥堵情况。",
    },
  ];
}

function buildBudgetBreakdown(request: GenerateTripPlanRequest): BudgetBreakdownItem[] {
  const budgetSummary = getBudgetSummary(request.budget, request.travelers);
  const totalAmount = budgetSummary.totalAmount;
  const categories: Array<[BudgetBreakdownItem["category"], number, string]> = [
    ["transportation", 0.36, "往返与市内交通预算估算，仅供规划参考。"],
    ["accommodation", 0.32, "住宿预算估算，按交通便利区域预留。"],
    ["food", 0.17, "餐饮预算估算，包含本地风味和舒适正餐。"],
    ["attractions", 0.08, "景点门票、预约和体验项目预算估算。"],
    ["other", 0.07, "机动预算，用于临时购物、寄存、饮品或其他调整。"],
  ];

  return categories.map(([category, ratio, description]) => ({
    category,
    amount: Math.max(1, Math.round(totalAmount * ratio)),
    currency: request.budget.currency,
    description,
    needVerify: true,
    verifyNote: "预算、价格和实际消费会随预订时间、现场选择与优惠政策变化，请自行确认。",
  }));
}

function buildPackingChecklist(): PackingChecklistItem[] {
  return [
    {
      category: "documents",
      items: ["身份证件", "交通订单信息", "酒店预订信息", "景点预约凭证"],
    },
    {
      category: "clothing",
      items: ["舒适步行鞋", "按天气准备的换洗衣物", "薄外套", "雨具"],
    },
    {
      category: "electronics",
      items: ["手机充电器", "充电宝", "耳机", "常用 App 离线信息"],
    },
    {
      category: "health",
      items: ["常用药", "防晒用品", "肠胃药", "口罩或湿巾"],
    },
  ];
}

function buildRiskReminders(destination: string): RiskReminder[] {
  return [
    {
      title: "天气变化",
      description: `${destination}出行期间可能遇到降雨、高温或其他天气变化，户外安排需要根据当天情况调整。`,
      needVerify: true,
      verifyNote: "请在出发前和每日出门前确认实时天气与预警。",
    },
    {
      title: "餐饮与体力适应",
      description: "建议根据同行人口味、体力和作息安排餐饮与休息，不把每天排得过满。",
      needVerify: false,
    },
    {
      title: "热门项目预约与限流",
      description: "热门景点、展览或体验项目可能存在预约、限流或临时调整。",
      needVerify: true,
      verifyNote: "请提前确认官方预约、门票、开放时间和入场规则。",
    },
  ];
}

function buildUserVerifyItems(): UserVerifyItem[] {
  return [
    {
      category: "ticketReservation",
      item: "门票与预约",
      reason: "热门景点或体验项目可能需要预约，门票价格和入场规则会变化。",
      suggestedAction: "出发前查看官方或可信渠道，确认门票、预约、证件和优惠政策。",
    },
    {
      category: "openingHours",
      item: "营业时间与闭馆日",
      reason: "景点、展馆、餐厅和活动时间可能随季节或临时安排调整。",
      suggestedAction: "每天出门前确认当日开放时间、闭馆日和临时公告。",
    },
    {
      category: "hotelPrice",
      item: "酒店价格与房态",
      reason: "住宿价格、房态、取消政策和入住规则会随日期变化。",
      suggestedAction: "预订前核对最终价格、税费、房型、取消政策和行李寄存规则。",
    },
    {
      category: "transportSchedulePrice",
      item: "交通班次、耗时与价格",
      reason: "航班、高铁、火车、市内交通、拥堵和价格均可能变化。",
      suggestedAction: "确认往返班次、票价、退改签规则，并给市内换乘预留缓冲。",
    },
    {
      category: "weather",
      item: "天气与极端天气风险",
      reason: "天气会直接影响户外景点、步行距离和交通安排。",
      suggestedAction: "出发前和每日出门前查看实时天气、降雨、高温或其他预警。",
    },
  ];
}

export async function generateMockTripPlanJson(request: GenerateTripPlanRequest): Promise<string> {
  const days = calculateTripDays(request.startDate, request.endDate);

  if (days === null) {
    throw new Error("Cannot generate mock trip plan for an invalid date range.");
  }

  const paceLabel = paceLabels[request.pace] ?? request.pace;
  const plan: TripPlan = {
    id: `mock-${Date.now()}`,
    generatedAt: new Date().toISOString(),
    generationMode: request.generationMode,
    source: {
      provider: "mock",
      kind: "mock",
    },
    input: {
      ...request,
      days,
    },
    overview: `这是一份从${request.departureCity}出发前往${request.destination}的 ${days} 天 mock 旅行计划草稿，节奏为${paceLabel}。当前内容用于打通后端生成、JSON 解析和 schema 校验流程，不包含实时票价、实时酒店价格、实时天气或实时交通数据。`,
    dailyItinerary: buildDailyItinerary(request, days),
    attractions: buildAttractions(request.destination),
    foodSuggestions: buildFoodSuggestions(request.destination),
    accommodationSuggestions: buildAccommodationSuggestions(request.destination),
    transportation: buildTransportation(request),
    budgetBreakdown: buildBudgetBreakdown(request),
    packingChecklist: buildPackingChecklist(),
    riskReminders: buildRiskReminders(request.destination),
    userVerifyItems: buildUserVerifyItems(),
    disclaimer:
      "本旅行计划由 mock 生成，仅供行程规划参考，不构成票务、酒店、交通、天气或安全承诺。出发前请自行确认门票/预约、营业时间、酒店价格和房态、交通班次/价格、天气预警及其他实时信息，并根据个人健康、预算和现场情况调整安排。",
  };

  return JSON.stringify(plan);
}

function buildVariantDailySummary(
  tripPlan: TripPlan,
  variantName: string,
  focus: string,
): TravelPlanVariant["dailySummary"] {
  return tripPlan.dailyItinerary.map((day) => ({
    day: day.day,
    date: day.date,
    title: `${variantName} - Day ${day.day}`,
    summary: `${focus}${day.title ? `: ${day.title}` : ""}. ${day.summary}`,
  }));
}

export async function generateMockTravelPlanComparisonJson(
  tripPlan: TripPlan,
): Promise<string> {
  const { destination, budget, pace } = tripPlan.input;
  const baseConfirmations = [
    "出发前人工确认交通班次、票价、退改规则和实际耗时。",
    "出发前人工确认住宿价格、房态、取消政策和入住规则。",
    "每日出门前人工确认天气、开放时间、预约规则和现场排队情况。",
  ];
  const variants: TravelPlanComparison["variants"] = [
    {
      name: "轻松舒适",
      style: `以${destination}的低压力体验为主，减少连续赶场，保留午后休息和临时调整空间。`,
      suitableFor: "适合亲子、长辈同行、首次到访或希望慢慢体验的人群。",
      advantages: [
        "每天重点更集中，体力消耗较低。",
        "更容易根据天气、排队和同伴状态调整。",
        "晚间安排更轻，适合保留休息时间。",
      ],
      tradeOffs: [
        "可覆盖的景点数量会少一些。",
        "部分小众体验需要舍弃或作为备选。",
      ],
      scores: {
        budgetFriendliness: budget.scope === "perPerson" ? 3 : 4,
        paceRelaxation: 5,
        attractionDensity: 2,
      },
      dailySummary: buildVariantDailySummary(tripPlan, "轻松舒适", "降低每日密度，优先保留核心体验"),
    },
    {
      name: "预算友好",
      style: `围绕${destination}的公共交通、集中住宿区域和可替换餐饮安排控制预算风险。`,
      suitableFor: "适合预算敏感、愿意用时间换成本、希望保留机动预算的旅行者。",
      advantages: [
        "优先控制交通、住宿和餐饮三类大头支出。",
        "适合把高价体验改为半日或备选项目。",
        "更容易预留临时支出缓冲。",
      ],
      tradeOffs: [
        "可能增加换乘或步行时间。",
        "住宿位置和餐饮体验可能需要做取舍。",
      ],
      scores: {
        budgetFriendliness: 5,
        paceRelaxation: pace === "intensive" ? 2 : 3,
        attractionDensity: 3,
      },
      dailySummary: buildVariantDailySummary(tripPlan, "预算友好", "优先选择成本更可控的同类安排"),
    },
    {
      name: "景点丰富",
      style: `提升${destination}核心景点和街区体验的覆盖率，把自由活动压缩为短时缓冲。`,
      suitableFor: "适合体力较好、希望多看多走、对行程密度接受度高的旅行者。",
      advantages: [
        "同一趟旅行可覆盖更多代表性体验。",
        "更适合首次打卡多个核心目的地。",
        "每日主题更明确，信息密度更高。",
      ],
      tradeOffs: [
        "节奏更紧，临时变化会更容易影响后续安排。",
        "预算和体力消耗风险都会上升。",
      ],
      scores: {
        budgetFriendliness: 2,
        paceRelaxation: 2,
        attractionDensity: 5,
      },
      dailySummary: buildVariantDailySummary(tripPlan, "景点丰富", "增加同日核心点位覆盖，但保留人工确认节点"),
    },
  ];
  const comparison: TravelPlanComparison = {
    source: {
      provider: "mock",
      kind: "mock",
    },
    generatedAt: "1970-01-01T00:00:00.000Z",
    basePlanId: tripPlan.id,
    variants,
    optimization: {
      paceTightness:
        pace === "intensive"
          ? "当前节奏偏紧，建议至少为每日午后或晚间保留一个可取消的缓冲段。"
          : "当前节奏整体可控，建议继续保留到达日、返程日和高强度体验后的休息空间。",
      budgetRisks: [
        "预算拆分只适合作为规划参考，交通、住宿、餐饮和门票价格都需要出发前人工确认。",
        budget.scope === "perPerson"
          ? "用户填写的是人均预算，实际总预算需要按同行人数再次核对。"
          : "用户填写的是总预算，若同行人数或住宿房型变化，需要重新估算人均成本。",
      ],
      scheduleConflicts: [
        "同一天若同时安排热门景点、长距离移动和正式晚餐，容易受到排队、预约和交通耗时影响。",
        "到达日和返程日不宜安排不可取消的高强度项目。",
      ],
      replacementIdeas: [
        "把远距离景点替换为住宿周边街区、展馆或短时体验，可降低交通和体力成本。",
        "把高价餐饮或体验项目设为备选，将预算留给更确定的交通和住宿。",
      ],
      manualConfirmations: baseConfirmations,
    },
    disclaimer:
      "对比方案和优化建议仅基于当前旅行计划草稿生成，不包含实时、准确或官方数据；票务、住宿、交通、天气、开放时间和预约状态均需用户出发前自行确认。",
  };

  return JSON.stringify(comparison);
}

export const mockAIProvider: AIProvider = {
  name: "mock",
  generateTripPlanRawText({ request }: GenerateTripPlanRawTextInput) {
    return generateMockTripPlanJson(request);
  },
  generateTravelPlanComparisonRawText({
    tripPlan,
  }: GenerateTravelPlanComparisonRawTextInput) {
    return generateMockTravelPlanComparisonJson(tripPlan);
  },
};
