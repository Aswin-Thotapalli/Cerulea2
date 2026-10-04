// apps/frontend/src/lib/map/canvas.ts
// The model behind the Blueprint canvas.
//
// The production canvas draws module cards and wires. The specification makes
// the canvas a map: outcomes decide which parts are present, Cerulea resolves
// the dependency closure, and four link types are drawn distinctly. This module
// joins the two. It turns the chosen outcomes, the removals and the links a
// person drew into the installed parts, the links of every type and the cards
// the canvas draws, and it turns the canvas back into the saved graph.
//
// Positions belong to the person. Everything else is derived, so the same
// choices always produce the same map.

import type { CatalogueModule, CatalogueTemplate } from '@/lib/catalogue/types';
import { indexModules } from '@/lib/modules/resolve';
import { groupLabel, type Outcome } from '@/lib/outcomes/catalogue';
import { outcomesForModules } from '@/lib/outcomes/reflect';
import { removalImpact, type OutcomeResolution, type RemovalImpact } from '@/lib/outcomes/resolve';
import { isBridgeOutcome, modulesWithBridgeRuntime, outcomesWithBridges, resolveFromModulesWithBridges } from '@/lib/outcomes/bridges';
import { deriveOutcomes } from '@/lib/outcomes/catalogue';
import { answerFeedsQuestion, resolveFeedsLinks, type FeedsQuestion } from './feeds';
import { derivePermissionMatrix, deriveGovernsLinks, type PermissionMatrix } from './governs';
import { deriveRequiresLinks, linkIdFor, type LinkType, type MapLink } from './links';
import { buildRelationCatalogue, type RelationCatalogue } from './relations';
import { createTriggerLink, validTriggerPairs, type TriggerPair } from './triggers';

/** A link a person chose. Requires and governs links are never chosen. */
export type ChosenLink = { kind: 'feeds' | 'triggers'; from: string; to: string };

/** What a person decided on the canvas. Everything else derives from this. */
export type CanvasSelection = {
  outcomeIds: string[];
  removedModuleIds: string[];
  chosenLinks: ChosenLink[];
};

/** The outcome identifier of one module. Every module carries one statement. */
export function outcomeIdOf(moduleId: string): string {
  return `outcome:${moduleId}`;
}

/** The identifier of the canvas node that draws one module. */
export function nodeIdFor(moduleId: string): string {
  return `n_${moduleId}`;
}

/** The module behind one canvas node identifier. */
export function moduleIdOfNode(nodeId: string): string {
  return nodeId.startsWith('n_') ? nodeId.slice(2) : nodeId;
}

/** The seven production relation labels, each mapped onto one of the four link types. */
export const PRODUCTION_RELATION: Record<string, 'feeds' | 'triggers' | null> = {
  reads: 'feeds',
  writes: 'feeds',
  feeds: 'feeds',
  triggers: 'triggers',
  calls: 'triggers',
  pays: 'triggers',
  custom: null,
};

export type CanvasCatalogue = {
  modules: CatalogueModule[];
  templates: CatalogueTemplate[];
};

/** The catalogue prepared once for a canvas: outcomes, the bridge runtime and the relations. */
export type PreparedCatalogue = {
  modules: CatalogueModule[];
  /** The modules plus the bridge runtime, which bridge statements install. */
  withBridges: CatalogueModule[];
  outcomes: Outcome[];
  relations: RelationCatalogue;
  index: Map<string, CatalogueModule>;
  titleById: Record<string, string>;
};

export function prepareCatalogue(catalogue: CanvasCatalogue): PreparedCatalogue {
  const withBridges = modulesWithBridgeRuntime(catalogue.modules);
  return {
    modules: catalogue.modules,
    withBridges,
    outcomes: outcomesWithBridges(deriveOutcomes(catalogue.modules)),
    relations: buildRelationCatalogue(catalogue.templates),
    index: indexModules(withBridges),
    titleById: Object.fromEntries(withBridges.map((part) => [part.moduleId, part.title])),
  };
}

export type CanvasCard = {
  moduleId: string;
  title: string;
  area: string;
  category: string;
  tags: string[];
  blurb: string;
  configSchema: unknown;
  /** One sentence stating what this part contributes. */
  contribution: string;
  /** The outcomes that caused this card. */
  causedBy: string[];
  causedByOutcomeIds: string[];
  chosenDirectly: boolean;
  requiredBy: string[];
  /** The reason the catalogue records for pulling this part in. */
  reason: string | null;
  /** One sentence stating what stops working after removal. */
  removalConsequence: string;
};

