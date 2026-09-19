// apps/frontend/src/lib/manifest/document.ts
// The Deployment Manifest as a document in the Cerulea house format.
//
// The export serves as the specification handed to auditors, procurement
// reviewers and internal approvers, so it follows the writing rules exactly.
// Numbered lists at the first level. The lead term of every numbered point in
// bold. No full stop in a heading. One body size throughout. The three brand
// colours and no other.
//
// The plan below is the document, stated as data. One function turns the plan
// into a Word document and another turns it into the JSON export. A test reads
// the plan rather than the bytes, so the rules are checked rather than trusted.
//
// Without this export a reviewer receives a screen and writes the document by
// hand.

import {
  GROUP_WORDING,
  MANIFEST_GROUPS,
  linesOfGroup,
  summaryHeadline,
  summaryLines,
} from './groups';
import { gapsForManifest, type RecommendationGap } from './gaps';
import { reconcileIntent, type Reconciliation } from './reconcile';
import type { CatalogueModule } from '@/lib/catalogue/types';
import type { DeploymentManifest } from './types';

/** The Cerulea brand colours, as the brand states them. */
export const BRAND = {
  /** The shared blue every heading carries. */
  blue: '004AAD',
  /** The Cerulea gold a caution carries. */
  gold: 'EEC000',
  /** The Cerulea green a settled line carries. */
  green: '30B700',
  black: '111111',
} as const;

/** The one body size the document uses, in half points. Eleven points. */
export const BODY_HALF_POINTS = 22;

/** The heading sizes, in half points. */
export const HEADING_HALF_POINTS = { title: 40, section: 28, sub: 24 } as const;

export type DocumentRun = {
  text: string;
  bold?: boolean;
  colour?: string;
};

export type DocumentBlock =
  | { kind: 'title'; text: string }
  | { kind: 'heading'; text: string; level: 1 | 2 }
  | { kind: 'paragraph'; runs: DocumentRun[] }
  | { kind: 'numbered'; index: number; lead: string; rest: string }
  | { kind: 'bullet'; text: string }
  | { kind: 'table'; header: string[]; rows: string[][] };

export type DocumentPlan = {
  /** The file name the reader saves. */
  fileName: string;
  /** The title on the first page. */
  title: string;
  blocks: DocumentBlock[];
};

function paragraph(text: string, colour?: string): DocumentBlock {
  return { kind: 'paragraph', runs: [{ text, colour }] };
}

/** Turns a file name into one a browser saves without complaint. */
export function safeFileName(name: string): string {
  const held = name
    .trim()
    .replace(/[^A-Za-z0-9 _-]+/g, '')
    .replace(/\s+/g, '-')
    .toLowerCase();
  return held.length === 0 ? 'deployment-manifest' : held;
}

/**
 * Builds the document plan for one manifest.
 * Every group of section 11.8.2 appears, in the order that section lists them.
 */
