// apps/frontend/src/lib/intent/intelligence.ts
// The Describe it door through Cerulea Intelligence.
//
// A person writes one sentence. Studio sends it to Cerulea Intelligence inside
// a thread of the project and asks for the template and the parts the system
// needs, each with a reason. Cerulea Intelligence answers in words. This module
// builds that question and reads the answer back into the same proposal shape
// the catalogue matcher produces, so the Foundation step shows both the same
// way. When the answer names nothing the catalogue holds, the matcher in
// lib/intent/propose.ts stands in.
//
// Every identifier the answer names is checked against the catalogue. Cerulea
// installs nothing a sentence alone invented.

import type { CatalogueModule, CatalogueTemplate, ProjectTrack } from '@/lib/catalogue/types';
import { deriveOutcomes, type Outcome } from '@/lib/outcomes/catalogue';
import { TRACK_LABEL, type IntentProposal, type OutcomeProposal, type TemplateProposal } from './propose';

/** The screen name Cerulea Intelligence reads for the Describe it door. */
export const DESCRIBE_SCREEN = 'studio.step.0.describe';

/** The most templates and parts the question asks for. */
export const TEMPLATE_ASK = 2;
export const MODULE_ASK = 8;

/** The applications a sentence can point at. */
export type ApplicationName = 'dapps' | 'enterprise' | 'government';

export type ApplicationHint = {
  application: ApplicationName;
  reason: string;
};

/** What Cerulea Intelligence named, before the catalogue check. */
export type NamedLine = {
  kind: 'template' | 'module' | 'application';
  value: string;
  reason: string;
};

/**
 * Builds the question Studio sends.
 * The form asked for keeps the answer readable by a person and by this module.
 */
export function describeQuestion(description: string): string {
  const sentence = description.trim().replace(/\s+/g, ' ');
  return [
    `We describe a system in plain words: "${sentence}"`,
    'Name the Cerulea template that fits best and the catalogue parts the system needs.',
    'Answer with one line for each, in this exact form, and one sentence of reason after each identifier:',
    'template: <template identifier> - <reason>',
    'module: <module identifier> - <reason>',
    'application: <dapps, enterprise or government> - <reason>',
    `Name identifiers that exist in the Cerulea catalogue. Name at most ${TEMPLATE_ASK} templates and at most ${MODULE_ASK} modules.`,
  ].join('\n');
}

