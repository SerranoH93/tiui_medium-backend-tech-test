import { pool } from '../../db/pool';

interface PaymentWebhookLog {
  provider_event_id: string; 
  folio: string;
  amount: number;  
}

export async function insertPaymentWebhookLog(payload: PaymentWebhookLog) {
  const insertResult = await pool.query(
    `INSERT INTO payment_webhook_logs (provider, provider_event_id, folio, amount, payload)
    VALUES ($1, $2, $3, $4, $5::jsonb) 
    ON CONFLICT (provider, provider_event_id)
    DO NOTHING
    RETURNING provider_event_id`,
    ['paycash', payload.provider_event_id, payload.folio, payload.amount, JSON.stringify(payload)]
  );
  return insertResult.rows[0]?.provider_event_id;
}