export type CanvasModel = {
  resolution: OutcomeResolution;
  /** The parts on the canvas, dependencies first, removals left out. */
  installed: string[];
  cards: CanvasCard[];
  links: MapLink[];
  feedsQuestions: FeedsQuestion[];
  triggerPairs: TriggerPair[];
  matrix: PermissionMatrix;
  /** The outcome identifiers whose anchor is on the canvas. */
  presentOutcomeIds: string[];
};

/** The parts that stay after the removals. */
function installedAfterRemoval(resolution: OutcomeResolution, removed: string[]): string[] {
  const gone = new Set(removed);
  return resolution.installOrder.filter((moduleId) => gone.has(moduleId) === false);
}

/** Builds the whole map from a selection. */
export function buildCanvasModel(selection: CanvasSelection, prepared: PreparedCatalogue): CanvasModel {
  const resolution = resolveFromModulesWithBridges(selection.outcomeIds, prepared.modules);
  const installed = installedAfterRemoval(resolution, selection.removedModuleIds);
  const held = new Set(installed);

  const cards: CanvasCard[] = resolution.modules
    .filter((entry) => held.has(entry.moduleId))
    .map((entry) => {
      const part = prepared.index.get(entry.moduleId);
      return {
        moduleId: entry.moduleId,
        title: entry.title,
        area: groupLabel(part?.category ?? ''),
        category: part?.category ?? '',
        tags: part?.tags ?? [],
        blurb: part?.blurb ?? part?.longDescription?.[0] ?? entry.title,
        configSchema: part?.configSchema,
        contribution: entry.contribution,
        causedBy: entry.causedBy,
        causedByOutcomeIds: entry.causedByOutcomeIds,
        chosenDirectly: entry.chosenDirectly,
        requiredBy: entry.requiredBy,
        reason: entry.reason,
        removalConsequence: entry.removalConsequence,
      };
    });

  const requires = deriveRequiresLinks(installed, prepared.withBridges);
  const feeds = resolveFeedsLinks(installed, prepared.withBridges, prepared.relations);
  const pairs = validTriggerPairs(installed, prepared.withBridges, prepared.relations);
  const matrix = derivePermissionMatrix(installed, prepared.withBridges, prepared.relations);
  const governs = deriveGovernsLinks(matrix);

  const chosen: MapLink[] = [];
  const seen = new Set<string>();
  for (const link of selection.chosenLinks) {
    if (!held.has(link.from) || !held.has(link.to)) continue;
    if (link.kind === 'triggers') {
      const pair = pairs.find((candidate) => candidate.from === link.from && candidate.to === link.to);
      if (!pair) continue;
      const made = createTriggerLink(link.from, link.to, pairs);
      if (!seen.has(made.linkId)) {
        seen.add(made.linkId);
        chosen.push(made);
      }
      continue;
    }
    const question = feeds.questions.find((entry) => entry.to === link.to);
    if (!question) continue;
    for (const made of answerFeedsQuestion(question, [link.from], prepared.withBridges, prepared.relations)) {
      if (!seen.has(made.linkId)) {
        seen.add(made.linkId);
        chosen.push(made);
      }
    }
  }

  const links = [...requires, ...feeds.derived, ...chosen, ...governs].sort((left, right) =>
    left.linkId.localeCompare(right.linkId),
  );

  const presentOutcomeIds = selection.outcomeIds.filter((outcomeId) => {
    const outcome = prepared.outcomes.find((entry) => entry.outcomeId === outcomeId);
    return outcome ? held.has(outcome.anchorModuleId) : false;
  });

  return {
    resolution,
    installed,
    cards,
    links,
    feedsQuestions: feeds.questions,
    triggerPairs: pairs,
    matrix,
    presentOutcomeIds,
  };
}

/** The answer to a feeds question, read from the chosen links. */
export function feedsAnswers(selection: CanvasSelection): Record<string, string[]> {
  const answers: Record<string, string[]> = {};
  for (const link of selection.chosenLinks) {
    if (link.kind !== 'feeds') continue;
    answers[link.to] = [...(answers[link.to] ?? []), link.from];
  }
  return answers;
}

/** Replaces the sources one receiving part reads from. */
export function withFeedsAnswer(selection: CanvasSelection, to: string, sources: string[]): CanvasSelection {
  const kept = selection.chosenLinks.filter((link) => link.kind !== 'feeds' || link.to !== to);
  return {
    ...selection,
    chosenLinks: [...kept, ...sources.map((from) => ({ kind: 'feeds' as const, from, to }))],
  };
}

