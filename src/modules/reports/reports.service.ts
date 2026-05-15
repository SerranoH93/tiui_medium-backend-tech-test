import { pool } from '../../db/pool';

export async function getDailyCashReport(date: string) {
  const result = await pool.query(
    `SELECT COALESCE(SUM(paid_amount), 0) AS total_cash
     FROM orders
     WHERE status IN ('paid', 'cancelled')
       AND DATE(created_at) = $1`,
    [date]
  );

  return {
    date,
    totalCash: Number(result.rows[0].total_cash),
  };
}
