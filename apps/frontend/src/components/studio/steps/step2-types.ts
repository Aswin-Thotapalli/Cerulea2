// apps/frontend/src/components/studio/steps/step2-types.ts
// The shapes the Data schema step shares with its two routes.
// The Blueprint carries the meaning of the step. These shapes carry what the
// Blueprint has no place for: which module a collection sits under, where a
// box stands on a canvas, and the drawing a logic flow was built from.
// Without them the routes and the screens would each describe the layout
// their own way.

import type { Blueprint } from '@/lib/blueprint/types';

/** The five surfaces of the step, in the order the tab bar shows them. */
export type Phase = 'data' | 'governance' | 'behavior' | 'exposure' | 'workflows';

/** A module as the sidebar lists it. */
export type ModuleInfo = { id: string; label: string; category?: string };

/** One point on a canvas. */
export type Point = { x: number; y: number };

/** The layout the schema route keeps beside the Blueprint under `step2::schema`. */
export type SchemaLayout = {
  /** The module each collection sits under in the sidebar, by collection id. */
  placement: Record<string, string>;
  /** Where each collection stands on the relationship canvas, by collection id. */
  positions: Record<string, Point>;
};

/** One block placed on the logic canvas. */
export type DrawingNode = {
  id: string;
  /** The block id from the palette of 52. */
  blockId: string;
  position: Point;
  /** The settings a person gave the block: the collection, the formula and so on. */
  props: Record<string, unknown>;
};

/** One line between two blocks on the logic canvas. */
export type DrawingEdge = {
  id: string;
  source: string;
  sourcePort: string;
  target: string;
  targetPort: string;
  /** A condition that holds the line shut, as a formula a person typed. */
  condition?: string;
};

/** One logic drawing. A drawing compiles into one action with its rules and events. */
export type Drawing = {
  id: string;
  name: string;
  /** The module this drawing belongs to in the Logic tab, when it has one. */
  moduleId?: string;
  /** The roles that may run the compiled action. */
  roles: string[];
  nodes: DrawingNode[];
  edges: DrawingEdge[];
};

/** The layout the logic route keeps beside the Blueprint under `step2::logic`. */
export type LogicLayout = {
  drawings: Record<string, Drawing>;
  /** Where each state stands on the workflow canvas, by workflow id then state id. */
  workflowPositions: Record<string, Record<string, Point>>;
};

/** What the schema route answers on a read. */
export type SchemaReply = {
  ok: true;
  version: number;
  blueprintHash: string;
  document: Blueprint;
  track: 'dapp' | 'blockchain';
  moduleIds: string[];
  layout: SchemaLayout;
  seeded: boolean;
};

/** What the logic route answers on a read. */
export type LogicReply = {
  ok: true;
  version: number;
  blueprintHash: string;
  document: Blueprint;
  track: 'dapp' | 'blockchain';
  moduleIds: string[];
  layout: LogicLayout;
};

/** What either route answers on a save. */
export type SaveReply = {
  ok: true;
  version: number;
  blueprintHash: string;
  document: Blueprint;
  created: boolean;
};

export function emptySchemaLayout(): SchemaLayout {
  return { placement: {}, positions: {} };
}

export function emptyLogicLayout(): LogicLayout {
  return { drawings: {}, workflowPositions: {} };
}
