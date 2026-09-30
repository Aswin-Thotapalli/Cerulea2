// apps/frontend/src/lib/studio/screens.ts
// Every screen a manifest line, a comparison line or a correction names.
//
// Section 11.8.3 asks that every line links to the exact screen that produces
// the line, so finding a problem and fixing the problem take one action each.
// This module holds the one map from a screen name to the place inside the
// workspace that opens it, together with the disclosure level that place needs.
//
// Without this map a line would name a screen in prose and leave a person to
// find it.

import type { DisclosureLevel } from './disclosure';

/** The area of the workspace a screen sits in. */
export type ScreenArea =
  | 'foundation'
  | 'compose'
  | 'model'
  | 'policies'
  | 'interface'
  | 'verify'
  | 'blueprint';

/** The surface inside the model area, where the screen names one. */
export type ModelSurface = 'entities' | 'permissions' | 'logic' | 'workflows';

export type ScreenTarget = {
  area: ScreenArea;
  /** The lowest disclosure level that opens this screen. */
  level: DisclosureLevel;
  surface?: ModelSurface;
  /** One sentence stating what a person does on this screen. */
  does: string;
};

/** Every screen name Cerulea prints, with the place it opens. */
export const SCREEN_TARGETS: Record<string, ScreenTarget> = {
  Foundation: {
    area: 'foundation',
    level: 2,
    does: 'The name, the network, the starting point and the network properties.',
  },
  Compose: {
    area: 'compose',
    level: 2,
    does: 'The statements this system delivers, and the map of the parts they install.',
  },
  'Model, records': {
    area: 'model',
    level: 3,
    surface: 'entities',
    does: 'The records this system keeps and every field on them.',
  },
  'Model, permissions': {
    area: 'model',
    level: 3,
    surface: 'permissions',
    does: 'Every role set against every collection it reaches.',
  },
  'Model, rules and actions': {
    area: 'model',
    level: 3,
    surface: 'logic',
    does: 'What this system does, and what it refuses.',
  },
  'Model, workflows': {
    area: 'model',
    level: 3,
    surface: 'workflows',
    does: 'How a record moves through its states.',
  },
  Policies: {
    area: 'policies',
    level: 2,
    does: 'The agreement profile this deployment runs under.',
  },
  Interface: {
    area: 'interface',
    level: 2,
    does: 'The screens and the endpoints Cerulea generated from the model, with the preview as any role.',
  },
  Verify: {
    area: 'verify',
    level: 2,
    does: 'The model run against generated traffic before deployment.',
  },
  Blueprint: {
    area: 'blueprint',
    level: 4,
    does: 'The typed document itself, read and edited directly.',
  },
  'Blueprint, views': {
    area: 'blueprint',
    level: 4,
    does: 'The screens and the endpoints the deployment publishes.',
  },
};

/** The place one screen name opens, or nothing where the name is unknown. */
export function screenTarget(screen: string): ScreenTarget | undefined {
  return SCREEN_TARGETS[screen];
}

/** Every screen name Cerulea prints. */
export function screenNames(): string[] {
  return Object.keys(SCREEN_TARGETS);
}

/** Reports whether the workspace opens this screen. */
export function screenReachable(screen: string): boolean {
  return screenTarget(screen) !== undefined;
}