/** Adds or removes one triggers link. */
export function withTrigger(selection: CanvasSelection, pair: { from: string; to: string }, present: boolean): CanvasSelection {
  const without = selection.chosenLinks.filter(
    (link) => !(link.kind === 'triggers' && link.from === pair.from && link.to === pair.to),
  );
  return {
    ...selection,
    chosenLinks: present ? [...without, { kind: 'triggers', from: pair.from, to: pair.to }] : without,
  };
}

/** Removes one chosen link by its identifier. A derived link stays. */
export function withoutLink(selection: CanvasSelection, linkId: string): CanvasSelection {
  return {
    ...selection,
    chosenLinks: selection.chosenLinks.filter((link) => linkIdFor(link.kind, link.from, link.to) !== linkId),
  };
}

/** Adds one outcome. A statement already chosen stays once. */
export function withOutcome(selection: CanvasSelection, outcomeId: string): CanvasSelection {
  if (selection.outcomeIds.includes(outcomeId)) return selection;
  return { ...selection, outcomeIds: [...selection.outcomeIds, outcomeId] };
}

/** Removes one outcome. */
export function withoutOutcome(selection: CanvasSelection, outcomeId: string): CanvasSelection {
  return { ...selection, outcomeIds: selection.outcomeIds.filter((held) => held !== outcomeId) };
}

/**
 * Adds one module straight from the search.
 * Every module carries its own statement, so adding a module is choosing that
 * statement, and the dependency closure follows as for any outcome. A module
 * removed earlier comes back.
 */
export function withModule(selection: CanvasSelection, moduleId: string): CanvasSelection {
  return {
    ...withOutcome(selection, outcomeIdOf(moduleId)),
    removedModuleIds: selection.removedModuleIds.filter((held) => held !== moduleId),
  };
}

/** What removing one part takes with it, read before the removal proceeds. */
export function removalQuestion(moduleId: string, model: CanvasModel, prepared: PreparedCatalogue): RemovalImpact {
  const trimmed: OutcomeResolution = { ...model.resolution, installOrder: model.installed };
  return removalImpact(moduleId, trimmed, prepared.withBridges);
}

/**
 * Removes one part after the question was answered.
 * The statements the part delivered directly leave the selection, and the part
 * joins the removed list so a later resolution leaves it out.
 */
export function withModuleRemoved(selection: CanvasSelection, moduleId: string, impact: RemovalImpact): CanvasSelection {
  const lost = new Set(impact.outcomesLost);
  const own = outcomeIdOf(moduleId);
  return {
    outcomeIds: selection.outcomeIds.filter((outcomeId) => outcomeId !== own && lost.has(outcomeId) === false),
    removedModuleIds: selection.removedModuleIds.includes(moduleId)
      ? selection.removedModuleIds
      : [...selection.removedModuleIds, moduleId],
    chosenLinks: selection.chosenLinks.filter((link) => link.from !== moduleId && link.to !== moduleId),
  };
}

/** Empties the canvas. */
export const EMPTY_SELECTION: CanvasSelection = { outcomeIds: [], removedModuleIds: [], chosenLinks: [] };

/* The saved graph ------------------------------------------------------ */

export type Position = { x: number; y: number };

/** The per card values a person sets in the inspector. */
export type CardSettings = { group?: string; config?: Record<string, unknown> };

export type SavedNode = {
  id: string;
  type: 'module';
  position: Position;
  data: Record<string, unknown> & { moduleId: string; title: string };
};

export type SavedEdge = {
  id: string;
  source: string;
  target: string;
  type: 'link';
  data: { linkType: LinkType; origin: 'derived' | 'chosen'; reason: string; removable: boolean };
};

/** The document the production graph path keeps under blueprint::graph. */
export type SavedGraph = {
  modules: Array<{ moduleId: string; label: string; group?: string; config?: Record<string, unknown> }>;
  graph: { nodes: SavedNode[]; edges: SavedEdge[] };
  selection: CanvasSelection;
  settings: Record<string, CardSettings>;
};

const GRID_COLS = 4;
const GRID_GAP_X = 300;
const GRID_GAP_Y = 180;
const GRID_START = { x: 60, y: 60 };

