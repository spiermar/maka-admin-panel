import { execute, executeReturning, queryOne, queryMany } from './index';
import { RentPayment, PaymentMethod } from './types';
import { updateChargeStatus } from './rentals-charges';

export interface PaymentFilters {
  lease_id?: number;
  start_date?: string;
  end_date?: string;
}

// Create a new payment
export async function createPayment(data: {
  lease_id: number;
  payment_date: string;
  amount: number;
  payment_method: PaymentMethod;
  notes?: string | null;
}): Promise<RentPayment> {
  return executeReturning<RentPayment>(
    `INSERT INTO payments (lease_id, payment_date, amount, payment_method, notes)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [
      data.lease_id,
      data.payment_date,
      data.amount,
      data.payment_method,
      data.notes || null
    ]
  );
}

// Get a single payment by ID
export async function getPaymentById(id: number): Promise<RentPayment | null> {
  return queryOne<RentPayment>('SELECT * FROM payments WHERE id = $1', [id]);
}

// Get all payments with optional filters
export async function getAllPayments(filters?: PaymentFilters): Promise<RentPayment[]> {
  const conditions: string[] = [];
  const values: (string | number)[] = [];
  let paramIndex = 1;

  if (filters?.lease_id) {
    conditions.push(`lease_id = $${paramIndex++}`);
    values.push(filters.lease_id);
  }

  if (filters?.start_date) {
    conditions.push(`payment_date >= $${paramIndex++}`);
    values.push(filters.start_date);
  }

  if (filters?.end_date) {
    conditions.push(`payment_date <= $${paramIndex++}`);
    values.push(filters.end_date);
  }

  const whereClause = conditions.length > 0
    ? `WHERE ${conditions.join(' AND ')}`
    : '';

  return queryMany<RentPayment>(
    `SELECT * FROM payments ${whereClause} ORDER BY payment_date DESC, id DESC`,
    values
  );
}

// Get all payments for a specific lease
export async function getPaymentsByLease(leaseId: number): Promise<RentPayment[]> {
  return queryMany<RentPayment>(
    `SELECT * FROM payments WHERE lease_id = $1 ORDER BY payment_date DESC, id DESC`,
    [leaseId]
  );
}

// Allocate a payment to pending charges (oldest first)
// This is the internal function that implements "oldest pending charge first" allocation
export async function allocatePaymentToCharges(paymentId: number): Promise<void> {
  // Get the payment
  const payment = await getPaymentById(paymentId);
  if (!payment) {
    throw new Error('Payment not found');
  }

  // Get pending charges for this lease, ordered by due_date (oldest first)
  const pendingCharges = await queryMany<{
    id: number;
    amount: number;
    due_date: string;
  }>(
    `SELECT id, amount, due_date 
     FROM charges 
     WHERE lease_id = $1 AND status = 'pending'
     ORDER BY due_date ASC, id ASC`,
    [payment.lease_id]
  );

  if (pendingCharges.length === 0) {
    // No pending charges to allocate to
    return;
  }

  let remainingPayment = payment.amount;

  // Apply payment to charges in order until exhausted
  for (const charge of pendingCharges) {
    if (remainingPayment <= 0) {
      break;
    }

    if (remainingPayment >= charge.amount) {
      // Full payment for this charge - mark as paid
      await updateChargeStatus(charge.id, 'paid');
      remainingPayment -= charge.amount;
    } else {
      // Partial payment - charge remains pending with reduced amount
      // We need to update the charge amount (partial payment scenario)
      const newAmount = charge.amount - remainingPayment;
      await execute(
        `UPDATE charges SET amount = $1, updated_at = NOW() WHERE id = $2`,
        [newAmount, charge.id]
      );
      remainingPayment = 0;
    }
  }
}

// Get total payments for a lease
export async function getTotalPaymentsByLease(leaseId: number): Promise<number> {
  const result = await queryOne<{ total: string }>(
    `SELECT COALESCE(SUM(amount), 0) as total FROM payments WHERE lease_id = $1`,
    [leaseId]
  );
  return parseFloat(result?.total || '0');
}