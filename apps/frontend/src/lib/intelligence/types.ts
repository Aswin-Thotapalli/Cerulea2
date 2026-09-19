// apps/frontend/src/lib/intelligence/types.ts
// The shapes Cerulea Intelligence exchanges with Studio.
//
// Cerulea Intelligence is self-hosted. The model emits a typed card. The chat
// surface renders the card with a real Material UI component. The model emits
// no markup at any point, so a reply carries structure a person can act on.
//
// The authority for these shapes is the intelligence route group inside
// Cerulea APIs. Studio and Cerulea APIs live in separate repositories, so the
// declarations are copied rather than imported.

/** The seven card kinds Cerulea Intelligence emits. */
export const CARD_KINDS = [
  'diff',
  'form',
  'choice',
  'preview',
  'data',
  'progress',
  'artefact',
] as const;

export type CardKind = (typeof CARD_KINDS)[number];

/** Every card carries a plain sentence a person reads without training. */
type CardBase = {
  kind: CardKind;
  title: string;
  summary: string;
};

/**
 * A change to the Blueprint, held until a person applies it.
 * The before and after text let a person read the change in plain terms.
 */
export type DiffCard = CardBase & {
  kind: 'diff';
  patchId: string;
  before: string;
  after: string;
  plain: string;
  applyUrl: string;
  discardUrl: string;
  section?: string;
  elevated?: boolean;
};

/** A question Cerulea Intelligence asks with typed fields. */
export type FormCard = CardBase & {
  kind: 'form';
  formId: string;
  fields: {
    name: string;
    label: string;
    plain: string;
    kind: 'text' | 'number' | 'boolean';
    required: boolean;
    value?: string;
  }[];
  submitLabel: string;
};

/** A set of named options, one of which a person picks. */
export type ChoiceCard = CardBase & {
  kind: 'choice';
  choiceId: string;
  options: { id: string; label: string; plain: string; recommended?: boolean }[];
};

/** A screen Cerulea Intelligence offers to open. */
export type PreviewCard = CardBase & {
  kind: 'preview';
  screen: string;
  href: string;
  lines: string[];
};

/** Rows Cerulea Intelligence read from the project. */
export type DataCard = CardBase & {
  kind: 'data';
  columns: string[];
  rows: string[][];
};

/** Work in flight, with the step reached and the total. */
export type ProgressCard = CardBase & {
  kind: 'progress';
  stage: string;
  completed: number;
  total: number;
  settled: boolean;
};

/** A document or file Cerulea Intelligence produced. */
export type ArtefactCard = CardBase & {
  kind: 'artefact';
  artefactId: string;
  name: string;
  mediaType: string;
  href: string;
  sizeBytes?: number;
};

export type Card =
  | DiffCard
  | FormCard
  | ChoiceCard
  | PreviewCard
  | DataCard
  | ProgressCard
  | ArtefactCard;

/** Plane one of the context feed, the state of the screen a person is on. */
export type InterfaceState = {
  screen: string;
  selection: string[];
  validationErrors: { code: string; message: string; fix: string }[];
  recentActions: string[];
};

export type ThreadTurn = {
  messageId: string;
  role: 'person' | 'cerulea';
  text: string;
  cards: Card[];
  createdAt: string;
};

export type Thread = {
  threadId: string;
  projectId: string;
  turns: ThreadTurn[];
};

export type ThreadStart = { threadId: string };

export type MessageReply = { messageId: string; cards: Card[] };

export type PatchApplied = { checkpointId: string; version: number };

export type PatchDiscarded = { patchId: string; discarded: boolean };

/** Reports whether a value carries the shape of a card Studio renders. */
export function isCard(value: unknown): value is Card {
  if (!value || typeof value !== 'object') return false;
  const record = value as Record<string, unknown>;
  return (
    typeof record.kind === 'string' &&
    (CARD_KINDS as readonly string[]).includes(record.kind) &&
    typeof record.summary === 'string'
  );
}

/** Reads the cards out of a reply and drops anything that carries another shape. */
export function readCards(value: unknown): Card[] {
  if (!value || typeof value !== 'object') return [];
  const carrier = (value as { cards?: unknown }).cards;
  return Array.isArray(carrier) ? carrier.filter(isCard) : [];
}

/** Reads the screen state out of the request body, filling any absent part. */
export function readInterfaceState(value: unknown): InterfaceState {
  const record = (value ?? {}) as Record<string, unknown>;
  const texts = (entry: unknown): string[] =>
    Array.isArray(entry) ? entry.filter((item): item is string => typeof item === 'string') : [];
  const errors = Array.isArray(record.validationErrors) ? record.validationErrors : [];
  return {
    screen: typeof record.screen === 'string' ? record.screen : '',
    selection: texts(record.selection),
    validationErrors: errors
      .filter((entry): entry is Record<string, unknown> => Boolean(entry) && typeof entry === 'object')
      .map((entry) => ({
        code: typeof entry.code === 'string' ? entry.code : '',
        message: typeof entry.message === 'string' ? entry.message : '',
        fix: typeof entry.fix === 'string' ? entry.fix : '',
      })),
    recentActions: texts(record.recentActions),
  };
}
