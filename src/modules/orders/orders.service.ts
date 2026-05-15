import { createAuditLog } from '../audit/audit.repository';
import { getOrderById, listOrders, updateOrderPayment } from './orders.repository';

export class OrderPaymentError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
    Object.setPrototypeOf(this, OrderPaymentError.prototype);
  }
}

export async function listOrdersService(filters: {
  status?: string;
  from?: string;
  to?: string;
  page: number;
  limit: number;
}) {
  return listOrders(filters);
}

export async function getOrderByIdService(id: number) {
  return getOrderById(id);
}

export async function payOrderService(id: number, amount: number, source: string) {
  const order = await getOrderById(id);

  if (!order) {
    return null;
  }

    if (order.status === 'paid' || order.status === 'cancelled') {
    throw new OrderPaymentError(`Order is already ${order.status}`);
  }

  const nextPaidAmount = order.paid_amount + amount;
  const shouldMarkAsPaid = nextPaidAmount >= order.total_amount;
  const nextStatus = shouldMarkAsPaid ? 'paid' : undefined;

  const updatedOrder = await updateOrderPayment(id, amount, nextStatus);

  if (nextStatus === 'paid') {
    await createAuditLog({
      orderId: order.id,
      previousStatus: order.status,
      newStatus: 'paid',
      source,
    });
  }

  return updatedOrder;
}