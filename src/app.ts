import express from 'express';
import ordersRoutes from './modules/orders/orders.routes';
import paymentsRoutes from './modules/payments/payments.routes';
import reportsRoutes from './modules/reports/reports.routes';

export const app = express();

app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api/orders', ordersRoutes);
app.use('/api/webhooks', paymentsRoutes);
app.use('/api/reports', reportsRoutes);

app.use((error: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  return res.status(500).json({
    message: 'Internal server error',
    error: error?.message ?? 'Unknown error',
  });
});
