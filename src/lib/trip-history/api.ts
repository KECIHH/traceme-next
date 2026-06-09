import type { CurrentUser } from "@/lib/account/current-user-summary";
import { AuthenticationRequiredError } from "@/lib/server/auth/errors";
import { TripPlanSchema, type TripPlan } from "@/lib/schemas/trip";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type ApiErrorCode = "UNAUTHORIZED" | "BAD_REQUEST" | "NOT_FOUND" | "INTERNAL_ERROR";

export type TripPlanRecordForApi = {
  id: string;
  userId: string;
  title: string;
  destination: string;
  departureCity: string;
  startDate: string;
  endDate: string;
  travelers: number;
  budgetAmount: number;
  budgetCurrency: TripPlan["input"]["budget"]["currency"];
  budgetScope: TripPlan["input"]["budget"]["scope"];
  currentVersionId: string | null;
  sourceProvider: TripPlan["source"]["provider"];
  sourceKind: TripPlan["source"]["kind"];
  generationMode: TripPlan["generationMode"];
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
};

export type TripPlanVersionForApi = {
  id: string;
  tripPlanRecordId: string;
  userId: string;
  versionNumber: number;
  tripPlanSnapshot: TripPlan;
  sourceProvider: TripPlan["source"]["provider"];
  sourceKind: TripPlan["source"]["kind"];
  generationMode: TripPlan["generationMode"];
  generatedAt: string;
  createdAt: string;
  restoreFromVersionId: string | null;
  note: string | null;
};

export type TripPlanRecordSummary = {
  id: string;
  title: string;
  destination: string;
  departureCity: string;
  startDate: string;
  endDate: string;
  travelers: number;
  budget: {
    amount: number;
    currency: TripPlan["input"]["budget"]["currency"];
    scope: TripPlan["input"]["budget"]["scope"];
  };
  source: TripPlan["source"];
  generationMode: TripPlan["generationMode"];
  createdAt: string;
  updatedAt: string;
};

type VersionSummary = {
  id: string;
  versionNumber: number;
  generatedAt: string;
  createdAt: string;
};

type VersionDetail = {
  versionNumber: number;
  generatedAt: string;
  createdAt: string;
  tripPlan: TripPlan;
};

type SaveRequestBody = {
  tripPlan?: unknown;
};

type RequireCurrentUser = () => Promise<CurrentUser>;

export type SaveTripPlanApiDependencies = {
  requireCurrentUser: RequireCurrentUser;
  createTripPlanRecordWithInitialVersion(input: {
    userId: string;
    tripPlan: TripPlan;
  }): Promise<{
    record: TripPlanRecordForApi;
    currentVersion: TripPlanVersionForApi;
  }>;
};

export type ListTripPlansApiDependencies = {
  requireCurrentUser: RequireCurrentUser;
  listTripPlanRecordsByUser(input: {
    userId: string;
  }): Promise<TripPlanRecordForApi[]>;
};

export type GetTripPlanDetailApiDependencies = {
  requireCurrentUser: RequireCurrentUser;
  getTripPlanRecordById(input: {
    userId: string;
    id: string;
  }): Promise<TripPlanRecordForApi | null>;
  getCurrentTripPlanVersionForRecord(input: {
    userId: string;
    tripPlanRecordId: string;
  }): Promise<TripPlanVersionForApi | null>;
};

function createRequestId() {
  return crypto.randomUUID();
}

function errorResponse(
  code: ApiErrorCode,
  message: string,
  requestId: string,
  status: number,
) {
  return Response.json(
    {
      ok: false,
      error: {
        code,
        message,
        requestId,
      },
    },
    { status },
  );
}

function unauthorizedResponse(requestId: string) {
  return errorResponse("UNAUTHORIZED", "Authentication is required.", requestId, 401);
}

function badRequestResponse(requestId: string) {
  return errorResponse("BAD_REQUEST", "Request body is invalid.", requestId, 400);
}

function notFoundResponse(requestId: string) {
  return errorResponse("NOT_FOUND", "Trip plan was not found.", requestId, 404);
}

function internalErrorResponse(requestId: string) {
  return errorResponse("INTERNAL_ERROR", "Internal server error.", requestId, 500);
}

function logInternalApiError(operation: string, requestId: string, error: unknown) {
  console.error("[trip-plan-history-api-error]", {
    operation,
    requestId,
    errorName: error instanceof Error ? error.name : typeof error,
  });
}

function isAuthenticationError(error: unknown) {
  return error instanceof AuthenticationRequiredError;
}

