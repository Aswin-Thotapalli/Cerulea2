// apps/frontend/src/app/api/projects/_shared/step2-layout.ts
// Reading the Data schema step's layout drafts back into their shapes.
// A draft arrives as plain data from the build state. These readers keep what
// fits the shape and drop the rest, so a damaged draft never breaks a screen.
// Without them each route would check the layout its own way.

import type {
  Drawing,
  DrawingEdge,
  DrawingNode,
  LogicLayout,
  Point,
  SchemaLayout,
} from '@/components/studio/steps/step2-types';

/** Reads the schema layout out of its draft. */
export function schemaLayoutOf(value: unknown): SchemaLayout {
  const held = value && typeof value === 'object' ? (value as Partial<SchemaLayout>) : {};
  return {
    placement: cleanRecord(held.placement, (entry) => (typeof entry === 'string' ? entry : null)),
    positions: cleanRecord(held.positions, (entry) => {
      const point = entry as { x?: unknown; y?: unknown } | null;
      return point && typeof point.x === 'number' && typeof point.y === 'number'
        ? { x: point.x, y: point.y }
        : null;
    }),
  };
}

function cleanRecord<T>(value: unknown, read: (entry: unknown) => T | null): Record<string, T> {
  const out: Record<string, T> = {};
  if (!value || typeof value !== 'object' || Array.isArray(value)) return out;
  for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
    if (key.length === 0 || key.length > 160) continue;
    const held = read(entry);
    if (held !== null) out[key] = held;
  }
  return out;
}

/** The most drawings, blocks and lines one project keeps. */
const DRAWING_LIMIT = 200;
const NODE_LIMIT = 400;

function text(value: unknown, limit = 160): string | null {
  return typeof value === 'string' && value.length > 0 && value.length <= limit ? value : null;
}

function point(value: unknown): Point | null {
  const held = value as { x?: unknown; y?: unknown } | null;
  return held && typeof held.x === 'number' && typeof held.y === 'number'
    ? { x: held.x, y: held.y }
    : null;
}

function nodeOf(value: unknown): DrawingNode | null {
  const held = value as Partial<DrawingNode> | null;
  const id = text(held?.id);
  const blockId = text(held?.blockId);
  const position = point(held?.position);
  if (!id || !blockId || !position) return null;
  const props =
    held?.props && typeof held.props === 'object' && !Array.isArray(held.props)
      ? (held.props as Record<string, unknown>)
      : {};
  return { id, blockId, position, props };
}

function edgeOf(value: unknown): DrawingEdge | null {
  const held = value as Partial<DrawingEdge> | null;
  const id = text(held?.id);
  const source = text(held?.source);
  const target = text(held?.target);
  if (!id || !source || !target) return null;
  return {
    id,
    source,
    sourcePort: text(held?.sourcePort) ?? 'next',
    target,
    targetPort: text(held?.targetPort) ?? 'in',
    condition: text(held?.condition, 400) ?? undefined,
  };
}

function drawingOf(value: unknown): Drawing | null {
  const held = value as Partial<Drawing> | null;
  const id = text(held?.id);
  const name = text(held?.name);
  if (!id || !name) return null;
  const nodes = (Array.isArray(held?.nodes) ? held.nodes : [])
    .map(nodeOf)
    .filter((entry): entry is DrawingNode => entry !== null)
    .slice(0, NODE_LIMIT);
  const edges = (Array.isArray(held?.edges) ? held.edges : [])
    .map(edgeOf)
    .filter((entry): entry is DrawingEdge => entry !== null)
    .slice(0, NODE_LIMIT * 2);
  const roles = (Array.isArray(held?.roles) ? held.roles : []).filter(
    (entry): entry is string => typeof entry === 'string' && entry.length > 0,
  );
  return { id, name, moduleId: text(held?.moduleId) ?? undefined, roles, nodes, edges };
}

/** Reads the layout out of the draft, dropping anything outside its shape. */
export function logicLayoutOf(value: unknown): LogicLayout {
  const held = value && typeof value === 'object' ? (value as Partial<LogicLayout>) : {};
  const drawings: Record<string, Drawing> = {};
  if (held.drawings && typeof held.drawings === 'object' && !Array.isArray(held.drawings)) {
    for (const [key, entry] of Object.entries(held.drawings).slice(0, DRAWING_LIMIT)) {
      const drawing = drawingOf(entry);
      if (drawing && key === drawing.id) drawings[key] = drawing;
    }
  }
  const workflowPositions: Record<string, Record<string, Point>> = {};
  if (
    held.workflowPositions &&
    typeof held.workflowPositions === 'object' &&
    !Array.isArray(held.workflowPositions)
  ) {
    for (const [workflowId, states] of Object.entries(held.workflowPositions)) {
      if (!states || typeof states !== 'object' || Array.isArray(states)) continue;
      const cleaned: Record<string, Point> = {};
      for (const [stateId, place] of Object.entries(states as Record<string, unknown>)) {
        const held = point(place);
        if (held) cleaned[stateId] = held;
      }
      workflowPositions[workflowId] = cleaned;
    }
  }
  return { drawings, workflowPositions };
}

