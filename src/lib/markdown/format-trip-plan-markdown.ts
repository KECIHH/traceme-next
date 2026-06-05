import type {
  BudgetBreakdownItem,
  FoodSuggestion,
  PackingChecklistItem,
  Pace,
  TripPlan,
  UserVerifyItem,
} from "@/lib/schemas/trip";
import { getBudgetSummary } from "@/lib/utils/budget";

const paceLabels: Record<Pace, string> = {
  relaxed: "舒缓",
  balanced: "适中",
  intensive: "紧凑",
};

const generationModeLabels: Record<TripPlan["generationMode"], string> = {
  quick: "快速生成",
};

const sourceProviderLabels: Record<TripPlan["source"]["provider"], string> = {
  mock: "本地 mock",
  "openai-compatible": "OpenAI-compatible",
};

const priceLevelLabels: Record<FoodSuggestion["priceLevel"], string> = {
  budget: "经济",
  midRange: "适中",
  premium: "偏高",
  unknown: "未估算",
};

const budgetCategoryLabels: Record<BudgetBreakdownItem["category"], string> = {
  transportation: "交通",
  accommodation: "住宿",
  food: "餐饮",
  attractions: "景点",
  shopping: "购物",
  other: "其他",
};

const packingCategoryLabels: Record<PackingChecklistItem["category"], string> = {
  documents: "证件与订单",
  clothing: "衣物",
  electronics: "电子设备",
  health: "健康用品",
  other: "其他",
};

const verifyCategoryLabels: Record<UserVerifyItem["category"], string> = {
  ticketReservation: "门票/预约",
  openingHours: "营业时间",
  hotelPrice: "酒店价格",
  transportSchedulePrice: "交通班次/价格",
  weather: "天气",
  other: "其他",
};

const timeOfDayLabels: Record<TripPlan["dailyItinerary"][number]["items"][number]["timeOfDay"], string> = {
  morning: "上午",
  afternoon: "下午",
  evening: "晚上",
  fullDay: "全天",
};

