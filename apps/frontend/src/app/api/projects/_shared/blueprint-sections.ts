// apps/frontend/src/app/api/projects/_shared/blueprint-sections.ts
// Section writes into the typed Blueprint of one project.
// The Data schema step owns eight of the twelve sections: Types, Collections,
// Identities, Permissions, Rules, Actions, Workflows and Events. Each save
// reads the head Blueprint from Cerulea APIs, replaces the sections named in
// the request and writes the whole document back with the head version as the
// expected version. The other sections stay exactly as the other steps left
// them, so two steps saving together never overwrite each other.
// Without this module each route would merge the document its own way.

import {
  type CeruleaApiOptions,
  type CeruleaBlueprintVersion,
  CeruleaApiError,
  readBlueprint,
  saveBlueprint,
} from '@/lib/cerulea-api';
import { readBlueprintDocument } from '@/lib/blueprint/document';
import { BLUEPRINT_SECTIONS, type Blueprint, type BlueprintSection } from '@/lib/blueprint/types';
import { validateBlueprint, type SchemaFault } from '@/lib/blueprint/validate';

/** The sections the Data schema step writes through its logic route. */
export const LOGIC_SECTIONS: BlueprintSection[] = ['rules', 'actions', 'workflows', 'events'];

/**
 * The sections the Data schema step writes through its schema route.
 * A rename touches the model and the logic in one edit, so the schema route
 * takes the logic sections as well and saves the whole change as one version.
 */
export const SCHEMA_SECTIONS: BlueprintSection[] = [
  'types',
  'collections',
  'identities',
  'permissions',
  ...LOGIC_SECTIONS,
];

export type HeldBlueprint = {
  version: number;
  blueprintHash: string;
  document: Blueprint;
  record: CeruleaBlueprintVersion;
};

/** Reads the head Blueprint of one project, with every section present. */
export async function readHeadBlueprint(
  projectId: string,
  fallbackName: string,
  options: CeruleaApiOptions,
): Promise<HeldBlueprint> {
  const record = await readBlueprint(projectId, {}, options);
  return {
    version: record.version,
    blueprintHash: record.blueprintHash,
    document: readBlueprintDocument(record.document, fallbackName),
    record,
  };
}

/** The failure a save reports when the document carries a value the schema refuses. */
export function documentFaulty(faults: SchemaFault[]): CeruleaApiError {
  const first = faults[0];
  return new CeruleaApiError(
    {
      code: 'blueprint.document_faulty',
      message:
        faults.length === 1
          ? `The Blueprint holds one correction before Cerulea saves it. ${first?.path || 'The document'}: ${first?.message ?? ''}`
          : `The Blueprint holds ${faults.length} corrections before Cerulea saves it. ${first?.path || 'The document'}: ${first?.message ?? ''}`,
      fix: first?.fix ?? 'Correct the named place, then save again.',
      details: { faults },
    },
    400,
  );
}

/** The failure a save reports when the request names a section outside the route. */
export function sectionOutsideRoute(section: string, allowed: BlueprintSection[]): CeruleaApiError {
  return new CeruleaApiError(
    {
      code: 'blueprint.section_outside_route',
      message: `This route writes ${allowed.join(', ')}. The request names ${section}.`,
      fix: `Send ${section} through the route that owns it, or leave it out.`,
      details: { section, allowed },
    },
    400,
  );
}

/** The failure a save reports when the person read an older head. */
export function versionMoved(headVersion: number, expectedVersion: number): CeruleaApiError {
  return new CeruleaApiError(
    {
      code: 'projects.version_moved',
      message: `The Blueprint head stands at version ${headVersion} and this save read version ${expectedVersion}.`,
      fix: 'Read the Blueprint again, apply the change to it and save again.',
      details: { headVersion, expectedVersion },
    },
    409,
  );
}

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

/**
 * Takes the sections a request carries, refusing one outside the route.
 * A section carried as anything but a list (or an object for identities) is
 * left to the schema check, which names the place and the fix.
 */
export function pickSections(
  body: Record<string, unknown>,
  allowed: BlueprintSection[],
): Partial<Record<BlueprintSection, unknown>> {
  const sections = record(body.sections);
  if (!sections) return {};
  const picked: Partial<Record<BlueprintSection, unknown>> = {};
  for (const key of Object.keys(sections)) {
    if ((BLUEPRINT_SECTIONS as readonly string[]).includes(key) === false) continue;
    const section = key as BlueprintSection;
    if (allowed.includes(section) === false) throw sectionOutsideRoute(section, allowed);
    picked[section] = sections[section];
  }
  return picked;
}

export type SectionSaveOutcome = {
  version: number;
  blueprintHash: string;
  document: Blueprint;
  created: boolean;
};

/**
 * Merges the given sections into the head Blueprint and saves the result.
 * A whole `document` replaces every section at once, which is what the
 * Blueprint level does. The Studio schema check runs before the save, so a
 * refusal names the place and the fix in the words a person reads.
 */
export async function saveSections(
  projectId: string,
  fallbackName: string,
  input: {
    sections?: Partial<Record<BlueprintSection, unknown>>;
    document?: unknown;
    expectedVersion?: number;
    note?: string;
  },
  options: CeruleaApiOptions,
): Promise<SectionSaveOutcome> {
  const head = await readHeadBlueprint(projectId, fallbackName, options);
  if (input.expectedVersion !== undefined && input.expectedVersion !== head.version) {
    throw versionMoved(head.version, input.expectedVersion);
  }
  const merged: Blueprint =
    input.document !== undefined
      ? readBlueprintDocument(input.document, fallbackName)
      : ({ ...head.document, ...(input.sections ?? {}) } as Blueprint);
  // A section save answers for the sections it wrote. A fault another step
  // left in its own section stays that step's correction to make.
  const written = new Set<string>(
    input.document !== undefined ? BLUEPRINT_SECTIONS : Object.keys(input.sections ?? {}),
  );
  const faults = validateBlueprint(merged).filter(
    (fault) => input.document !== undefined || written.has(fault.section),
  );
  if (faults.length > 0) throw documentFaulty(faults);
  const saved = await saveBlueprint(
    projectId,
    { document: merged, note: input.note, expectedVersion: head.version },
    options,
  );
  return {
    version: saved.blueprint.version,
    blueprintHash: saved.blueprint.blueprintHash,
    document: merged,
    created: saved.created,
  };
}

/** Reads a whole number from a request body, or leaves it undefined. */
export function wholeNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0 ? value : undefined;
}

/** Reads a short note from a request body. */
export function noteOf(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim().slice(0, 400) : undefined;
}
