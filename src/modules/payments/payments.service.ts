import { pool } from '../../db/pool';
import { createAuditLog } from '../audit/audit.repository';
import { getOrderByFolio, updateOrderPayment } from '../orders/orders.repository';
import { insertPaymentWebhookLog } from './payments.repository';

export async function processPaycashWebhook(payload: {
  eventId: string;
  folio: string;
  amount: number;
  paidAt: string;
}) {
    const logResult = await insertPaymentWebhookLog({
    provider_event_id: payload.eventId,
    folio: payload.folio,
    amount: payload.amount,
  });
  
  if ( !logResult) {
    return { applied: false, reason: 'Duplicate event' };
  }

  const order = await getOrderByFolio(payload.folio);
  if (!order) {
    return { applied: false, reason: 'Order not found' };
  }

    if (order.status === 'paid'|| order.status === 'cancelled') {
    return { applied: false, reason: `Order already paid ${order.status}`};
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