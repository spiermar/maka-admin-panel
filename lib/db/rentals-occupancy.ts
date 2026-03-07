import { execute, executeReturning, queryOne } from './index';
import { UnitOccupancyStatus, UnitStatus } from './types';

export interface ScheduleUnitOccupancyInput {
  unit_id: number;
  status: UnitStatus;
  effective_date: string;
  unavailable_reason?: string | null;
}

export interface UnitOccupancySnapshot {
  current: UnitOccupancyStatusView | null;
  next: UnitOccupancyStatusView | null;
}

interface UnitOccupancyStatusView {
  status: UnitStatus;
  effective_date: string;
  unavailable_reason: string | null;
}

export class OccupancyConflictError extends Error {
  code: string;

  constructor(message: string) {
    super(message);
    this.name = 'OccupancyConflictError';
    this.code = 'OCCUPANCY_OVERLAP';
  }
}

function normalizeUnavailableReason(value: string | null | undefined): string | null {
  if (value === null || value === undefined) {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

async function syncUnitCurrentStatus(unitId: number): Promise<void> {
  await execute(
    `UPDATE units
     SET status = latest.status,
         updated_at = NOW()
     FROM (
       SELECT status
       FROM unit_occupancy_statuses
       WHERE unit_id = $1 AND effective_date <= CURRENT_DATE
       ORDER BY effective_date DESC, id DESC
       LIMIT 1
     ) latest
     WHERE units.id = $1`,
    [unitId]
  );
}

export async function scheduleUnitOccupancyStatus(
  input: ScheduleUnitOccupancyInput
): Promise<UnitOccupancyStatus> {
  const conflict = await queryOne<{ id: number }>(
    `SELECT id
     FROM unit_occupancy_statuses
     WHERE unit_id = $1
       AND effective_date = $2::date`,
    [input.unit_id, input.effective_date]
  );

  if (conflict) {
    throw new OccupancyConflictError(
      'An occupancy status is already scheduled for this unit on the selected effective date'
    );
  }

  const occupancy = await executeReturning<UnitOccupancyStatus>(
    `INSERT INTO unit_occupancy_statuses (
       unit_id,
       status,
       effective_date,
       unavailable_reason
     )
     VALUES ($1, $2, $3::date, $4)
     RETURNING *`,
    [
      input.unit_id,
      input.status,
      input.effective_date,
      normalizeUnavailableReason(input.unavailable_reason),
    ]
  );

  await syncUnitCurrentStatus(input.unit_id);

  return occupancy;
}

export async function getUnitOccupancySnapshot(unitId: number): Promise<UnitOccupancySnapshot> {
  const current = await queryOne<UnitOccupancyStatusView>(
    `SELECT status, effective_date, unavailable_reason
     FROM unit_occupancy_statuses
     WHERE unit_id = $1
       AND effective_date <= CURRENT_DATE
     ORDER BY effective_date DESC, id DESC
     LIMIT 1`,
    [unitId]
  );

  const next = await queryOne<UnitOccupancyStatusView>(
    `SELECT status, effective_date, unavailable_reason
     FROM unit_occupancy_statuses
     WHERE unit_id = $1
       AND effective_date > CURRENT_DATE
     ORDER BY effective_date ASC, id ASC
     LIMIT 1`,
    [unitId]
  );

  return { current, next };
}
