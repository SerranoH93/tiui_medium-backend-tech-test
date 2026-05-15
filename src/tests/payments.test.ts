import fs from 'node:fs';
import path from 'node:path';
import request from 'supertest';
import { app } from '../app';
import { pool } from '../db/pool';
import { seedDatabase } from '../db/seed';

describe('payments API', () => {
  beforeAll(async () => {
    const migration = fs.readFileSync(path.join(__dirname, '../db/migrations/001_init.sql'), 'utf-8');
    await pool.query(migration);
    await seedDatabase();
  });

  afterAll(async () => {
    await pool.end();
  });

  it('accepts paycash webhook', async () => {
    const response = await request(app).post('/api/webhooks/paycash').send({
      eventId: 'evt-100-new',
      folio: 'ORD-1002',
      amount: 200,
      paidAt: new Date().toISOString(),
    });

    expect(response.status).toBe(202);
    expect(response.body.applied).toBe(true);
  });

  it.todo('does not process the same webhook event twice');
  it.todo('does not apply payment to cancelled orders from webhook');
});