const LINE = /^\s*(?:[-*\d.)]+\s*)?(template|module|application)\s*[:=]\s*[`'"]?([a-z0-9][a-z0-9 _./-]*?)[`'"]?\s*(?:[-:,;]\s*(.*))?$/i;

/** Reads every template, module and application line out of an answer. */
export function readNamedLines(reply: string): NamedLine[] {
  const lines: NamedLine[] = [];
  for (const raw of reply.split(/\r?\n/)) {
    const match = LINE.exec(raw);
    if (!match) continue;
    const kind = match[1].toLowerCase() as NamedLine['kind'];
    const value = match[2].trim().toLowerCase();
    if (value.length === 0) continue;
    lines.push({ kind, value, reason: (match[3] ?? '').trim() });
  }
  return lines;
}

function slugOf(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** Finds the template a named value points at, by identifier or by title. */
export function matchTemplate(value: string, templates: CatalogueTemplate[]): CatalogueTemplate | null {
  const wanted = value.trim().toLowerCase();
  const slug = slugOf(wanted);
  return (
    templates.find((template) => template.id.toLowerCase() === wanted) ??
    templates.find((template) => slugOf(template.id) === slug) ??
    templates.find((template) => slugOf(template.title) === slug) ??
    null
  );
}

/** Finds the module a named value points at, by identifier or by title. */
export function matchModule(value: string, modules: CatalogueModule[]): CatalogueModule | null {
  const wanted = value.trim().toLowerCase();
  const slug = slugOf(wanted);
  return (
    modules.find((part) => part.moduleId.toLowerCase() === wanted) ??
    modules.find((part) => slugOf(part.moduleId) === slug) ??
    modules.find((part) => slugOf(part.title) === slug) ??
    null
  );
}

function applicationOf(value: string): ApplicationName | null {
  const held = value.toLowerCase();
  if (held.startsWith('gov')) return 'government';
  if (held.startsWith('enterprise') || held.startsWith('sme')) return 'enterprise';
  if (held.startsWith('dapp')) return 'dapps';
  return null;
}

function reasonOr(reason: string, fallback: string): string {
  const held = reason.trim().replace(/\s+/g, ' ');
  if (held.length === 0) return fallback;
  return /[.!?]$/.test(held) ? held : `${held}.`;
}

export type IntelligenceReading = {
  proposal: IntentProposal;
  applicationHint: ApplicationHint | null;
  /** The identifiers the answer named that the catalogue holds nothing for. */
  unmatched: string[];
};

/**
 * Reads the answer of Cerulea Intelligence into a proposal.
 * The proposal is empty when no named template or part exists in the catalogue.
 */
export function readIntelligenceReply(
  description: string,
  reply: string,
  catalogue: { modules: CatalogueModule[]; templates: CatalogueTemplate[] },
): IntelligenceReading {
  const lines = readNamedLines(reply);
  const outcomes = deriveOutcomes(catalogue.modules);
  const outcomeByModule = new Map(outcomes.map((outcome) => [outcome.anchorModuleId, outcome]));

  const templates: TemplateProposal[] = [];
  const outcomeProposals: OutcomeProposal[] = [];
  const unmatched: string[] = [];
  let applicationHint: ApplicationHint | null = null;
  const seenTemplates = new Set<string>();
  const seenModules = new Set<string>();

  for (const line of lines) {
    if (line.kind === 'template') {
      const template = matchTemplate(line.value, catalogue.templates);
      if (!template) {
        unmatched.push(line.value);
        continue;
      }
      if (seenTemplates.has(template.id) || templates.length >= TEMPLATE_ASK) continue;
      seenTemplates.add(template.id);
      templates.push({
        template,
        score: TEMPLATE_ASK - templates.length,
        coverage: 1,
        matchedTerms: [],
        reason: reasonOr(line.reason, `Cerulea Intelligence named ${template.title} for this description.`),
      });
    } else if (line.kind === 'module') {
      const part = matchModule(line.value, catalogue.modules);
      if (!part) {
        unmatched.push(line.value);
        continue;
      }
      const outcome = outcomeByModule.get(part.moduleId) as Outcome;
      if (seenModules.has(part.moduleId) || outcomeProposals.length >= MODULE_ASK) continue;
      seenModules.add(part.moduleId);
      outcomeProposals.push({
        outcome,
        score: MODULE_ASK - outcomeProposals.length,
        matchedTerms: [],
        reason: reasonOr(line.reason, `Cerulea Intelligence named ${part.title} for this description.`),
      });
    } else if (!applicationHint) {
      const application = applicationOf(line.value);
      if (application) {
        applicationHint = {
          application,
          reason: reasonOr(line.reason, `Cerulea Intelligence reads this as a ${application} system.`),
        };
      }
    }
  }

  // The template leads the track. Parts alone decide when no template matched.
  let track: ProjectTrack = 'dapp';
  let trackReason = 'Cerulea Intelligence named no template, so the project starts on the public-access chain.';
  if (templates.length > 0) {
    track = templates[0].template.projectType;
    trackReason =
      track === 'blockchain'
        ? `${templates[0].template.title} runs on a private Blockchain network.`
        : `${templates[0].template.title} runs on the public-access chain.`;
  } else if (outcomeProposals.length > 0) {
    const privateCount = outcomeProposals.filter((item) => item.outcome.projectType === 'blockchain').length;
    track = privateCount * 2 > outcomeProposals.length ? 'blockchain' : 'dapp';
    trackReason =
      track === 'blockchain'
        ? 'Most of the parts Cerulea Intelligence named run on a private Blockchain network.'
        : 'Most of the parts Cerulea Intelligence named run on the public-access chain.';
  }

  return {
    proposal: {
      description,
      terms: [],
      track: { track, label: TRACK_LABEL[track], reason: trackReason },
      templates,
      outcomes: outcomeProposals,
      empty: templates.length === 0 && outcomeProposals.length === 0,
    },
    applicationHint,
    unmatched,
  };
}
