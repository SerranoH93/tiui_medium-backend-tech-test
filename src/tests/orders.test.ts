import request from 'supertest';
import { app } from '../app';
import { pool } from '../db/pool';
import { seedDatabase } from '../db/seed';
import fs from 'node:fs';
import path from 'node:path';

describe('orders API', () => {
  beforeAll(async () => {
    const migration = fs.readFileSync(path.join(__dirname, '../db/migrations/001_init.sql'), 'utf-8');
    const migration2 = fs.readFileSync(path.join(__dirname, '../db/migrations/001_init.sql'), 'utf-8');
    await pool.query(migration);
    await pool.query(migration2);
    await seedDatabase();
  });

  afterAll(async () => {
    await pool.end();
  });

  it('returns health status', async () => {
    const response = await request(app).get('/health');
    expect(response.status).toBe(200);
    expect(response.body.status).toBe('ok');
  });

  it('returns one order by id', async () => {
    const response = await request(app).get('/api/orders/1');
    expect(response.status).toBe(200);
    expect(response.body.folio).toBe('ORD-1001');
  });

  it('allows payment update', async () => {
    const response = await request(app).patch('/api/orders/1/pay').send({ amount: 100, source: 'manual' });
    expect(response.status).toBe(200);
    expect(response.body.paid_amount).toBe(100);
  });

  it('does not allow paying a cancelled order', async () => {
    const response = await request(app).patch('/api/orders/4/pay').send({ amount: 100, source: 'manual' });

    expect(response.status).toBe(400);
  });

  it('handles orders with null recipient_name', async () => {
    const response = await request(app).get('/api/orders/5');

    expect(response.status).toBe(200);
    expect(response.body.recipient_name).toBe('');
  });

  it('applies status filter correctly when combined with date filters', async () => {
    const from = new Date(Date.now() - 1.5 * 24 * 60 * 60 * 1000).toISOString();
    const to = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    const response = await request(app)
      .get('/api/orders')
      .query({ status: 'cancelled', from, to });

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body.data)).toBe(true);
    expect(response.body.data).toHaveLength(1);
    expect(response.body.data[0]).toMatchObject({ folio: 'ORD-1004', status: 'cancelled' });
  });

  it('rejects payment with zero or negative amount', async () => {
    const zeroRes = await request(app)
      .patch('/api/orders/1/pay')
      .send({ amount: 0, source: 'manual' });
    expect(zeroRes.status).toBe(400);

    const negativeRes = await request(app)
      .patch('/api/orders/1/pay')
      .send({ amount: -50, source: 'manual' });
    expect(negativeRes.status).toBe(400);
  });

  it('returns 404 when order id does not exist', async () => {
    const response = await request(app).get('/api/orders/9999');
    expect(response.status).toBe(404);
    expect(response.body.message).toBe('Order not found');
  });

  it('does not mark order as paid on partial payment', async () => {
    const response = await request(app)
      .patch('/api/orders/2/pay')
      .send({ amount: 500, source: 'manual' });

    expect(response.status).toBe(200);
    expect(response.body.paid_amount).toBe(500);
    expect(response.body.status).not.toBe('paid');
    expect(response.body.status).toBe('in_route');
  });

  it('marks order as paid when payment completes the total', async () => {
    const response = await request(app)
      .patch('/api/orders/1/pay')
      .send({ amount: 500, source: 'manual' });

    expect(response.status).toBe(200);
    expect(response.body.status).toBe('paid');
    expect(response.body.paid_amount).toBe(600);

    const audit = await pool.query(
      `SELECT * FROM audit_logs WHERE order_id = 1 AND new_status = 'paid' AND source = 'manual'`
    );
    expect(audit.rows.length).toBeGreaterThan(0);
    expect(audit.rows[0].previous_status).toBe('pending');
  });
});
