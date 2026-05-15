import fs from 'node:fs';
import path from 'node:path';
import { pool } from './pool';

async function migrate(): Promise<void> {
  const sqlPath = path.join(__dirname, 'migrations', '001_init.sql');
  const sql = fs.readFileSync(sqlPath, 'utf-8');
  await pool.query(sql);

  const sqlPath2 = path.join(__dirname, 'migrations', '002_idempotency.sql');
  const sql2 = fs.readFileSync(sqlPath2, 'utf-8');
  await pool.query(sql2);
  console.log('Database migrated');
}

migrate()
  .catch((error) => {
    console.error('Migration failed', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