export function planFor(input: {
  manifest: DeploymentManifest;
  version: number;
  statement?: string;
  modules?: CatalogueModule[];
}): DocumentPlan {
  const { manifest, version } = input;
  const blocks: DocumentBlock[] = [];

  blocks.push({ kind: 'title', text: `${manifest.name} deployment manifest` });
  blocks.push(
    paragraph(
      `Version ${version}. Manifest version ${manifest.manifest_version}. Blueprint address ${manifest.blueprintHash}.`,
    ),
  );
  blocks.push(paragraph(summaryHeadline(manifest.summary)));
  blocks.push(paragraph('Controls implemented, certification not held.'));

  blocks.push({ kind: 'heading', text: 'What this deployment installs', level: 1 });
  blocks.push({
    kind: 'table',
    header: ['Figure', 'Count', 'What it covers'],
    rows: summaryLines(manifest.summary).map((line) => [
      line.heading,
      String(line.count),
      line.states,
    ]),
  });

  let position = 0;
  for (const group of MANIFEST_GROUPS) {
    const wording = GROUP_WORDING[group];
    const lines = linesOfGroup(manifest, group);
    position += 1;
    blocks.push({
      kind: 'numbered',
      index: position,
      lead: wording.heading,
      rest: wording.states,
    });
    blocks.push(
      paragraph(
        `${lines.length} ${lines.length === 1 ? 'line' : 'lines'}. Edited on ${wording.screen}.`,
      ),
    );
    if (lines.length > 0) {
      blocks.push({
        kind: 'table',
        header: ['Item', 'Detail'],
        rows: lines.map((line) => [
          line.subject,
          line.details.map((detail) => `${detail.label}: ${detail.value}`).join('. '),
        ]),
      });
    }
  }

  if (input.statement && input.statement.trim().length > 0) {
    const held: Reconciliation = reconcileIntent(input.statement, manifest);
    blocks.push({ kind: 'heading', text: 'The manifest against the goal stated', level: 1 });
    blocks.push(paragraph(held.statement));
    blocks.push(paragraph(held.headline));
    for (const flag of held.flags) {
      blocks.push({
        kind: 'bullet',
        text: `${flag.label}. ${flag.absent} ${flag.fix}`,
      });
    }
    for (const answered of held.answered) {
      blocks.push({ kind: 'bullet', text: `${answered.label}. Present in this manifest.` });
    }
  }

  if (input.modules && input.modules.length > 0) {
    const gaps: RecommendationGap[] = gapsForManifest(manifest, input.modules);
    blocks.push({ kind: 'heading', text: 'Parts the catalogue recommends', level: 1 });
    blocks.push(
      paragraph(
        gaps.length === 0
          ? 'Every part the catalogue recommends beside these parts is installed.'
          : `${gaps.length} recommended parts are missing.`,
      ),
    );
    for (const gap of gaps) {
      blocks.push({ kind: 'bullet', text: `${gap.title}. ${gap.reason}` });
    }
  }

  return {
    fileName: `${safeFileName(manifest.name)}-manifest-version-${version}`,
    title: `${manifest.name} deployment manifest`,
    blocks,
  };
}

/** The JSON export, carrying the manifest and the checks beside it. */
export function jsonExport(input: {
  manifest: DeploymentManifest;
  version: number;
  statement?: string;
  modules?: CatalogueModule[];
}): Record<string, unknown> {
  return {
    name: input.manifest.name,
    version: input.version,
    manifestVersion: input.manifest.manifest_version,
    blueprintHash: input.manifest.blueprintHash,
    manifestHash: input.manifest.manifestHash,
    compliance: 'Controls implemented, certification not held.',
    summary: input.manifest.summary,
    groups: Object.fromEntries(
      MANIFEST_GROUPS.map((group) => [
        group,
        {
          heading: GROUP_WORDING[group].heading,
          states: GROUP_WORDING[group].states,
          screen: GROUP_WORDING[group].screen,
          lines: linesOfGroup(input.manifest, group).map((line) => ({
            subject: line.subject,
            details: Object.fromEntries(
              line.details.map((detail) => [detail.label, detail.value]),
            ),
            screen: line.screen,
          })),
        },
      ]),
    ),
    intent:
      input.statement && input.statement.trim().length > 0
        ? reconcileIntent(input.statement, input.manifest)
        : null,
    recommendationGaps:
      input.modules && input.modules.length > 0
        ? gapsForManifest(input.manifest, input.modules)
        : [],
  };
}

/** Reports whether one plan follows the writing rules. */
export function planFollowsRules(plan: DocumentPlan): string[] {
  const faults: string[] = [];
  for (const block of plan.blocks) {
    if (block.kind === 'title' || block.kind === 'heading') {
      if (block.text.trim().endsWith('.')) {
        faults.push(`The heading "${block.text}" carries a full stop.`);
      }
    }
    if (block.kind === 'numbered' && block.lead.trim().length === 0) {
      faults.push(`Numbered point ${block.index} carries no lead term.`);
    }
    if (block.kind === 'paragraph') {
      for (const run of block.runs) {
        if (run.text.includes('—')) faults.push(`A paragraph carries an em dash. ${run.text}`);
      }
    }
  }
  return faults;
}
