import { Router, Request, Response } from 'express';
import { getProvider } from '../providers/factory';
import type { GraphData, GraphNode, GraphEdge } from '../types';

const router = Router();

router.get('/query', async (req: Request, res: Response) => {
  try {
    const entity = req.query.entity as string;
    if (!entity) {
      res.status(400).json({ error: 'Query parameter "entity" is required' });
      return;
    }
    const direction = (req.query.direction as string) || 'both';
    const asOf = req.query.as_of as string | undefined;

    const provider = await getProvider();
    const facts = await provider.kgQuery(entity, direction, asOf);
    res.json({ entity, facts });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

router.get('/traverse', async (req: Request, res: Response) => {
  try {
    const room = req.query.room as string;
    if (!room) {
      res.status(400).json({ error: 'Query parameter "room" is required' });
      return;
    }
    const maxHops = parseInt(req.query.maxHops as string) || 2;

    const provider = await getProvider();

    let graph: GraphData = { nodes: [], edges: [] };
    try {
      graph = await provider.traverse(room, maxHops);
    } catch {
      // mempalace_traverse not available or failed
    }

    if (graph.nodes.length === 0) {
      graph = await buildGraphFromTaxonomy(provider, room);
    }

    res.json(graph);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

async function buildGraphFromTaxonomy(
  provider: Awaited<ReturnType<typeof getProvider>>,
  targetRoom: string,
): Promise<GraphData> {
  const taxonomy = await provider.getTaxonomy();
  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];
  const seen = new Set<string>();

  let targetWing = '';
  for (const [wingName, rooms] of Object.entries(taxonomy)) {
    if (rooms[targetRoom] !== undefined) {
      targetWing = wingName;
      break;
    }
  }

  if (!targetWing) {
    return { nodes: [], edges: [] };
  }

  const wingNodeId = `wing:${targetWing}`;
  nodes.push({
    id: wingNodeId,
    label: targetWing,
    wing: targetWing,
    room: '',
    type: 'room',
  });
  seen.add(wingNodeId);

  const wingRooms = taxonomy[targetWing] || {};
  for (const [roomName, count] of Object.entries(wingRooms)) {
    const roomNodeId = `room:${roomName}`;
    if (!seen.has(roomNodeId)) {
      nodes.push({
        id: roomNodeId,
        label: `${roomName} (${count})`,
        wing: targetWing,
        room: roomName,
        type: 'room',
      });
      seen.add(roomNodeId);
    }
    edges.push({ source: wingNodeId, target: roomNodeId, weight: count });
  }

  const targetRoomId = `room:${targetRoom}`;
  try {
    const drawersResp = await provider.listDrawers(targetWing, targetRoom, 15, 0);
    for (const drawer of drawersResp.drawers) {
      const drawerId = `drawer:${drawer.drawer_id}`;
      const title = (drawer.content_preview || drawer.content || '').split('\n')[0].slice(0, 40);
      if (!seen.has(drawerId)) {
        nodes.push({
          id: drawerId,
          label: title || drawer.drawer_id.slice(0, 8),
          wing: targetWing,
          room: targetRoom,
          type: 'drawer',
        });
        seen.add(drawerId);
      }
      edges.push({ source: targetRoomId, target: drawerId });
    }
  } catch {
    // listing drawers failed, show only taxonomy
  }

  return { nodes, edges };
}

export default router;
