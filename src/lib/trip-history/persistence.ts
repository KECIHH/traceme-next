import { TripPlanSchema, type TripPlan } from "@/lib/schemas/trip";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export class TripPlanPersistenceValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TripPlanPersistenceValidationError";
  }
}

export type TripPlanRecordMetadata = {
  title: string;
  destination: string;
  departureCity: string;
  startDate: string;
  endDate: string;
  travelers: number;
  budgetAmount: number;
  budgetCurrency: TripPlan["input"]["budget"]["currency"];
  budgetScope: TripPlan["input"]["budget"]["scope"];
  sourceProvider: TripPlan["source"]["provider"];
  sourceKind: TripPlan["source"]["kind"];
  generationMode: TripPlan["generationMode"];
  generatedAt: string;
  tripPlanSnapshot: TripPlan;
};

export function assertUuid(value: string, fieldName: string) {
  if (!UUID_PATTERN.test(value)) {
    throw new TripPlanPersistenceValidationError(`${fieldName} must be a UUID.`);
  }

  return value;
}

export function normalizeOptionalText(value: string | undefined, maxLength: number) {
  const trimmedValue = value?.trim() ?? "";

  if (!trimmedValue) {
    return undefined;
  }

  return trimmedValue.slice(0, maxLength);
}

export function parseTripPlanSnapshot(value: unknown) {
  const validationResult = TripPlanSchema.safeParse(value);

  if (!validationResult.success) {
    throw new TripPlanPersistenceValidationError("tripPlan must match TripPlanSchema.");
  }

  return structuredClone(validationResult.data) as TripPlan;
}

export function buildDefaultTripPlanTitle(tripPlan: TripPlan) {
  return `${tripPlan.input.destination} ${tripPlan.input.startDate} - ${tripPlan.input.endDate}`;
}

export function buildTripPlanRecordMetadata(
  tripPlanValue: unknown,
  title?: string,
): TripPlanRecordMetadata {
  const tripPlanSnapshot = parseTripPlanSnapshot(tripPlanValue);
  const input = tripPlanSnapshot.input;
  const safeTitle = normalizeOptionalText(title, 120) ?? buildDefaultTripPlanTitle(tripPlanSnapshot);

  return {
    title: safeTitle,
    destination: input.destination,
    departureCity: input.departureCity,
    startDate: input.startDate,
    endDate: input.endDate,
    travelers: input.travelers,
    budgetAmount: input.budget.amount,
    budgetCurrency: input.budget.currency,
    budgetScope: input.budget.scope,
    sourceProvider: tripPlanSnapshot.source.provider,
    sourceKind: tripPlanSnapshot.source.kind,
    generationMode: tripPlanSnapshot.generationMode,
    generatedAt: tripPlanSnapshot.generatedAt,
    tripPlanSnapshot,
  };
}

export function getNextVersionNumber(currentMaxVersionNumber: number | null | undefined) {
  if (currentMaxVersionNumber === null || currentMaxVersionNumber === undefined) {
    return 1;
  }

  if (!Number.isInteger(currentMaxVersionNumber) || currentMaxVersionNumber < 1) {
    throw new TripPlanPersistenceValidationError("currentMaxVersionNumber must be a positive integer.");
  }

  return currentMaxVersionNumber + 1;
}

export function assertVersionNumber(value: number) {
  if (!Number.isInteger(value) || value < 1) {
    throw new TripPlanPersistenceValidationError("versionNumber must be a positive integer.");
  }

  return value;
}
