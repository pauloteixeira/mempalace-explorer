import { Router, Request, Response } from 'express';
import { getProvider } from '../providers/factory';
import { isHiddenWing } from '../wing-filter';
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

    // Reject searches explicitly scoped to a hidden wing
    if (wing && isHiddenWing(wing)) {
      res.json({ ...{ query: q, filters: { wing: wing ?? null, room: room ?? null }, total_before_filter: 0 }, results: [] });
      return;
    }

    const provider = await getProvider();
    const result = await provider.search(q, {
      limit,
      wing,
      room,
      max_distance: maxDist,
    });

    // Filter out results from internal / auto-generated wings
    const visibleResults = result.results.filter(r => !isHiddenWing(r.wing));

    await prisma.queryHistory.create({
      data: { query: q, resultCt: visibleResults.length },
    });

    res.json({ ...result, results: visibleResults });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

export default router;
