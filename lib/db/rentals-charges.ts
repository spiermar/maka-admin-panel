import { executeReturning, queryOne, queryMany } from './index';
import { RentCharge, ChargeStatus } from './types';

export interface ChargeFilters {
  status?: ChargeStatus;
  month?: number; // 1-12
  year?: number;
}

export interface OverdueBalance {
  lease_id: number;
  tenant_name: string;
  unit_info: string;
  total_overdue: number;
  oldest_due_date: string;
}

// Generate monthly charges for all active leases
export async function generateMonthlyCharges(
  year: number,
  month: number,
  gracePeriodDays: number = 5
): Promise<RentCharge[]> {
  // Calculate month boundaries
  const monthStart = new Date(year, month - 1, 1);
  const monthEnd = new Date(year, month, 0); // Last day of month
  
  const chargeDate = monthStart.toISOString().split('T')[0];
  const dueDate = new Date(monthEnd);
  dueDate.setDate(dueDate.getDate() + gracePeriodDays);
  const dueDateStr = dueDate.toISOString().split('T')[0];

  // Get all active leases that cover this month
  const activeLeases = await queryMany<{
    id: number;
    monthly_rent: number;
  }>(
    `SELECT id, monthly_rent 
     FROM leases 
     WHERE status = 'Active' 
       AND start_date <= $1 
       AND end_date >= $2`,
    [monthEnd.toISOString().split('T')[0], chargeDate]
  );

  const createdCharges: RentCharge[] = [];

  for (const lease of activeLeases) {
    // Check if charge already exists for this lease/month
    const existingCharge = await queryOne<{ id: number }>(
      `SELECT id FROM charges 
       WHERE lease_id = $1 AND charge_date = $2`,
      [lease.id, chargeDate]
    );

    if (existingCharge) {
      // Skip if charge already exists
      continue;
    }

    // Create the charge
    const charge = await executeReturning<RentCharge>(
      `INSERT INTO charges (lease_id, charge_date, due_date, amount, status)
       VALUES ($1, $2, $3, $4, 'pending')
       RETURNING *`,
      [lease.id, chargeDate, dueDateStr, lease.monthly_rent]
    );

    createdCharges.push(charge);
  }

  return createdCharges;
}

// Get a single charge by ID
export async function getChargeById(id: number): Promise<RentCharge | null> {
  return queryOne<RentCharge>('SELECT * FROM charges WHERE id = $1', [id]);
}

// Get all charges with optional filters
export async function getAllCharges(filters?: ChargeFilters): Promise<RentCharge[]> {
  const conditions: string[] = [];
  const values: (string | number)[] = [];
  let paramIndex = 1;

  if (filters?.status) {
    conditions.push(`status = $${paramIndex++}`);
    values.push(filters.status);
  }

  if (filters?.year && filters?.month) {
    const monthStart = new Date(filters.year, filters.month - 1, 1);
    const monthEnd = new Date(filters.year, filters.month, 0);
    conditions.push(`charge_date >= $${paramIndex++}`);
    values.push(monthStart.toISOString().split('T')[0]);
    conditions.push(`charge_date <= $${paramIndex++}`);
    values.push(monthEnd.toISOString().split('T')[0]);
  } else if (filters?.year) {
    conditions.push(`charge_date >= $${paramIndex++}`);
    values.push(`${filters.year}-01-01`);
    conditions.push(`charge_date <= $${paramIndex++}`);
    values.push(`${filters.year}-12-31`);
  }

  const whereClause = conditions.length > 0
    ? `WHERE ${conditions.join(' AND ')}`
    : '';

  return queryMany<RentCharge>(
    `SELECT * FROM charges ${whereClause} ORDER BY charge_date DESC, id DESC`,
    values
  );
}

// Get balance for a specific lease
// Balance = sum of pending charges - sum of payments applied to those charges
export async function getLeaseBalance(leaseId: number): Promise<number> {
  // Get sum of pending charges
  const pendingCharges = await queryOne<{ total: string }>(
    `SELECT COALESCE(SUM(amount), 0) as total 
     FROM charges 
     WHERE lease_id = $1 AND status = 'pending'`,
    [leaseId]
  );

  // Get sum of payments for this lease
  const payments = await queryOne<{ total: string }>(
    `SELECT COALESCE(SUM(amount), 0) as total 
     FROM payments 
     WHERE lease_id = $1`,
    [leaseId]
  );

  const pendingTotal = parseFloat(pendingCharges?.total || '0');
  const paymentsTotal = parseFloat(payments?.total || '0');

  // Balance = pending charges - payments
  return Math.max(0, pendingTotal - paymentsTotal);
}

// Get all overdue balances
export async function getOverdueBalances(gracePeriodDays: number = 5): Promise<OverdueBalance[]> {
  const today = new Date();
  today.setDate(today.getDate() - gracePeriodDays);
  const cutoffDate = today.toISOString().split('T')[0];

  return queryMany<OverdueBalance>(
    `SELECT 
      c.lease_id,
      t.name as tenant_name,
      CONCAT(p.name, ' - ', u.unit_number) as unit_info,
      COALESCE(SUM(c.amount), 0) as total_overdue,
      MIN(c.due_date) as oldest_due_date
    FROM charges c
    JOIN leases l ON c.lease_id = l.id
    JOIN tenants t ON l.tenant_id = t.id
    JOIN units u ON l.unit_id = u.id
    JOIN properties p ON u.property_id = p.id
    WHERE c.status = 'pending' AND c.due_date < $1
    GROUP BY c.lease_id, t.name, p.name, u.unit_number
    ORDER BY total_overdue DESC`,
    [cutoffDate]
  );
}

// Get charges by lease ID
export async function getChargesByLease(leaseId: number): Promise<RentCharge[]> {
  return queryMany<RentCharge>(
    `SELECT * FROM charges WHERE lease_id = $1 ORDER BY charge_date DESC, id DESC`,
    [leaseId]
  );
}

// Update charge status (e.g., mark as paid)
export async function updateChargeStatus(
  id: number,
  status: ChargeStatus
): Promise<RentCharge> {
  return executeReturning<RentCharge>(
    `UPDATE charges SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
    [status, id]
  );
}