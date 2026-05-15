import { Router } from 'express';
import { z } from 'zod';
import { getDailyCashReport } from './reports.service';

const router = Router();

router.get('/daily-cash', async (req, res, next) => {
  try {
    const schema = z.object({ date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) });
    const { date } = schema.parse(req.query);
    const report = await getDailyCashReport(date);
    return res.json(report);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Invalid query', issues: error.issues });
    }

    return next(error);
  }
});

export default router;
