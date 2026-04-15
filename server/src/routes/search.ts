import { Router, Request, Response } from 'express';
import { getProvider } from '../providers/factory';
import prisma from '../db';

const router = Router();

router.get('/', async (req: Request, res: Response) => {
  try {
    const q = req.query.q as string;
    if (!q || !q.trim()) {
      res.status(400).json({ error: 'Query parameter "q" is required' });
      return;
    }

    const limit = parseInt(req.query.limit as string) || 10;
    const wing = req.query.wing as string | undefined;
    const room = req.query.room as string | undefined;
    const maxDist = req.query.max_distance ? parseFloat(req.query.max_distance as string) : undefined;

    const provider = await getProvider();
    const result = await provider.search(q, {
      limit,
      wing,
      room,
      max_distance: maxDist,
    });

    await prisma.queryHistory.create({
      data: { query: q, resultCt: result.results.length },
    });

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

export default router;
