import "server-only";

import type { PoolClient, QueryResultRow } from "pg";

import { getDatabasePool } from "@/lib/server/db/connection";
import type { TripPlan } from "@/lib/schemas/trip";
import {
  assertUuid,
  assertVersionNumber,
  buildTripPlanRecordMetadata,
  getNextVersionNumber,
  normalizeOptionalText,
  parseTripPlanSnapshot,
} from "@/lib/trip-history/persistence";

type Queryable = {
  query<TRow extends QueryResultRow = QueryResultRow>(
    text: string,
    values?: readonly unknown[],
  ): Promise<{ rows: TRow[] }>;
};

type TripPlanRecordDbRow = {
  id: string;
  user_id: string;
  title: string;
  destination: string;
  departure_city: string;
  start_date: string | Date;
  end_date: string | Date;
  travelers: number;
  budget_amount: string | number;
  budget_currency: TripPlan["input"]["budget"]["currency"];
  budget_scope: TripPlan["input"]["budget"]["scope"];
  current_version_id: string | null;
  source_provider: TripPlan["source"]["provider"];
  source_kind: TripPlan["source"]["kind"];
  generation_mode: TripPlan["generationMode"];
  created_at: string | Date;
  updated_at: string | Date;
  deleted_at: string | Date | null;
};

type TripPlanVersionDbRow = {
  id: string;
  trip_plan_record_id: string;
  user_id: string;
  version_number: number;
  trip_plan_snapshot: unknown;
  source_provider: TripPlan["source"]["provider"];
  source_kind: TripPlan["source"]["kind"];
  generation_mode: TripPlan["generationMode"];
  generated_at: string | Date;
  created_at: string | Date;
  restore_from_version_id: string | null;
  note: string | null;
};

type TripPlanVersionSummaryDbRow = {
  id: string;
  version_number: number;
  source_provider: TripPlan["source"]["provider"];
  source_kind: TripPlan["source"]["kind"];
  generation_mode: TripPlan["generationMode"];
  generated_at: string | Date;
  created_at: string | Date;
};

type MaxVersionNumberDbRow = {
  max_version_number: number | string | null;
};

export type TripPlanRecord = {
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

export type TripPlanVersion = {
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

export type TripPlanVersionSummary = {
  id: string;
  versionNumber: number;
  sourceProvider: TripPlan["source"]["provider"];
  sourceKind: TripPlan["source"]["kind"];
  generationMode: TripPlan["generationMode"];
  generatedAt: string;
  createdAt: string;
};

export type CreateTripPlanRecordInput = {
  userId: string;
  tripPlan: unknown;
  title?: string;
  db?: Queryable;
};

export type CreateTripPlanRecordWithInitialVersionInput = CreateTripPlanRecordInput;

export type CreateTripPlanVersionInput = {
  userId: string;
  tripPlanRecordId: string;
  tripPlan: unknown;
  versionNumber?: number;
  restoreFromVersionId?: string;
  note?: string;
  db?: Queryable;
};

export type GetTripPlanRecordByIdInput = {
  userId: string;
  id: string;
  db?: Queryable;
};

export type GetCurrentTripPlanVersionForRecordInput = {
  userId: string;
  tripPlanRecordId: string;
  db?: Queryable;
};

export type ListTripPlanVersionsForRecordInput = {
  userId: string;
  tripPlanRecordId: string;
  db?: Queryable;
};

export type GetTripPlanVersionByIdInput = {
  userId: string;
  tripPlanRecordId: string;
  versionId: string;
  db?: Queryable;
};

export type ListTripPlanRecordsByUserInput = {
  userId: string;
  limit?: number;
  db?: Queryable;
};

export class TripPlanRepositoryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TripPlanRepositoryError";
  }
}

function toDateOnly(value: string | Date) {
  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }

  return value;
}

