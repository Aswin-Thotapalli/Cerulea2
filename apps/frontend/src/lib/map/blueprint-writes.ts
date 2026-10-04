// apps/frontend/src/lib/map/blueprint-writes.ts
// What the Blueprint canvas writes into the typed Blueprint.
//
// Every level reads one document. The canvas therefore writes three things.
// The installed parts install their record types and collections through the
// same composition the other levels use. Every link a person drew becomes an
// event, so a feed or a trigger between two parts is a fact the deployment
// carries. Every bridge statement becomes an endpoint in the Integrations
// section. A collection a person already changed stays as it stands.

import { applyComposition, composeSections, toIdentifier } from '@/lib/blueprint/compose';
import type { Blueprint, EventDefinition, Integrations } from '@/lib/blueprint/types';
import { bridgeNetworkForOutcome } from '@/lib/outcomes/bridges';
import type { CanvasModel, CanvasSelection } from './canvas';
import { bridgeOutcomeIds } from './canvas';
import type { MapLink } from './links';

/** The confirmations an endpoint waits for before a far record counts. */
export const BRIDGE_CONFIRMATIONS = 12;

export type CanvasWriteOutcome = {
  blueprint: Blueprint;
  /** The collections this composition installed, kept for the next composition. */
  composedCollectionIds: string[];
  /** The links that wrote no event, each with the reason. */
  linksWithoutEvent: Array<{ linkId: string; reason: string }>;
  /** The bridge statements that wrote no endpoint, each with the reason. */
  bridgesWithoutEndpoint: Array<{ outcomeId: string; reason: string }>;
};

/** The identifier of the event one link writes. */
export function eventIdOf(link: MapLink): string {
  return toIdentifier(`${link.from}_${link.type}_${link.to}`).slice(0, 64);
}

/** The record type a part carries, read from the collections its composition installed. */
function recordTypeOf(moduleId: string, document: Blueprint): string | null {
  const composed = composeSections([moduleId]);
  for (const collection of composed.collections) {
    const held = document.collections.find((entry) => entry.id === collection.id);
    if (held) return held.record_type;
  }
  return null;
}

/**
 * Writes one event per chosen link.
 * A feeds event carries the record type of the source part. A triggers event
 * carries the record type of the source, or of the target when the source
 * keeps no record. A link between two parts that keep no record stays a canvas
 * fact alone, and the outcome names it.
 */
export function eventsFromLinks(
  links: MapLink[],
  document: Blueprint,
  titleById: Record<string, string>,
): { events: EventDefinition[]; without: CanvasWriteOutcome['linksWithoutEvent'] } {
  const events: EventDefinition[] = [];
  const without: CanvasWriteOutcome['linksWithoutEvent'] = [];
  for (const link of links) {
    if (link.origin !== 'chosen') continue;
    const payload = recordTypeOf(link.from, document) ?? recordTypeOf(link.to, document);
    const from = titleById[link.from] ?? link.from;
    const to = titleById[link.to] ?? link.to;
    if (!payload) {
      without.push({
        linkId: link.linkId,
        reason: `Neither ${from} nor ${to} keeps a record, so the link carries no payload and writes no event.`,
      });
      continue;
    }
    events.push({
      id: eventIdOf(link),
      name: link.type === 'feeds' ? `${from} feeds ${to}` : `${from} triggers ${to}`,
      payload_type: payload,
      audit: true,
      description: link.reason.slice(0, 400),
    });
  }
  return { events, without };
}

/** The identifiers of every event the canvas wrote earlier, so a removed link removes its event. */
function canvasEventIds(document: Blueprint): Set<string> {
  return new Set(
    document.events
      .filter((event) => /_(feeds|triggers)_/.test(event.id) && / (feeds|triggers) /.test(event.name))
      .map((event) => event.id),
  );
}

/** Writes one bridge endpoint per bridge statement, over the first collection the document keeps. */
export function bridgesFromSelection(
  selection: CanvasSelection,
  document: Blueprint,
): { bridges: Integrations['bridges']; without: CanvasWriteOutcome['bridgesWithoutEndpoint'] } {
  const bridges: Integrations['bridges'] = [];
  const without: CanvasWriteOutcome['bridgesWithoutEndpoint'] = [];
  const collection = document.collections[0]?.id ?? null;
  for (const outcomeId of bridgeOutcomeIds(selection)) {
    const network = bridgeNetworkForOutcome(outcomeId);
    if (!network) continue;
    if (!collection) {
      without.push({
        outcomeId,
        reason: `The project keeps no record yet, so the ${network.networkName} endpoint has no collection to exchange.`,
      });
      continue;
    }
    const id = `${network.endpointStem}_${collection}_endpoint`.slice(0, 64);
    const held = document.integrations.bridges.find((entry) => entry.id === id);
    bridges.push(
      held ?? {
        id,
        target_network: network.networkName,
        direction: 'Both',
        collection,
        confirmations: BRIDGE_CONFIRMATIONS,
      },
    );
  }
  return { bridges, without };
}

/** The endpoints the canvas wrote earlier, recognised by their stem. */
function canvasBridgeIds(document: Blueprint): Set<string> {
  return new Set(
    document.integrations.bridges.filter((entry) => entry.id.endsWith('_endpoint')).map((entry) => entry.id),
  );
}

/**
 * Applies the canvas to a Blueprint.
 * `previouslyComposed` names the collections an earlier composition installed.
 */
export function applyCanvas(
  blueprint: Blueprint,
  model: CanvasModel,
  selection: CanvasSelection,
  previouslyComposed: string[],
  options: { retentionDays?: number; titleById: Record<string, string> },
): CanvasWriteOutcome {
  const composed = composeSections(model.installed, { retentionDays: options.retentionDays });
  const withSections = applyComposition(blueprint, composed, previouslyComposed);

  const written = eventsFromLinks(model.links, withSections, options.titleById);
  const earlierEvents = canvasEventIds(blueprint);
  const keptEvents = withSections.events.filter((event) => earlierEvents.has(event.id) === false);
  const writtenIds = new Set(written.events.map((event) => event.id));
  const events = [...keptEvents.filter((event) => writtenIds.has(event.id) === false), ...written.events];

  const bridged = bridgesFromSelection(selection, withSections);
  const earlierBridges = canvasBridgeIds(blueprint);
  const keptBridges = withSections.integrations.bridges.filter((entry) => earlierBridges.has(entry.id) === false);
  const bridgeIds = new Set(bridged.bridges.map((entry) => entry.id));
  const bridges = [...keptBridges.filter((entry) => bridgeIds.has(entry.id) === false), ...bridged.bridges];

  return {
    blueprint: {
      ...withSections,
      events,
      integrations: { ...withSections.integrations, bridges },
    },
    composedCollectionIds: composed.collections.map((entry) => entry.id),
    linksWithoutEvent: written.without,
    bridgesWithoutEndpoint: bridged.without,
  };
}
