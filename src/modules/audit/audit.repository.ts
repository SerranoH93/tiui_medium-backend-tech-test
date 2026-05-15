import { pool } from '../../db/pool';

export async function createAuditLog(input: {
  orderId: number;
  previousStatus: string | null;
  newStatus: string;
  source: string;
  externalReference?: string;
}): Promise<void> {
  await pool.query(
    `INSERT INTO audit_logs (order_id, previous_status, new_status, source, external_reference)
     VALUES ($1, $2, $3, $4, $5)`,
    [input.orderId, input.previousStatus, input.newStatus, input.source, input.externalReference ?? null]
  );
}