/** The place a card takes when nobody moved it: a grid, dependencies first. */
export function gridPosition(index: number): Position {
  const col = index % GRID_COLS;
  const row = Math.floor(index / GRID_COLS);
  return { x: GRID_START.x + col * GRID_GAP_X, y: GRID_START.y + row * GRID_GAP_Y };
}

/** Lays the cards out, keeping every position a person set. */
export function layoutPositions(installed: string[], kept: Record<string, Position>): Record<string, Position> {
  const positions: Record<string, Position> = {};
  const taken = new Set(
    installed.filter((moduleId) => kept[moduleId]).map((moduleId) => `${kept[moduleId].x}:${kept[moduleId].y}`),
  );
  let slot = 0;
  for (const moduleId of installed) {
    if (kept[moduleId]) {
      positions[moduleId] = kept[moduleId];
      continue;
    }
    let candidate = gridPosition(slot);
    slot += 1;
    while (taken.has(`${candidate.x}:${candidate.y}`)) {
      candidate = gridPosition(slot);
      slot += 1;
    }
    taken.add(`${candidate.x}:${candidate.y}`);
    positions[moduleId] = candidate;
  }
  return positions;
}

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

function texts(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === 'string') : [];
}

export type LoadedGraph = {
  selection: CanvasSelection | null;
  positions: Record<string, Position>;
  settings: Record<string, CardSettings>;
  /** The module identifiers the saved graph drew. */
  moduleIds: string[];
  /** The production relation edges, for a graph saved before the four link types. */
  legacyEdges: Array<{ from: string; to: string; rel: string }>;
};

/** Reads whatever the graph path holds: this shape, or the production shape. */
export function readSavedGraph(value: unknown): LoadedGraph {
  const body = record(value);
  const graph = record(body?.graph);
  const nodes = Array.isArray(graph?.nodes) ? graph.nodes : [];
  const edges = Array.isArray(graph?.edges) ? graph.edges : [];
  const positions: Record<string, Position> = {};
  const settings: Record<string, CardSettings> = {};
  const moduleIds: string[] = [];
  const nodeModule = new Map<string, string>();

  for (const entry of nodes) {
    const node = record(entry);
    const data = record(node?.data);
    const moduleId = typeof data?.moduleId === 'string' ? data.moduleId : null;
    if (!node || !data || !moduleId) continue;
    const nodeId = typeof node.id === 'string' ? node.id : nodeIdFor(moduleId);
    nodeModule.set(nodeId, moduleId);
    if (!moduleIds.includes(moduleId)) moduleIds.push(moduleId);
    const position = record(node.position);
    if (position && typeof position.x === 'number' && typeof position.y === 'number') {
      positions[moduleId] = { x: position.x, y: position.y };
    }
    const group = typeof data.group === 'string' ? data.group : undefined;
    const config = record(data.config) ?? undefined;
    if (group || config) settings[moduleId] = { ...(group ? { group } : {}), ...(config ? { config } : {}) };
  }

  const savedSettings = record(body?.settings);
  if (savedSettings) {
    for (const [moduleId, held] of Object.entries(savedSettings)) {
      const entry = record(held);
      if (!entry) continue;
      settings[moduleId] = {
        ...(typeof entry.group === 'string' ? { group: entry.group } : {}),
        ...(record(entry.config) ? { config: record(entry.config) as Record<string, unknown> } : {}),
      };
    }
  }

  const legacyEdges: LoadedGraph['legacyEdges'] = [];
  for (const entry of edges) {
    const edge = record(entry);
    const data = record(edge?.data);
    if (!edge || typeof edge.source !== 'string' || typeof edge.target !== 'string') continue;
    if (typeof data?.linkType === 'string') continue;
    const from = nodeModule.get(edge.source) ?? moduleIdOfNode(edge.source);
    const to = nodeModule.get(edge.target) ?? moduleIdOfNode(edge.target);
    legacyEdges.push({ from, to, rel: typeof data?.rel === 'string' ? data.rel : 'custom' });
  }

  const saved = record(body?.selection);
  const selection: CanvasSelection | null = saved
    ? {
        outcomeIds: texts(saved.outcomeIds),
        removedModuleIds: texts(saved.removedModuleIds),
        chosenLinks: (Array.isArray(saved.chosenLinks) ? saved.chosenLinks : [])
          .map((link) => record(link))
          .filter((link): link is Record<string, unknown> => link !== null)
          .filter((link) => (link.kind === 'feeds' || link.kind === 'triggers') && typeof link.from === 'string' && typeof link.to === 'string')
          .map((link) => ({ kind: link.kind as 'feeds' | 'triggers', from: link.from as string, to: link.to as string })),
      }
    : null;

  return { selection, positions, settings, moduleIds, legacyEdges };
}

