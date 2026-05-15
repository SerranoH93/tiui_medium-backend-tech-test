import fs from 'node:fs';
import path from 'node:path';
import request from 'supertest';
import { app } from '../app';
import { pool } from '../db/pool';
import { seedDatabase } from '../db/seed';

describe('reports API', () => {
  beforeAll(async () => {
    const migration = fs.readFileSync(path.join(__dirname, '../db/migrations/001_init.sql'), 'utf-8');
    await pool.query(migration);
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

  it.todo('does not include cancelled orders in daily cash report');
  it.todo('returns the expected total cash for a known seeded date');
});
