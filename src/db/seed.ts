import { pool } from './pool';

export async function seedDatabase(): Promise<void> {
  await pool.query('TRUNCATE TABLE audit_logs, payment_webhook_logs, orders RESTART IDENTITY CASCADE');

  await pool.query(
    `INSERT INTO orders (folio, recipient_name, status, total_amount, paid_amount, incident_reported, created_at, updated_at)
     VALUES
      ('ORD-1001', 'Ana Torres', 'pending', 500, 0, false, now() - interval '3 day', now() - interval '3 day'),
      ('ORD-1002', 'Luis Pérez', 'in_route', 1200, 0, false, now() - interval '2 day', now() - interval '2 day'),
      ('ORD-1003', 'María Gómez', 'delivered', 850, 400, false, now() - interval '2 day', now() - interval '2 day'),
      ('ORD-1004', 'Carlos Díaz', 'cancelled', 300, 0, true, now() - interval '1 day', now() - interval '1 day'),
      ('ORD-1005', NULL, 'pending', 650, 0, false, now() - interval '1 day', now() - interval '1 day'),
      ('ORD-1006', 'Laura Ruiz', 'paid', 950, 950, false, now() - interval '1 day', now() - interval '1 day'),
      ('ORD-1007', 'Jorge Ríos', 'in_route', 430, 0, false, now(), now()),
      ('ORD-1008', 'Paula León', 'delivered', 710, 710, false, now(), now())`
  );

  await pool.query(
    `INSERT INTO payment_webhook_logs (provider, provider_event_id, folio, amount, payload)
     VALUES
      ('paycash', 'evt-dup-001', 'ORD-1003', 200, '{"eventId":"evt-dup-001","folio":"ORD-1003","amount":200}'::jsonb),
      ('paycash', 'evt-dup-001', 'ORD-1003', 200, '{"eventId":"evt-dup-001","folio":"ORD-1003","amount":200}'::jsonb)`
  );

  await pool.query(
    `INSERT INTO audit_logs (order_id, previous_status, new_status, source, external_reference)
     SELECT id, 'delivered', 'paid', 'seed', 'seed-init-paid' FROM orders WHERE folio='ORD-1008'`
  );
}

if (require.main === module) {
  seedDatabase()
    .then(() => {
      console.log('Database seeded');
    })
    .catch((error) => {
      console.error('Seed failed', error);
      process.exitCode = 1;
    })
    .finally(async () => {
      await pool.end();
    });
}
