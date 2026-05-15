import fs from 'node:fs';
import path from 'node:path';
import request from 'supertest';
import { app } from '../app';
import { pool } from '../db/pool';
import { seedDatabase } from '../db/seed';

describe('reports API', () => {
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

  it('returns daily cash report for valid date', async () => {
    const date = new Date().toISOString().slice(0, 10);
    const response = await request(app).get(`/api/reports/daily-cash?date=${date}`);

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('date', date);
    expect(response.body).toHaveProperty('totalCash');
  });

  it('does not include cancelled orders in daily cash report', async () => {
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const response = await request(app).get(`/api/reports/daily-cash?date=${yesterday}`);

    expect(response.status).toBe(200);
    expect(response.body.totalCash).toBe(950);
  });

  it('returns the expected total cash for a known seeded date', async () => {
    const today = new Date().toISOString().slice(0, 10);
    const response = await request(app).get(`/api/reports/daily-cash-expected?date=${today}`);

    expect(response.status).toBe(200);
    expect(response.body.date).toBe(today);
    expect(response.body.totalCash).toBe(710);
  });
});