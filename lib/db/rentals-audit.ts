import { executeReturning, queryMany } from './index';

export interface AuditEvent {
  id: number;
  user_id: number;
  event_type: 'lease_status_change' | 'rent_amount_edit' | 'payment_adjustment';
  entity_type: 'lease' | 'charge' | 'payment';
  entity_id: number;
  old_value: Record<string, unknown> | null;
  new_value: Record<string, unknown> | null;
  created_at: string;
}

export interface AuditEventFilters {
  eventType?: string;
  startDate?: string;
  endDate?: string;
}

export interface AuditEventWithUser extends AuditEvent {
  user_email: string;
}

export interface PaginatedAuditEvents {
  events: AuditEventWithUser[];
  total: number;
}

export async function getAuditEvents(
  filters: AuditEventFilters,
  page: number = 1,
  pageSize: number = 20
): Promise<PaginatedAuditEvents> {
  const conditions: string[] = [];
  const values: (string | number)[] = [];
  let paramIndex = 1;

  if (filters.eventType) {
    conditions.push(`ae.event_type = $${paramIndex++}`);
    values.push(filters.eventType);
  }

  if (filters.startDate) {
    conditions.push(`ae.created_at >= $${paramIndex++}`);
    values.push(filters.startDate);
  }

  if (filters.endDate) {
    conditions.push(`ae.created_at <= $${paramIndex++}`);
    values.push(filters.endDate + ' 23:59:59');
  }

  const whereClause = conditions.length > 0
    ? `WHERE ${conditions.join(' AND ')}`
    : '';

  // Get total count
  const countResult = await queryMany<{ total: string }>(
    `SELECT COUNT(*) as total FROM audit_events ae ${whereClause}`,
    values
  );
  const total = parseInt(countResult[0]?.total || '0', 10);

  // Get paginated results with user info
  const offset = (page - 1) * pageSize;
  const queryValues = [...values, pageSize, offset];

  const events = await queryMany<AuditEventWithUser>(
    `SELECT 
      ae.id,
      ae.user_id,
      ae.event_type,
      ae.entity_type,
      ae.entity_id,
      ae.old_value,
      ae.new_value,
      ae.created_at,
      COALESCE(u.username, 'System') as user_email
    FROM audit_events ae
    LEFT JOIN users u ON ae.user_id = u.id
    ${whereClause}
    ORDER BY ae.created_at DESC
    LIMIT $${paramIndex++} OFFSET $${paramIndex}`,
    queryValues
  );

  return { events, total };
}

export interface EmitAuditEventInput {
  userId: number;
  eventType: 'lease_status_change' | 'rent_amount_edit' | 'payment_adjustment';
  entityType: 'lease' | 'charge' | 'payment';
  entityId: number;
  oldValue?: Record<string, unknown> | null;
  newValue?: Record<string, unknown> | null;
}

export async function emitAuditEvent(input: EmitAuditEventInput): Promise<AuditEvent> {
  return executeReturning<AuditEvent>(
    `INSERT INTO audit_events (user_id, event_type, entity_type, entity_id, old_value, new_value)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [
      input.userId,
      input.eventType,
      input.entityType,
      input.entityId,
      input.oldValue ?? null,
      input.newValue ?? null,
    ]
  );
}