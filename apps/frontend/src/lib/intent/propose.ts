// apps/frontend/src/lib/intent/propose.ts
// Turns a plain-language description into a proposal.
// Cerulea proposes a track, a template and a set of outcomes, and states the
// reason for each one. Every reason names the words from the description that
// led there. The user confirms or adjusts.
//
// This matcher reads the catalogue that ships with Cerulea. It reaches no
// service. The same description always produces the same proposal.

import type { CatalogueModule, CatalogueTemplate, ProjectTrack } from '@/lib/catalogue/types';
import { deriveOutcomes, type Outcome } from '@/lib/outcomes/catalogue';
import { reasonFromTerms, scoreDocuments, type ScorableDocument } from './match';

export type TemplateProposal = {
  template: CatalogueTemplate;
  score: number;
  coverage: number;
  matchedTerms: string[];
  reason: string;
};

export type OutcomeProposal = {
  outcome: Outcome;
  score: number;
  matchedTerms: string[];
  reason: string;
};

export type TrackProposal = {
  track: ProjectTrack;
  /** The plain name a user reads for the track. */
  label: string;
  reason: string;
};

export type IntentProposal = {
  description: string;
  terms: string[];
  track: TrackProposal;
  templates: TemplateProposal[];
  outcomes: OutcomeProposal[];
  /** True while the description shares no term with the catalogue. */
  empty: boolean;
};

export type ProposeOptions = {
  templateLimit?: number;
  outcomeLimit?: number;
};

export const TRACK_LABEL: Record<ProjectTrack, string> = {
  blockchain: 'A private Blockchain network',
  dapp: 'An application on the public-access chain',
};

function templateDocument(template: CatalogueTemplate, moduleTitles: Map<string, string>): ScorableDocument {
  const modules = template.modules ?? template.preinstalledModules ?? [];
  return {
    id: template.id,
    fields: {
      name: [template.title],
      tag: template.tags,
      description: [template.description],
      detail: [
        ...(template.ui?.pages ?? []),
        ...modules.map((moduleId) => moduleTitles.get(moduleId) ?? moduleId),
      ],
    },
  };
}

function outcomeDocument(outcome: Outcome): ScorableDocument {
  return {
    id: outcome.outcomeId,
    fields: {
      name: [outcome.statement],
      tag: outcome.tags,
      category: [outcome.group],
      detail: [outcome.contribution, outcome.removalConsequence],
    },
  };
}

/**
 * Derives the track from the templates the description points to.
 * A description that points at private Blockchain templates proposes a private
 * network. Every other description proposes the public-access chain.
 * The user overrides the track at any time.
 */
export function proposeTrack(templates: TemplateProposal[]): TrackProposal {
  if (templates.length === 0) {
    return {
      track: 'dapp',
      label: TRACK_LABEL.dapp,
      reason: 'Our description points at no template yet, so Cerulea starts on the public-access chain.',
    };
  }
  let privateWeight = 0;
  let publicWeight = 0;
  for (const candidate of templates) {
    if (candidate.template.projectType === 'blockchain') privateWeight += candidate.score;
    else publicWeight += candidate.score;
  }
  const track: ProjectTrack = privateWeight > publicWeight ? 'blockchain' : 'dapp';
  const leader = templates[0];
  return {
    track,
    label: TRACK_LABEL[track],
    reason:
      track === 'blockchain'
        ? `The closest templates, starting with ${leader.template.title}, run on a private Blockchain network.`
        : `The closest templates, starting with ${leader.template.title}, run on the public-access chain.`,
  };
}

/**
 * Reads a plain-language description and proposes what to build.
 * The proposal names the reason behind every line.
 */
export function proposeFromDescription(
  description: string,
  catalogue: { modules: CatalogueModule[]; templates: CatalogueTemplate[] },
  options: ProposeOptions = {},
): IntentProposal {
  const moduleTitles = new Map(catalogue.modules.map((module) => [module.moduleId, module.title]));
  const outcomes = deriveOutcomes(catalogue.modules);
  const outcomeById = new Map(outcomes.map((outcome) => [outcome.outcomeId, outcome]));
  const templateById = new Map(catalogue.templates.map((template) => [template.id, template]));

  const templateScores = scoreDocuments(
    description,
    catalogue.templates.map((template) => templateDocument(template, moduleTitles)),
    options.templateLimit ?? 5,
  );
  const outcomeScores = scoreDocuments(
    description,
    outcomes.map(outcomeDocument),
    options.outcomeLimit ?? 8,
  );

  const templateProposals: TemplateProposal[] = templateScores.map((scored) => ({
    template: templateById.get(scored.id) as CatalogueTemplate,
    score: scored.score,
    coverage: scored.coverage,
    matchedTerms: scored.matchedTerms,
    reason: reasonFromTerms(scored.matchedTerms),
  }));

  const outcomeProposals: OutcomeProposal[] = outcomeScores.map((scored) => ({
    outcome: outcomeById.get(scored.id) as Outcome,
    score: scored.score,
    matchedTerms: scored.matchedTerms,
    reason: reasonFromTerms(scored.matchedTerms),
  }));

  const track = proposeTrack(templateProposals);

  return {
    description,
    terms: Array.from(
      new Set([
        ...templateProposals.flatMap((item) => item.matchedTerms),
        ...outcomeProposals.flatMap((item) => item.matchedTerms),
      ]),
    ),
    track,
    templates: templateProposals,
    outcomes: outcomeProposals,
    empty: templateProposals.length === 0 && outcomeProposals.length === 0,
  };
}
