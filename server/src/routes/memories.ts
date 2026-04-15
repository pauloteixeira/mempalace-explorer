import { Router, Request, Response } from 'express';
import { getProvider } from '../providers/factory';
import { drawerCache } from '../cache';
import { isHiddenWing } from '../wing-filter';
import prisma from '../db';
import type { Drawer } from '../types';

const router = Router();

async function getCachedDrawer(id: string): Promise<Drawer> {
  const cached = drawerCache.get(id);
  if (cached) return cached as unknown as Drawer;

  const provider = await getProvider();
  const drawer = await provider.getDrawer(id);
  drawerCache.set(id, drawer as unknown as Record<string, unknown>);
  return drawer;
}

router.get('/', async (req: Request, res: Response) => {
  try {
    const wing = req.query.wing as string | undefined;
    const room = req.query.room as string | undefined;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = parseInt(req.query.offset as string) || 0;

    if (wing && isHiddenWing(wing)) {
      res.json({ drawers: [], count: 0, offset, limit });
      return;
    }

    const provider = await getProvider();
    const result = await provider.listDrawers(wing, room, limit, offset);

    const visible = result.drawers.filter(d => !isHiddenWing(d.wing));

    const enriched = visible.map(d => {
      const cached = drawerCache.get(d.drawer_id) as unknown as Drawer | undefined;
      if (cached?.metadata && !d.metadata?.filed_at) {
        return { ...d, metadata: { ...d.metadata, ...cached.metadata } };
      }
      return d;
    });

    res.json({ ...result, drawers: enriched });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

router.post('/batch', async (req: Request, res: Response) => {
  try {
    const { ids } = req.body as { ids: string[] };
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      res.status(400).json({ error: 'ids array is required' });
      return;
    }

    const capped = ids.slice(0, 100);
    const results = await Promise.all(
      capped.map(async (id) => {
        try {
          return await getCachedDrawer(id);
        } catch {
          return null;
        }
      }),
    );

    res.json({ drawers: results.filter(Boolean) });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

router.get('/favorites', async (req: Request, res: Response) => {
  try {
    const wing = req.query.wing as string | undefined;
    const where = wing ? { wing } : {};
    const favorites = await prisma.favorite.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
    res.json({ favorites });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

router.post('/favorites/:drawerId', async (req: Request, res: Response) => {
  try {
    const drawerId = req.params.drawerId as string;
    const { wing, room, label } = req.body as { wing: string; room: string; label?: string };

    const fav = await prisma.favorite.upsert({
      where: { drawerId },
      update: { label },
      create: { drawerId, wing, room, label },
    });
    res.json(fav);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

router.delete('/favorites/:drawerId', async (req: Request, res: Response) => {
  try {
    const drawerId = req.params.drawerId as string;
    await prisma.favorite.deleteMany({ where: { drawerId } });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const drawer = await getCachedDrawer(id);

    const fav = await prisma.favorite.findUnique({
      where: { drawerId: id },
    });

    res.json({ ...drawer, isFavorite: !!fav });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

router.post('/', async (req: Request, res: Response) => {
  try {
    const { wing, room, content, source_file, added_by } = req.body;
    const provider = await getProvider();
    const drawer = await provider.addDrawer({ wing, room, content, source_file, added_by });
    drawerCache.set(drawer.drawer_id, drawer as unknown as Record<string, unknown>);
    res.status(201).json(drawer);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

router.put('/:id', async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const { content, wing, room } = req.body;
    const provider = await getProvider();
    const drawer = await provider.updateDrawer(id, { content, wing, room });
    drawerCache.set(id, drawer as unknown as Record<string, unknown>);
    res.json(drawer);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const provider = await getProvider();
    await provider.deleteDrawer(id);
    drawerCache.clear();
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

export default router;