/**
 * The selection a canvas opens with.
 * A graph saved by this canvas keeps its selection. A production graph, or a
 * project composed at another level, is read back: every root part names its
 * statement, and the production wires become chosen links where the catalogue
 * records the pair.
 */
export function openingSelection(
  loaded: LoadedGraph,
  compose: { outcomeIds: string[]; moduleIds: string[]; removedModuleIds: string[]; chosenLinks: ChosenLink[] },
  templateModuleIds: string[],
  prepared: PreparedCatalogue,
): CanvasSelection {
  if (loaded.selection) return loaded.selection;
  // The statements Foundation chose join the statements the installed parts
  // read back as, so a project described in one sentence and started from a
  // template opens with both.
  const moduleIds = loaded.moduleIds.length > 0 ? loaded.moduleIds : compose.moduleIds.length > 0 ? compose.moduleIds : templateModuleIds;
  const fromModules = outcomesForModules(moduleIds, prepared.withBridges).map((outcome) => outcome.outcomeId);
  const known = new Set(prepared.outcomes.map((outcome) => outcome.outcomeId));
  const outcomeIds = Array.from(new Set([...compose.outcomeIds.filter((id) => known.has(id)), ...fromModules]));
  const base: CanvasSelection = { outcomeIds, removedModuleIds: compose.removedModuleIds, chosenLinks: compose.chosenLinks };
  if (loaded.legacyEdges.length === 0) return base;

  const model = buildCanvasModel(base, prepared);
  let selection = base;
  for (const edge of loaded.legacyEdges) {
    const kind = PRODUCTION_RELATION[edge.rel] ?? null;
    if (kind === 'triggers' && model.triggerPairs.some((pair) => pair.from === edge.from && pair.to === edge.to)) {
      selection = withTrigger(selection, edge, true);
    } else if (kind === 'feeds') {
      const question = model.feedsQuestions.find((entry) => entry.to === edge.to);
      if (question && question.options.some((option) => option.from === edge.from)) {
        selection = withFeedsAnswer(selection, edge.to, [...(feedsAnswers(selection)[edge.to] ?? []), edge.from]);
      }
    }
  }
  return selection;
}

/** Builds the document the graph path saves. */
export function savedGraphOf(
  model: CanvasModel,
  selection: CanvasSelection,
  positions: Record<string, Position>,
  settings: Record<string, CardSettings>,
): SavedGraph {
  const nodes: SavedNode[] = model.cards.map((card) => ({
    id: nodeIdFor(card.moduleId),
    type: 'module',
    position: positions[card.moduleId] ?? gridPosition(0),
    data: {
      moduleId: card.moduleId,
      title: card.title,
      label: card.title,
      ...(settings[card.moduleId]?.group ? { group: settings[card.moduleId].group } : {}),
      ...(settings[card.moduleId]?.config ? { config: settings[card.moduleId].config } : {}),
    },
  }));
  const edges: SavedEdge[] = model.links.map((link) => ({
    id: link.linkId,
    source: nodeIdFor(link.from),
    target: nodeIdFor(link.to),
    type: 'link',
    data: { linkType: link.type, origin: link.origin, reason: link.reason, removable: link.removable },
  }));
  return {
    modules: model.cards.map((card) => ({
      moduleId: card.moduleId,
      label: card.title,
      ...(settings[card.moduleId]?.group ? { group: settings[card.moduleId].group } : {}),
      ...(settings[card.moduleId]?.config ? { config: settings[card.moduleId].config } : {}),
    })),
    graph: { nodes, edges },
    selection,
    settings,
  };
}

/** Reports whether the two parts may carry a link a person draws, and which kinds. */
export function drawableKinds(from: string, to: string, model: CanvasModel): Array<'feeds' | 'triggers'> {
  const kinds: Array<'feeds' | 'triggers'> = [];
  const question = model.feedsQuestions.find((entry) => entry.to === to);
  if (question && question.options.some((option) => option.from === from)) kinds.push('feeds');
  if (model.triggerPairs.some((pair) => pair.from === from && pair.to === to)) kinds.push('triggers');
  return kinds;
}

/** The bridge statements inside a selection. */
export function bridgeOutcomeIds(selection: CanvasSelection): string[] {
  return selection.outcomeIds.filter((outcomeId) => isBridgeOutcome(outcomeId));
}
