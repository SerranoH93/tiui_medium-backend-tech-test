import request from 'supertest';
import { app } from '../app';
import { pool } from '../db/pool';
import { seedDatabase } from '../db/seed';
import fs from 'node:fs';
import path from 'node:path';

describe('orders API', () => {
  beforeAll(async () => {
    const migration = fs.readFileSync(path.join(__dirname, '../db/migrations/001_init.sql'), 'utf-8');
    await pool.query(migration);
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

  it.todo('does not allow paying a cancelled order');
  it.todo('handles orders with null recipient_name');
  it.todo('applies status filter correctly when combined with date filters');
});
