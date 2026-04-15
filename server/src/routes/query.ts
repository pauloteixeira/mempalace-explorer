import { Router, Request, Response } from 'express';
import { getProvider } from '../providers/factory';
import prisma from '../db';

const router = Router();

router.post('/', async (req: Request, res: Response) => {
  try {
    const { query } = req.body as { query: string };
    if (!query || !query.trim()) {
      res.status(400).json({ error: 'Query is required' });
      return;
    }

    const parsed = parseQuery(query);
    const provider = await getProvider();
    const limit = parsed.limit || 50;

    let results: QueryResult[] = [];

    if (parsed.type === 'search' && parsed.text) {
      try {
        const searchResp = await provider.search(parsed.text, {
          wing: parsed.wing,
          room: parsed.room,
          limit,
        });
        results = searchResp.results.map(r => ({
          drawer_id: r.drawer_id || '',
          title: r.text.split('\n')[0].slice(0, 80),
          wing: r.wing,
          room: r.room,
          content_preview: r.text.slice(0, 200),
          distance: r.distance,
        }));
      } catch {
        // semantic search failed, fall through to list-based approach
      }
    }

    if (results.length === 0) {
      const drawersResp = await provider.listDrawers(parsed.wing, parsed.room, limit, 0);
      let drawers = drawersResp.drawers;

      if (parsed.tag) {
        const tagLower = parsed.tag.toLowerCase();
        drawers = drawers.filter(d => {
          const text = (d.content_preview || d.content || '').toLowerCase();
          return text.includes(tagLower) || text.includes(`#${tagLower}`);
        });
      }

      if (parsed.text && !parsed.tag) {
        const textLower = parsed.text.toLowerCase();
        drawers = drawers.filter(d => {
          const text = (d.content_preview || d.content || '').toLowerCase();
          return text.includes(textLower);
        });
      }

      results = drawers.map(d => ({
        drawer_id: d.drawer_id,
        title: (d.content_preview || d.content || '').split('\n')[0].slice(0, 80),
        wing: d.wing,
        room: d.room,
        content_preview: d.content_preview || (d.content || '').slice(0, 200),
      }));
    }

    await prisma.queryHistory.create({
      data: { query, resultCt: results.length },
    });

    res.json({ query, parsed, results, count: results.length });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

router.get('/history', async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 20;
    const history = await prisma.queryHistory.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
    res.json({ history });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

interface ParsedQuery {
  type: 'list' | 'search';
  wing?: string;
  room?: string;
  tag?: string;
  text?: string;
  dateFrom?: string;
  limit?: number;
}

interface QueryResult {
  drawer_id: string;
  title: string;
  wing: string;
  room: string;
  content_preview: string;
  distance?: number;
}

function parseQuery(raw: string): ParsedQuery {
  const normalized = raw.trim();
  const result: ParsedQuery = { type: 'list' };

  const wingMatch = normalized.match(/(?:^|\s)wing\s*=\s*"([^"]+)"/i);
  if (wingMatch) result.wing = wingMatch[1];

  const roomMatch = normalized.match(/(?:^|\s)room\s*=\s*"([^"]+)"/i);
  if (roomMatch) result.room = roomMatch[1];

  const tagMatch = normalized.match(/(?:^|\s)tag\s*=\s*"([^"]+)"/i);
  if (tagMatch) {
    result.tag = tagMatch[1];
    result.type = 'search';
    result.text = tagMatch[1];
  }

  const dateMatch = normalized.match(/date\s*>\s*"([^"]+)"/i);
  if (dateMatch) result.dateFrom = dateMatch[1];

  const limitMatch = normalized.match(/LIMIT\s+(\d+)/i);
  if (limitMatch) result.limit = parseInt(limitMatch[1]);

  const textMatch = normalized.match(/(?:FIND|SEARCH)\s+(?:memories\s+)?(?:WHERE\s+)?(?:text|content)\s*=\s*"([^"]+)"/i);
  if (textMatch) {
    result.type = 'search';
    result.text = textMatch[1];
  }

  if (!result.text && normalized.match(/^(?:FIND|SEARCH)\s+/i)) {
    const cleaned = normalized
      .replace(/^(?:FIND|SEARCH)\s+memories?\s*/i, '')
      .replace(/WHERE\s+/gi, '')
      .replace(/AND\s+/gi, '')
      .replace(/wing\s*=\s*"[^"]+"/gi, '')
      .replace(/room\s*=\s*"[^"]+"/gi, '')
      .replace(/tag\s*=\s*"[^"]+"/gi, '')
      .replace(/date\s*>\s*"[^"]+"/gi, '')
      .replace(/LIMIT\s+\d+/gi, '')
      .trim();

    if (cleaned) {
      result.type = 'search';
      result.text = cleaned;
    }
  }

  return result;
}

export default router;