function toDateTime(value: string | Date | null) {
  if (value === null) {
    return null;
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  return value;
}

function toNumber(value: string | number) {
  return typeof value === "number" ? value : Number(value);
}

function toNullableUuid(value: string | undefined) {
  return value === undefined ? null : assertUuid(value, "restoreFromVersionId");
}

function getDb(db?: Queryable) {
  return db ?? (getDatabasePool() as Queryable);
}

async function withTransaction<T>(
  db: Queryable | undefined,
  operation: (transactionDb: Queryable) => Promise<T>,
) {
  if (db !== undefined) {
    return operation(db);
  }

  const client: PoolClient = await getDatabasePool().connect();

  try {
    await client.query("BEGIN");
    const result = await operation(client as Queryable);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

function mapTripPlanRecord(row: TripPlanRecordDbRow): TripPlanRecord {
  return {
    id: row.id,
    userId: row.user_id,
    title: row.title,
    destination: row.destination,
    departureCity: row.departure_city,
    startDate: toDateOnly(row.start_date),
    endDate: toDateOnly(row.end_date),
    travelers: row.travelers,
    budgetAmount: toNumber(row.budget_amount),
    budgetCurrency: row.budget_currency,
    budgetScope: row.budget_scope,
    currentVersionId: row.current_version_id,
    sourceProvider: row.source_provider,
    sourceKind: row.source_kind,
    generationMode: row.generation_mode,
    createdAt: toDateTime(row.created_at) ?? "",
    updatedAt: toDateTime(row.updated_at) ?? "",
    deletedAt: toDateTime(row.deleted_at),
  };
}

function mapTripPlanVersion(row: TripPlanVersionDbRow): TripPlanVersion {
  return {
    id: row.id,
    tripPlanRecordId: row.trip_plan_record_id,
    userId: row.user_id,
    versionNumber: row.version_number,
    tripPlanSnapshot: parseTripPlanSnapshot(row.trip_plan_snapshot),
    sourceProvider: row.source_provider,
    sourceKind: row.source_kind,
    generationMode: row.generation_mode,
    generatedAt: toDateTime(row.generated_at) ?? "",
    createdAt: toDateTime(row.created_at) ?? "",
    restoreFromVersionId: row.restore_from_version_id,
    note: row.note,
  };
}

function mapTripPlanVersionSummary(
  row: TripPlanVersionSummaryDbRow,
): TripPlanVersionSummary {
  return {
    id: row.id,
    versionNumber: row.version_number,
    sourceProvider: row.source_provider,
    sourceKind: row.source_kind,
    generationMode: row.generation_mode,
    generatedAt: toDateTime(row.generated_at) ?? "",
    createdAt: toDateTime(row.created_at) ?? "",
  };
}

function normalizeLimit(limit: number | undefined) {
  if (limit === undefined) {
    return 50;
  }

  if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
    throw new TripPlanRepositoryError("limit must be an integer from 1 to 100.");
  }

  return limit;
}

async function readNextVersionNumber(db: Queryable, tripPlanRecordId: string, userId: string) {
  const result = await db.query<MaxVersionNumberDbRow>(
    `
      SELECT max(version_number) AS max_version_number
      FROM trip_plan_versions
      WHERE trip_plan_record_id = $1
        AND user_id = $2
    `,
    [tripPlanRecordId, userId],
  );
  const maxVersionNumber = result.rows[0]?.max_version_number;

  return getNextVersionNumber(
    maxVersionNumber === null || maxVersionNumber === undefined
      ? null
      : Number(maxVersionNumber),
  );
}

export async function createTripPlanRecord(input: CreateTripPlanRecordInput) {
  const userId = assertUuid(input.userId, "userId");
  const metadata = buildTripPlanRecordMetadata(input.tripPlan, input.title);
  const db = getDb(input.db);
  const result = await db.query<TripPlanRecordDbRow>(
    `
      INSERT INTO trip_plan_records (
        user_id,
        title,
        destination,
        departure_city,
        start_date,
        end_date,
        travelers,
        budget_amount,
        budget_currency,
        budget_scope,
        source_provider,
        source_kind,
        generation_mode
      )
      VALUES ($1, $2, $3, $4, $5::date, $6::date, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *
    `,
    [
      userId,
      metadata.title,
      metadata.destination,
      metadata.departureCity,
      metadata.startDate,
      metadata.endDate,
      metadata.travelers,
      metadata.budgetAmount,
      metadata.budgetCurrency,
      metadata.budgetScope,
      metadata.sourceProvider,
      metadata.sourceKind,
      metadata.generationMode,
    ],
  );
  const row = result.rows[0];

  if (row === undefined) {
    throw new TripPlanRepositoryError("Trip plan record was not created.");
  }

  return mapTripPlanRecord(row);
}

export async function createTripPlanRecordWithInitialVersion(
  input: CreateTripPlanRecordWithInitialVersionInput,
) {
  const userId = assertUuid(input.userId, "userId");
  const metadata = buildTripPlanRecordMetadata(input.tripPlan, input.title);

  return withTransaction(input.db, async (db) => {
    const recordResult = await db.query<TripPlanRecordDbRow>(
      `
        INSERT INTO trip_plan_records (
          user_id,
          title,
          destination,
          departure_city,
          start_date,
          end_date,
          travelers,
          budget_amount,
          budget_currency,
          budget_scope,
          source_provider,
          source_kind,
          generation_mode
        )
        VALUES ($1, $2, $3, $4, $5::date, $6::date, $7, $8, $9, $10, $11, $12, $13)
        RETURNING *
      `,
      [
        userId,
        metadata.title,
        metadata.destination,
        metadata.departureCity,
        metadata.startDate,
        metadata.endDate,
        metadata.travelers,
        metadata.budgetAmount,
        metadata.budgetCurrency,
        metadata.budgetScope,
        metadata.sourceProvider,
        metadata.sourceKind,
        metadata.generationMode,
      ],
    );
    const recordRow = recordResult.rows[0];

    if (recordRow === undefined) {
      throw new TripPlanRepositoryError("Trip plan record was not created.");
    }

    const versionResult = await db.query<TripPlanVersionDbRow>(
      `
        INSERT INTO trip_plan_versions (
          trip_plan_record_id,
          user_id,
          version_number,
          trip_plan_snapshot,
          source_provider,
          source_kind,
          generation_mode,
          generated_at
        )
        VALUES ($1, $2, 1, $3::jsonb, $4, $5, $6, $7::timestamptz)
        RETURNING *
      `,
      [
        recordRow.id,
        userId,
        JSON.stringify(metadata.tripPlanSnapshot),
        metadata.sourceProvider,
        metadata.sourceKind,
        metadata.generationMode,
        metadata.generatedAt,
      ],
    );
    const versionRow = versionResult.rows[0];

    if (versionRow === undefined) {
      throw new TripPlanRepositoryError("Trip plan version was not created.");
    }

    const updatedRecordResult = await db.query<TripPlanRecordDbRow>(
      `
        UPDATE trip_plan_records
        SET current_version_id = $3,
            updated_at = now()
        WHERE id = $1
          AND user_id = $2
          AND deleted_at IS NULL
        RETURNING *
      `,
      [recordRow.id, userId, versionRow.id],
    );
    const updatedRecordRow = updatedRecordResult.rows[0];

    if (updatedRecordRow === undefined) {
      throw new TripPlanRepositoryError("Trip plan record current version was not updated.");
    }

    return {
      record: mapTripPlanRecord(updatedRecordRow),
      currentVersion: mapTripPlanVersion(versionRow),
    };
  });
}

export async function createTripPlanVersion(input: CreateTripPlanVersionInput) {
  const userId = assertUuid(input.userId, "userId");
  const tripPlanRecordId = assertUuid(input.tripPlanRecordId, "tripPlanRecordId");
  const restoreFromVersionId = toNullableUuid(input.restoreFromVersionId);
  const note = normalizeOptionalText(input.note, 300) ?? null;
  const metadata = buildTripPlanRecordMetadata(input.tripPlan);

  return withTransaction(input.db, async (db) => {
    const recordResult = await db.query<{ id: string }>(
      `
        SELECT id
        FROM trip_plan_records
        WHERE id = $1
          AND user_id = $2
          AND deleted_at IS NULL
        FOR UPDATE
      `,
      [tripPlanRecordId, userId],
    );

    if (recordResult.rows.length === 0) {
      throw new TripPlanRepositoryError("Trip plan record was not found.");
    }

    const versionNumber =
      input.versionNumber === undefined
        ? await readNextVersionNumber(db, tripPlanRecordId, userId)
        : assertVersionNumber(input.versionNumber);
    const versionResult = await db.query<TripPlanVersionDbRow>(
      `
        INSERT INTO trip_plan_versions (
          trip_plan_record_id,
          user_id,
          version_number,
          trip_plan_snapshot,
          source_provider,
          source_kind,
          generation_mode,
          generated_at,
          restore_from_version_id,
          note
        )
        VALUES ($1, $2, $3, $4::jsonb, $5, $6, $7, $8::timestamptz, $9, $10)
        RETURNING *
      `,
      [
        tripPlanRecordId,
        userId,
        versionNumber,
        JSON.stringify(metadata.tripPlanSnapshot),
        metadata.sourceProvider,
        metadata.sourceKind,
        metadata.generationMode,
        metadata.generatedAt,
        restoreFromVersionId,
        note,
      ],
    );
    const versionRow = versionResult.rows[0];

    if (versionRow === undefined) {
      throw new TripPlanRepositoryError("Trip plan version was not created.");
    }

    await db.query(
      `
        UPDATE trip_plan_records
        SET
          title = $3,
          destination = $4,
          departure_city = $5,
          start_date = $6::date,
          end_date = $7::date,
          travelers = $8,
          budget_amount = $9,
          budget_currency = $10,
          budget_scope = $11,
          current_version_id = $12,
          source_provider = $13,
          source_kind = $14,
          generation_mode = $15,
          updated_at = now()
        WHERE id = $1
          AND user_id = $2
          AND deleted_at IS NULL
      `,
      [
        tripPlanRecordId,
        userId,
        metadata.title,
        metadata.destination,
        metadata.departureCity,
        metadata.startDate,
        metadata.endDate,
        metadata.travelers,
        metadata.budgetAmount,
        metadata.budgetCurrency,
        metadata.budgetScope,
        versionRow.id,
        metadata.sourceProvider,
        metadata.sourceKind,
        metadata.generationMode,
      ],
    );

    return mapTripPlanVersion(versionRow);
  });
}

export async function getTripPlanRecordById(input: GetTripPlanRecordByIdInput) {
  const userId = assertUuid(input.userId, "userId");
  const id = assertUuid(input.id, "id");
  const db = getDb(input.db);
  const result = await db.query<TripPlanRecordDbRow>(
    `
      SELECT *
      FROM trip_plan_records
      WHERE id = $1
        AND user_id = $2
        AND deleted_at IS NULL
      LIMIT 1
    `,
    [id, userId],
  );
  const row = result.rows[0];

  return row === undefined ? null : mapTripPlanRecord(row);
}

export async function getCurrentTripPlanVersionForRecord(
  input: GetCurrentTripPlanVersionForRecordInput,
) {
  const userId = assertUuid(input.userId, "userId");
  const tripPlanRecordId = assertUuid(input.tripPlanRecordId, "tripPlanRecordId");
  const db = getDb(input.db);
  const result = await db.query<TripPlanVersionDbRow>(
    `
      SELECT versions.*
      FROM trip_plan_records records
      INNER JOIN trip_plan_versions versions
        ON versions.id = records.current_version_id
       AND versions.trip_plan_record_id = records.id
       AND versions.user_id = records.user_id
      WHERE records.id = $1
        AND records.user_id = $2
        AND records.deleted_at IS NULL
      LIMIT 1
    `,
    [tripPlanRecordId, userId],
  );
  const row = result.rows[0];

  return row === undefined ? null : mapTripPlanVersion(row);
}

export async function listTripPlanVersionsForRecord(
  input: ListTripPlanVersionsForRecordInput,
) {
  const userId = assertUuid(input.userId, "userId");
  const tripPlanRecordId = assertUuid(input.tripPlanRecordId, "tripPlanRecordId");
  const db = getDb(input.db);
  const result = await db.query<TripPlanVersionSummaryDbRow>(
    `
      SELECT
        versions.id,
        versions.version_number,
        versions.source_provider,
        versions.source_kind,
        versions.generation_mode,
        versions.generated_at,
        versions.created_at
      FROM trip_plan_records records
      INNER JOIN trip_plan_versions versions
        ON versions.trip_plan_record_id = records.id
       AND versions.user_id = records.user_id
      WHERE records.id = $1
        AND records.user_id = $2
        AND records.deleted_at IS NULL
      ORDER BY versions.version_number DESC
    `,
    [tripPlanRecordId, userId],
  );

  return result.rows.map(mapTripPlanVersionSummary);
}

export async function getTripPlanVersionById(input: GetTripPlanVersionByIdInput) {
  const userId = assertUuid(input.userId, "userId");
  const tripPlanRecordId = assertUuid(input.tripPlanRecordId, "tripPlanRecordId");
  const versionId = assertUuid(input.versionId, "versionId");
  const db = getDb(input.db);
  const result = await db.query<TripPlanVersionDbRow>(
    `
      SELECT versions.*
      FROM trip_plan_records records
      INNER JOIN trip_plan_versions versions
        ON versions.trip_plan_record_id = records.id
       AND versions.user_id = records.user_id
      WHERE records.id = $1
        AND records.user_id = $2
        AND records.deleted_at IS NULL
        AND versions.id = $3
      LIMIT 1
    `,
    [tripPlanRecordId, userId, versionId],
  );
  const row = result.rows[0];

  return row === undefined ? null : mapTripPlanVersion(row);
}

export async function listTripPlanRecordsByUser(input: ListTripPlanRecordsByUserInput) {
  const userId = assertUuid(input.userId, "userId");
  const limit = normalizeLimit(input.limit);
  const db = getDb(input.db);
  const result = await db.query<TripPlanRecordDbRow>(
    `
      SELECT *
      FROM trip_plan_records
      WHERE user_id = $1
        AND deleted_at IS NULL
      ORDER BY updated_at DESC, created_at DESC
      LIMIT $2
    `,
    [userId, limit],
  );

  return result.rows.map(mapTripPlanRecord);
}
