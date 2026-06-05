import type { Budget } from "@/lib/schemas/trip";

export type BudgetSummary = {
  submittedAmount: number;
  submittedLabel: string;
  totalAmount: number;
  perPersonAmount: number;
};

export function getBudgetSummary(budget: Budget, travelers: number): BudgetSummary {
  const safeTravelers = travelers > 0 ? travelers : 1;

  if (budget.scope === "perPerson") {
    return {
      submittedAmount: budget.amount,
      submittedLabel: "人均预算",
      totalAmount: budget.amount * safeTravelers,
      perPersonAmount: budget.amount,
    };
  }

  return {
    submittedAmount: budget.amount,
    submittedLabel: "总预算",
    totalAmount: budget.amount,
    perPersonAmount: budget.amount / safeTravelers,
  };
}
