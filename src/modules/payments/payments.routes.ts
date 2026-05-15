import { Router } from 'express';
import { z } from 'zod';
import { processPaycashWebhook } from './payments.service';

const router = Router();

const paycashSchema = z.object({
  eventId: z.string().min(1),
  folio: z.string().min(1),
  amount: z.number().positive(),
  paidAt: z.string().datetime(),
});

router.post('/paycash', async (req, res, next) => {
  try {
    const payload = paycashSchema.parse(req.body);
    const result = await processPaycashWebhook(payload);
    return res.status(202).json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Invalid payload', issues: error.issues });
    }

    return next(error);
  }
});

export default router;
