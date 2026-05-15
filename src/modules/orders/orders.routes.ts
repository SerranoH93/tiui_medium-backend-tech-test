import { Router } from 'express';
import { z } from 'zod';
import { getOrderByIdService, listOrdersService, payOrderService } from './orders.service';

const router = Router();

const listQuerySchema = z.object({
  status: z.enum(['pending', 'in_route', 'delivered', 'cancelled', 'paid']).optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
});

const paySchema = z.object({
  amount: z.number().positive(),
  source: z.literal('manual'),
});

router.get('/', async (req, res, next) => {
  try {
    const query = listQuerySchema.parse(req.query);
    const orders = await listOrdersService(query);
    res.json({ data: orders });
  } catch (error) {
    next(error);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const order = await getOrderByIdService(id);

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    return res.json(order);
  } catch (error) {
    return next(error);
  }
});

router.patch('/:id/pay', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const body = paySchema.parse(req.body);
    const order = await payOrderService(id, body.amount, body.source);

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    return res.json(order);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Invalid payload', issues: error.issues });
    }

    return next(error);
  }
});

export default router;
