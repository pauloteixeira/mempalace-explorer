import { Router, Request, Response } from 'express';
import { getProvider } from '../providers/factory';
import { isHiddenWing } from '../wing-filter';
import type { RawTaxonomy } from '../types';

const router = Router();

function filterTaxonomy(taxonomy: RawTaxonomy): RawTaxonomy {
  const filtered: RawTaxonomy = {};
  for (const [wing, rooms] of Object.entries(taxonomy)) {
    if (!isHiddenWing(wing)) filtered[wing] = rooms;
  }
  return filtered;
}

router.get('/', async (_req: Request, res: Response) => {
  try {
    const provider = await getProvider();
    const taxonomy = await provider.getTaxonomy();
    res.json({ taxonomy: filterTaxonomy(taxonomy) });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

router.get('/wings', async (_req: Request, res: Response) => {
  try {
    const provider = await getProvider();
    const wings = await provider.listWings();
    res.json({ wings: wings.filter(w => !isHiddenWing(w.name)) });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

router.get('/rooms', async (req: Request, res: Response) => {
  try {
    const wing = req.query.wing as string | undefined;
    if (wing && isHiddenWing(wing)) {
      res.json({ rooms: [] });
      return;
    }
    const provider = await getProvider();
    const rooms = await provider.listRooms(wing);
    res.json({ rooms: rooms.filter(r => !isHiddenWing(r.wing)) });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

export default router;
