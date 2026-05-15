import { pool } from '../../db/pool';
import { createAuditLog } from '../audit/audit.repository';
import { getOrderByFolio, updateOrderPayment } from '../orders/orders.repository';

export async function processPaycashWebhook(payload: {
  eventId: string;
  folio: string;
  amount: number;
  paidAt: string;
}) {
  await pool.query(
    `INSERT INTO payment_webhook_logs (provider, provider_event_id, folio, amount, payload)
     VALUES ($1, $2, $3, $4, $5::jsonb)`,
    ['paycash', payload.eventId, payload.folio, payload.amount, JSON.stringify(payload)]
  );

  const order = await getOrderByFolio(payload.folio);
  if (!order) {
    return { applied: false, reason: 'Order not found' };
  }

  const nextPaidAmount = order.paid_amount + payload.amount;
  const nextStatus = nextPaidAmount >= order.total_amount ? 'paid' : undefined;
  const updatedOrder = await updateOrderPayment(order.id, payload.amount, nextStatus);

  if (nextStatus === 'paid') {
    await createAuditLog({
      orderId: order.id,
      previousStatus: order.status,
      newStatus: 'paid',
      source: 'webhook',
      externalReference: payload.eventId,
    });
  }

  return { applied: true, order: updatedOrder };
}
