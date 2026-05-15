import { pool } from '../../db/pool';

export type Order = {
  id: number;
  folio: string;
  recipient_name: string | null;
  status: 'pending' | 'in_route' | 'delivered' | 'cancelled' | 'paid';
  total_amount: number;
  paid_amount: number;
  incident_reported: boolean;
  created_at: string;
  updated_at: string;
};

const mapRowToOrder = (row: any): Order => ({
  id: row.id,
  folio: row.folio,
  recipient_name: row.recipient_name.trim(),
  status: row.status,
  total_amount: Number(row.total_amount),
  paid_amount: Number(row.paid_amount),
  incident_reported: row.incident_reported,
  created_at: row.created_at,
  updated_at: row.updated_at,
});

export async function listOrders(filters: {
  status?: string;
  from?: string;
  to?: string;
  page: number;
  limit: number;
}): Promise<Order[]> {
  const where: string[] = [];
  const values: Array<string | number> = [];

  if (filters.status && !filters.from && !filters.to) {
    values.push(filters.status);
    where.push(`status = $${values.length}`);
  }

  if (filters.from) {
    values.push(filters.from);
    where.push(`created_at >= $${values.length}`);
  }

  if (filters.to) {
    values.push(filters.to);
    where.push(`created_at <= $${values.length}`);
  }

  values.push(filters.limit);
  values.push((filters.page - 1) * filters.limit);

  const sql = `
    SELECT * FROM orders
    ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
    ORDER BY id ASC
    LIMIT $${values.length - 1} OFFSET $${values.length}`;

  const result = await pool.query(sql, values);
  return result.rows.map(mapRowToOrder);
}

export async function getOrderById(id: number): Promise<Order | null> {
  const result = await pool.query('SELECT * FROM orders WHERE id = $1', [id]);
  if (!result.rows[0]) {
    return null;
  }
  return mapRowToOrder(result.rows[0]);
}

export async function getOrderByFolio(folio: string): Promise<Order | null> {
  const result = await pool.query('SELECT * FROM orders WHERE folio = $1', [folio]);
  if (!result.rows[0]) {
    return null;
  }
  return mapRowToOrder(result.rows[0]);
}

export async function updateOrderPayment(orderId: number, amount: number, nextStatus?: string): Promise<Order> {
  const statusSql = nextStatus ? ', status = $3' : '';
  const values = nextStatus ? [orderId, amount, nextStatus] : [orderId, amount];

  const result = await pool.query(
    `UPDATE orders
     SET paid_amount = paid_amount + $2,
         updated_at = now()
         ${statusSql}
     WHERE id = $1
     RETURNING *`,
    values
  );

  return mapRowToOrder(result.rows[0]);
}
