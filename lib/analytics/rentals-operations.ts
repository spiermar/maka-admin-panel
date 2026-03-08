import { queryOne } from '@/lib/db';

export interface RentalOperationSummary {
  vacant_count: number;
  occupied_count: number;
  unavailable_count: number;
  delinquent_count: number;
}

export async function getRentalOperationSummary(): Promise<RentalOperationSummary> {
  // Get unit counts by status
  const unitCounts = await queryOne<{ vacant: number; occupied: number; unavailable: number }>(
    `SELECT
      COALESCE(SUM(CASE WHEN status = 'Vacant' THEN 1 ELSE 0 END), 0)::integer as vacant,
      COALESCE(SUM(CASE WHEN status = 'Occupied' THEN 1 ELSE 0 END), 0)::integer as occupied,
      COALESCE(SUM(CASE WHEN status = 'Unavailable' THEN 1 ELSE 0 END), 0)::integer as unavailable
    FROM units`
  );

  // Get delinquent accounts: pending charges where due_date < today - 5 day grace period
  // Count unique leases with overdue charges
  const delinquentResult = await queryOne<{ delinquent: number }>(
    `SELECT COUNT(DISTINCT lease_id)::integer as delinquent
     FROM charges
     WHERE status = 'pending'
       AND due_date < CURRENT_DATE - INTERVAL '5 days'`
  );

  return {
    vacant_count: unitCounts?.vacant || 0,
    occupied_count: unitCounts?.occupied || 0,
    unavailable_count: unitCounts?.unavailable || 0,
    delinquent_count: delinquentResult?.delinquent || 0,
  };
}