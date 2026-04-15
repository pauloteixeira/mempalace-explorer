<template>
  <div ref="containerRef" class="w-full h-full relative">
    <svg ref="svgRef" class="w-full h-full" />

    <div
      v-if="nodes.length === 0 && !loading"
      class="absolute inset-0 flex items-center justify-center text-gray-500 text-sm pointer-events-none"
    >
      Select a room from the sidebar to visualize connections
    </div>

    <div
      v-if="hoveredNode"
      class="absolute px-3 py-2 rounded-lg bg-surface-800 border border-surface-700 text-xs shadow-lg pointer-events-none z-10"
      :style="{ left: tooltipPos.x + 'px', top: tooltipPos.y + 'px' }"
    >
      <div class="font-medium text-gray-200">{{ hoveredNode.label }}</div>
      <div class="text-gray-500">{{ hoveredNode.wing }} / {{ hoveredNode.room }}</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted, nextTick } from 'vue';
import * as d3 from 'd3';
import type { GraphNode, GraphEdge } from '@/types';

interface SimNode extends GraphNode, d3.SimulationNodeDatum {}
interface SimEdge extends d3.SimulationLinkDatum<SimNode> {
  weight?: number;
}

const props = defineProps<{
  nodes: GraphNode[];
  edges: GraphEdge[];
  loading?: boolean;
}>();

const emit = defineEmits<{
  nodeClick: [node: GraphNode];
}>();

const svgRef = ref<SVGSVGElement | null>(null);
const containerRef = ref<HTMLDivElement | null>(null);
const hoveredNode = ref<GraphNode | null>(null);
const tooltipPos = ref({ x: 0, y: 0 });

let simulation: d3.Simulation<SimNode, SimEdge> | null = null;
let resizeObserver: ResizeObserver | null = null;

const wingColors: Record<string, string> = {};
const palette = ['#c084fc', '#60a5fa', '#34d399', '#fbbf24', '#f87171', '#a78bfa', '#2dd4bf', '#fb923c'];
let colorIndex = 0;

function getWingColor(wing: string): string {
  if (!wingColors[wing]) {
    wingColors[wing] = palette[colorIndex % palette.length];
    colorIndex++;
  }
  return wingColors[wing];
}

function render() {
  if (!svgRef.value || !containerRef.value) return;

  const svg = d3.select(svgRef.value);
  svg.selectAll('*').remove();

  const rect = containerRef.value.getBoundingClientRect();
  const width = rect.width;
  const height = rect.height;

  svg.attr('viewBox', `0 0 ${width} ${height}`);

  const g = svg.append('g');

  const zoom = d3.zoom<SVGSVGElement, unknown>()
    .scaleExtent([0.2, 5])
    .on('zoom', (event) => {
      g.attr('transform', event.transform);
    });

  svg.call(zoom);

  const simNodes: SimNode[] = props.nodes.map(n => ({ ...n }));
  const simEdges: SimEdge[] = props.edges.map(e => ({
    source: e.source,
    target: e.target,
    weight: e.weight,
  }));

  simulation = d3.forceSimulation<SimNode>(simNodes)
    .force('link', d3.forceLink<SimNode, SimEdge>(simEdges).id(d => d.id).distance(120))
    .force('charge', d3.forceManyBody().strength(-300))
    .force('center', d3.forceCenter(width / 2, height / 2))
    .force('collision', d3.forceCollide().radius(30));

  const link = g.append('g')
    .selectAll('line')
    .data(simEdges)
    .join('line')
    .attr('stroke', '#334155')
    .attr('stroke-width', 1.5)
    .attr('stroke-opacity', 0.6);

  let clickStart: { x: number; y: number; time: number } | null = null;

  const node = g.append('g')
    .selectAll<SVGGElement, SimNode>('g')
    .data(simNodes)
    .join('g')
    .attr('cursor', 'pointer')
    .call(d3.drag<SVGGElement, SimNode>()
      .on('start', (event, d) => {
        if (!event.active) simulation?.alphaTarget(0.3).restart();
        d.fx = d.x;
        d.fy = d.y;
      })
      .on('drag', (event, d) => {
        d.fx = event.x;
        d.fy = event.y;
      })
      .on('end', (event, d) => {
        if (!event.active) simulation?.alphaTarget(0);
        d.fx = null;
        d.fy = null;
      }),
    );

  node.on('pointerdown', (event) => {
    clickStart = { x: event.clientX, y: event.clientY, time: Date.now() };
  });

  node.on('pointerup', (event, d) => {
    if (!clickStart) return;
    const dist = Math.hypot(event.clientX - clickStart.x, event.clientY - clickStart.y);
    const elapsed = Date.now() - clickStart.time;
    clickStart = null;
    if (dist < 8 && elapsed < 500) {
      emit('nodeClick', d);
    }
  });

  node.append('circle')
    .attr('r', 12)
    .attr('fill', d => getWingColor(d.wing))
    .attr('fill-opacity', 0.8)
    .attr('stroke', d => getWingColor(d.wing))
    .attr('stroke-width', 2)
    .attr('stroke-opacity', 0.3);

  node.append('text')
    .text(d => d.label.length > 16 ? d.label.slice(0, 14) + '...' : d.label)
    .attr('x', 18)
    .attr('y', 4)
    .attr('fill', '#94a3b8')
    .attr('font-size', '11px');

  node.on('mouseenter', (event, d) => {
    hoveredNode.value = d;
    const containerRect = containerRef.value!.getBoundingClientRect();
    tooltipPos.value = {
      x: event.clientX - containerRect.left + 12,
      y: event.clientY - containerRect.top - 10,
    };
  });

  node.on('mouseleave', () => {
    hoveredNode.value = null;
  });

  simulation.on('tick', () => {
    link
      .attr('x1', d => (d.source as SimNode).x!)
      .attr('y1', d => (d.source as SimNode).y!)
      .attr('x2', d => (d.target as SimNode).x!)
      .attr('y2', d => (d.target as SimNode).y!);

    node.attr('transform', d => `translate(${d.x},${d.y})`);
  });
}

watch(() => [props.nodes, props.edges], () => {
  nextTick(() => render());
}, { deep: true });

onMounted(() => {
  nextTick(() => render());

  resizeObserver = new ResizeObserver(() => {
    render();
  });
  if (containerRef.value) {
    resizeObserver.observe(containerRef.value);
  }
});

onUnmounted(() => {
  simulation?.stop();
  resizeObserver?.disconnect();
});
</script>