function formatCurrency(amount: number, currency: "CNY") {
  return new Intl.NumberFormat("zh-CN", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatGeneratedAt(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function getVerifyMark(needVerify: boolean) {
  return needVerify ? "（需确认）" : "";
}

function getVerifyLine(needVerify: boolean, verifyNote?: string) {
  if (!needVerify && !verifyNote) {
    return "";
  }

  return `  - 需确认：${verifyNote || "出发前请自行确认最新信息。"}`;
}

function pushSection(lines: string[], title: string) {
  lines.push("", `## ${title}`, "");
}

function pushEmpty(lines: string[], text: string) {
  lines.push(text);
}

function joinNonEmpty(values: string[], separator = "、") {
  const normalized = values.map((value) => value.trim()).filter(Boolean);

  return normalized.length > 0 ? normalized.join(separator) : "暂无";
}

export function formatTripPlanMarkdown(plan: TripPlan): string {
  const { input } = plan;
  const title = `${input.destination} ${input.days} 天旅行计划草稿`;
  const budgetSummary = getBudgetSummary(input.budget, input.travelers);
  const budgetTotal = (plan.budgetBreakdown ?? []).reduce((total, item) => total + item.amount, 0);
  const sourceLabel = sourceProviderLabels[plan.source.provider] ?? plan.source.provider;
  const sourceDescription =
    plan.source.kind === "mock"
      ? "本计划为本地 mock 生成的旅行规划参考草稿，不包含实时票价、酒店价格、天气、地图路线或预约状态。"
      : "本计划为 AI 生成的旅行规划参考草稿，不包含实时票价、酒店价格、天气、地图路线或预约状态。";
  const lines: string[] = [
    `# ${title}`,
    "",
    sourceDescription,
  ];

  pushSection(lines, "生成时间");
  lines.push(`- 生成时间：${formatGeneratedAt(plan.generatedAt)}`);
  lines.push(`- 计划 ID：${plan.id}`);
  lines.push(`- 生成来源：${sourceLabel}`);

  pushSection(lines, "基本信息");
  lines.push(`- 出发城市：${input.departureCity}`);
  lines.push(`- 目的地：${input.destination}`);
  lines.push(`- 日期：${input.startDate} 至 ${input.endDate}`);
  lines.push(`- 天数：${input.days} 天`);
  lines.push(`- 出行人数：${input.travelers} 人`);
  lines.push(`- 用户填写${budgetSummary.submittedLabel}：${formatCurrency(budgetSummary.submittedAmount, input.budget.currency)}（需按实际价格确认）`);
  lines.push(`- 总预算估算参考：${formatCurrency(budgetSummary.totalAmount, input.budget.currency)}（需按实际价格确认）`);
  lines.push(`- 人均预算估算参考：${formatCurrency(budgetSummary.perPersonAmount, input.budget.currency)}（需按实际价格确认）`);
  lines.push(`- 旅行节奏：${paceLabels[input.pace] ?? input.pace}`);
  lines.push(`- 生成模式：${generationModeLabels[plan.generationMode] ?? plan.generationMode}`);
  lines.push(`- 旅行偏好：${joinNonEmpty(input.preferences)}`);
  if (input.customPreference) {
    lines.push(`- 补充偏好：${input.customPreference}`);
  }

  pushSection(lines, "旅行总览");
  lines.push(plan.overview);

  pushSection(lines, "每日行程");
  if ((plan.dailyItinerary ?? []).length === 0) {
    pushEmpty(lines, "暂无每日行程。");
  } else {
    for (const day of plan.dailyItinerary) {
      lines.push(`### 第 ${day.day} 天 · ${day.date} · ${day.title}`, "");
      lines.push(day.summary, "");

      if ((day.items ?? []).length === 0) {
        lines.push("- 当天暂无时间段安排。");
      } else {
        for (const item of day.items) {
          lines.push(`- **${timeOfDayLabels[item.timeOfDay]}｜${item.title}**${getVerifyMark(item.needVerify)}`);
          if (item.location) {
            lines.push(`  - 地点：${item.location}`);
          }
          lines.push(`  - 安排：${item.description}`);
          const verifyLine = getVerifyLine(item.needVerify, item.verifyNote);
          if (verifyLine) {
            lines.push(verifyLine);
          }
        }
      }

      lines.push("");
    }
  }

  pushSection(lines, "景区安排");
  if ((plan.attractions ?? []).length === 0) {
    pushEmpty(lines, "暂无景区安排。");
  } else {
    for (const attraction of plan.attractions) {
      lines.push(`### ${attraction.name}${getVerifyMark(attraction.needVerify)}`, "");
      lines.push(`- 推荐理由：${attraction.reason}`);
      lines.push(`- 建议停留参考：${attraction.suggestedDuration}`);
      if (attraction.ticketInfo) {
        lines.push(`- 门票参考（需确认）：${attraction.ticketInfo}`);
      }
      if (attraction.openingHours) {
        lines.push(`- 营业时间参考（需确认）：${attraction.openingHours}`);
      }
      if (attraction.needVerify) {
        lines.push(`- 需确认：${attraction.verifyNote || "门票、预约、开放时间和现场规则需出发前自行确认。"}`);
      }
      lines.push("");
    }
  }

  pushSection(lines, "餐饮建议");
  if ((plan.foodSuggestions ?? []).length === 0) {
    pushEmpty(lines, "暂无餐饮建议。");
  } else {
    for (const suggestion of plan.foodSuggestions) {
      lines.push(`### ${suggestion.areaOrRestaurant}${getVerifyMark(suggestion.needVerify)}`, "");
      lines.push(`- 菜系/类型：${suggestion.cuisine}`);
      lines.push(`- 价格参考：${priceLevelLabels[suggestion.priceLevel]}（仅供规划参考，需按实际消费确认）`);
      lines.push(`- 推荐理由：${suggestion.reason}`);
      if (suggestion.needVerify) {
        lines.push(`- 需确认：${suggestion.verifyNote || "营业时间、排队情况、价格和预约状态需自行确认。"}`);
      }
      lines.push("");
    }
  }

  pushSection(lines, "住宿建议");
  if ((plan.accommodationSuggestions ?? []).length === 0) {
    pushEmpty(lines, "暂无住宿建议。");
  } else {
    for (const suggestion of plan.accommodationSuggestions) {
      lines.push(`### ${suggestion.area}${getVerifyMark(suggestion.needVerify)}`, "");
      lines.push(`- 价格参考：${priceLevelLabels[suggestion.priceLevel]}（仅供规划参考，需按实际房价确认）`);
      lines.push(`- 推荐理由：${suggestion.reason}`);
      if (suggestion.needVerify) {
        lines.push(`- 需确认：${suggestion.verifyNote || "酒店价格、房态、位置、取消政策和入住规则需自行确认。"}`);
      }
      lines.push("");
    }
  }

  pushSection(lines, "交通方案");
  if ((plan.transportation ?? []).length === 0) {
    pushEmpty(lines, "暂无交通方案。");
  } else {
    for (const item of plan.transportation) {
      lines.push(`### ${item.route}${getVerifyMark(item.needVerify)}`, "");
      lines.push(`- 方式：${item.method}`);
      lines.push(`- 说明：${item.description}`);
      if (item.estimatedDuration) {
        lines.push(`- 耗时参考（需确认）：${item.estimatedDuration}`);
      }
      if (item.estimatedPrice) {
        lines.push(`- 费用参考（需确认）：${item.estimatedPrice}`);
      }
      if (item.needVerify) {
        lines.push(`- 需确认：${item.verifyNote || "交通班次、实际耗时、运营时间、拥堵和费用需自行确认。"}`);
      }
      lines.push("");
    }
  }

  pushSection(lines, "预算拆分");
  lines.push(`- 用户填写${budgetSummary.submittedLabel}：${formatCurrency(budgetSummary.submittedAmount, input.budget.currency)}（需按实际成交价格确认）`);
  lines.push(`- 总预算估算参考：${formatCurrency(budgetSummary.totalAmount, input.budget.currency)}（需按实际成交价格确认）`);
  lines.push(`- 拆分合计估算参考：${formatCurrency(budgetTotal, input.budget.currency)}（仅供规划参考）`);
  lines.push(`- 人均估算参考：${formatCurrency(budgetSummary.perPersonAmount, input.budget.currency)}（仅供规划参考）`);
  lines.push("");
  if ((plan.budgetBreakdown ?? []).length === 0) {
    pushEmpty(lines, "暂无预算拆分。");
  } else {
    for (const item of plan.budgetBreakdown) {
      lines.push(`- **${budgetCategoryLabels[item.category]}**：${formatCurrency(item.amount, item.currency)}（估算参考，需确认）`);
      lines.push(`  - 说明：${item.description}`);
      if (item.needVerify) {
        lines.push(`  - 需确认：${item.verifyNote || "预算、价格和实际消费需按预订与现场信息确认。"}`);
      }
    }
  }

  pushSection(lines, "准备清单");
  if ((plan.packingChecklist ?? []).length === 0) {
    pushEmpty(lines, "暂无准备清单。");
  } else {
    for (const group of plan.packingChecklist) {
      lines.push(`### ${packingCategoryLabels[group.category]}`, "");
      if ((group.items ?? []).length === 0) {
        lines.push("- 暂无清单项。");
      } else {
        for (const item of group.items) {
          lines.push(`- ${item}`);
        }
      }
      lines.push("");
    }
  }

  pushSection(lines, "风险提醒");
  if ((plan.riskReminders ?? []).length === 0) {
    pushEmpty(lines, "暂无风险提醒。");
  } else {
    for (const item of plan.riskReminders) {
      lines.push(`- **${item.title}**${getVerifyMark(item.needVerify)}：${item.description}`);
      if (item.needVerify) {
        lines.push(`  - 需确认/建议应对：${item.verifyNote || "出发前请自行确认最新情况并调整安排。"}`);
      }
    }
  }

  pushSection(lines, "用户自行确认事项");
  if ((plan.userVerifyItems ?? []).length === 0) {
    pushEmpty(lines, "暂无用户自行确认事项。");
  } else {
    for (const item of plan.userVerifyItems) {
      lines.push(`- **${verifyCategoryLabels[item.category]}｜${item.item}**`);
      lines.push(`  - 原因：${item.reason}`);
      lines.push(`  - 建议操作：${item.suggestedAction}`);
    }
  }

  pushSection(lines, "免责声明");
  lines.push(plan.disclaimer);

  return lines.join("\n").replace(/\n{3,}/g, "\n\n").trimEnd() + "\n";
}