function summarizeRecord(record: TripPlanRecordForApi): TripPlanRecordSummary {
  return {
    id: record.id,
    title: record.title,
    destination: record.destination,
    departureCity: record.departureCity,
    startDate: record.startDate,
    endDate: record.endDate,
    travelers: record.travelers,
    budget: {
      amount: record.budgetAmount,
      currency: record.budgetCurrency,
      scope: record.budgetScope,
    },
    source: {
      provider: record.sourceProvider,
      kind: record.sourceKind,
    },
    generationMode: record.generationMode,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

function summarizeVersion(version: TripPlanVersionForApi): VersionSummary {
  return {
    id: version.id,
    versionNumber: version.versionNumber,
    generatedAt: version.generatedAt,
    createdAt: version.createdAt,
  };
}

function detailVersion(version: TripPlanVersionForApi): VersionDetail {
  return {
    versionNumber: version.versionNumber,
    generatedAt: version.generatedAt,
    createdAt: version.createdAt,
    tripPlan: version.tripPlanSnapshot,
  };
}

function isUuid(value: string) {
  return UUID_PATTERN.test(value);
}

async function requireUserOrResponse(
  requestId: string,
  requireCurrentUser: RequireCurrentUser,
) {
  try {
    return {
      ok: true as const,
      user: await requireCurrentUser(),
    };
  } catch (error) {
    if (isAuthenticationError(error)) {
      return {
        ok: false as const,
        response: unauthorizedResponse(requestId),
      };
    }

    throw error;
  }
}

export async function handleSaveTripPlanRequest(
  request: Request,
  dependencies: SaveTripPlanApiDependencies,
) {
  const requestId = createRequestId();
  let currentUser: CurrentUser;

  try {
    const userResult = await requireUserOrResponse(requestId, dependencies.requireCurrentUser);

    if (!userResult.ok) {
      return userResult.response;
    }

    currentUser = userResult.user;
  } catch (error) {
    logInternalApiError("save.requireCurrentUser", requestId, error);
    return internalErrorResponse(requestId);
  }

  let body: SaveRequestBody;

  try {
    body = (await request.json()) as SaveRequestBody;
  } catch {
    return errorResponse("BAD_REQUEST", "Request body must be valid JSON.", requestId, 400);
  }

  const validationResult = TripPlanSchema.safeParse(body?.tripPlan);

  if (!validationResult.success) {
    return badRequestResponse(requestId);
  }

  try {
    const savedPlan = await dependencies.createTripPlanRecordWithInitialVersion({
      userId: currentUser.id,
      tripPlan: validationResult.data,
    });

    return Response.json({
      ok: true,
      data: {
        record: summarizeRecord(savedPlan.record),
        currentVersion: summarizeVersion(savedPlan.currentVersion),
      },
    });
  } catch (error) {
    logInternalApiError("save.create", requestId, error);
    return internalErrorResponse(requestId);
  }
}

export async function handleListTripPlansRequest(
  dependencies: ListTripPlansApiDependencies,
) {
  const requestId = createRequestId();
  let currentUser: CurrentUser;

  try {
    const userResult = await requireUserOrResponse(requestId, dependencies.requireCurrentUser);

    if (!userResult.ok) {
      return userResult.response;
    }

    currentUser = userResult.user;
  } catch (error) {
    logInternalApiError("list.requireCurrentUser", requestId, error);
    return internalErrorResponse(requestId);
  }

  try {
    const records = await dependencies.listTripPlanRecordsByUser({
      userId: currentUser.id,
    });

    return Response.json({
      ok: true,
      data: {
        records: records.map(summarizeRecord),
      },
    });
  } catch (error) {
    logInternalApiError("list.records", requestId, error);
    return internalErrorResponse(requestId);
  }
}

export async function handleGetTripPlanDetailRequest(
  id: string,
  dependencies: GetTripPlanDetailApiDependencies,
) {
  const requestId = createRequestId();
  let currentUser: CurrentUser;

  try {
    const userResult = await requireUserOrResponse(requestId, dependencies.requireCurrentUser);

    if (!userResult.ok) {
      return userResult.response;
    }

    currentUser = userResult.user;
  } catch (error) {
    logInternalApiError("detail.requireCurrentUser", requestId, error);
    return internalErrorResponse(requestId);
  }

  if (!isUuid(id)) {
    return notFoundResponse(requestId);
  }

  try {
    const record = await dependencies.getTripPlanRecordById({
      userId: currentUser.id,
      id,
    });

    if (record === null) {
      return notFoundResponse(requestId);
    }

    const currentVersion = await dependencies.getCurrentTripPlanVersionForRecord({
      userId: currentUser.id,
      tripPlanRecordId: record.id,
    });

    if (currentVersion === null) {
      return notFoundResponse(requestId);
    }

    return Response.json({
      ok: true,
      data: {
        record: summarizeRecord(record),
        currentVersion: detailVersion(currentVersion),
      },
    });
  } catch (error) {
    logInternalApiError("detail.record", requestId, error);
    return internalErrorResponse(requestId);
  }
}
