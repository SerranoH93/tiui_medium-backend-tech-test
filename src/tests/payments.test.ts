import fs from 'node:fs';
import path from 'node:path';
import request from 'supertest';
import { app } from '../app';
import { pool } from '../db/pool';
import { seedDatabase } from '../db/seed';

describe('payments API', () => {
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

  it('does not process the same webhook event twice', async () => {
    const payload = {
      eventId: 'evt-200-duplicate',
      folio: 'ORD-1003',
      amount: 150,
      paidAt: new Date().toISOString(),
    };

    const firstResponse = await request(app).post('/api/webhooks/paycash').send(payload);
    expect(firstResponse.status).toBe(202);
    expect(firstResponse.body.applied).toBe(true);

    const secondResponse = await request(app).post('/api/webhooks/paycash').send(payload);
    expect(secondResponse.status).toBe(202);
    expect(secondResponse.body.applied).toBe(false);
    expect(secondResponse.body.reason).toBe('Duplicate event');
  });

  it('does not apply payment to cancelled orders from webhook', async () => {
    const response = await request(app).post('/api/webhooks/paycash').send({
      eventId: 'evt-300-cancelled',
      folio: 'ORD-1004',
      amount: 100,
      paidAt: new Date().toISOString(),
    });

    expect(response.status).toBe(202);
    expect(response.body.applied).toBe(false);
    expect(response.body.reason).toBe('Order already paid cancelled');
  });

  it('rejects webhook with invalid paidAt format', async () => {
    const invalidDates = [
      '14-05-2026',          
      '2026/05/14',          
      '2026-05-14',          
      'not-a-date',          
      '',                    
    ];

    for (const paidAt of invalidDates) {
      const response = await request(app).post('/api/webhooks/paycash').send({
        eventId: `evt-invalid-date-${paidAt}`,
        folio: 'ORD-1001',
        amount: 100,
        paidAt,
      });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('Invalid payload');
    }
  });
});
