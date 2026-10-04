// apps/frontend/src/lib/studio/template-build.ts
// What disclosure level one writes into the Blueprint.
//
// Level one shows no structure. A person answers plain questions and Cerulea
// deploys. The same Blueprint results, so moving to level two afterwards shows
// exactly the parts level one installed.
//
// Without this module level one would need its own idea of a system, and the
// two levels would drift apart.

import type { CatalogueModule, CatalogueTemplate } from '@/lib/catalogue/types';
import { indexModules, resolveDependencyClosure } from '@/lib/modules/resolve';
import type { BuildState } from '@/lib/studio/project-state';

/** The questions level one asks beyond the five policy questions. */
export type TemplateAnswers = {
  projectName: string;
  summary: string;
  templateId: string;
  /** The five policy answers, in the words the profile solver reads. */
  declarations: Record<string, string>;
};

export type TemplatePlan = {
  templateId: string;
  /** Every part Cerulea installs, dependencies before the part that needs them. */
  moduleIds: string[];
  /** Parts the template names that the catalogue does not hold. */
  missing: string[];
};

/** The five questions the profile solver reads, named once. */
export const DECLARATION_IDS = [
  'confirmation',
  'operators',
  'errorCost',
  'split',
  'retention',
] as const;

/** Resolves one template into the part set Cerulea installs. */
export function planFromTemplate(
  templateId: string,
  templates: CatalogueTemplate[],
  modules: CatalogueModule[],
): TemplatePlan {
  const template = templates.find((entry) => entry.id === templateId);
  if (template === undefined) {
    return { templateId, moduleIds: [], missing: [] };
  }
  const seeds = template.modules ?? template.preinstalledModules ?? [];
  const closure = resolveDependencyClosure(seeds, indexModules(modules));
  return { templateId, moduleIds: closure.installed, missing: closure.missing };
}

/** Names the first question still waiting for an answer. */
export function firstUnanswered(answers: TemplateAnswers): string | null {
  if (answers.projectName.trim().length < 2) {
    return 'Type a name of at least two characters, so a colleague finds this work.';
  }
  if (answers.summary.trim().length < 8) {
    return 'Write one sentence stating what this system does, so we check the result against it.';
  }
  if (answers.templateId.length === 0) {
    return 'Choose the kind of system closest to the one we are building.';
  }
  for (const id of DECLARATION_IDS) {
    if (!answers.declarations[id]) {
      return 'Answer every question above, so Cerulea settles the agreement rules for us.';
    }
  }
  return null;
}

/** Reports whether every question carries an answer. */
export function answersComplete(answers: TemplateAnswers): boolean {
  return firstUnanswered(answers) === null;
}

/** One sentence stating what level one is about to build. */
export function describePlan(plan: TemplatePlan, collectionCount: number): string {
  if (plan.moduleIds.length === 0) {
    return 'Choose the kind of system above and Cerulea states what it builds.';
  }
  return (
    `Cerulea builds ${plan.moduleIds.length} parts and keeps ${collectionCount} kinds of record. ` +
    'Everything stays changeable afterwards.'
  );
}

/** Turns the five declarations into the answers the build state keeps. */
export function buildStateAnswers(
  answers: Record<string, string>,
): BuildState['policies']['answers'] {
  return {
    confirmationPreference: answers.confirmation === 'MaximumCertainty' ? 'certain' : 'instant',
    organisationCount:
      answers.operators === 'SingleOrganisation'
        ? 1
        : answers.operators === 'ManyOrganisations'
          ? 50
          : 10,
    wrongRecordCost:
      answers.errorCost === 'Recoverable'
        ? 'low'
        : answers.errorCost === 'Irreversible'
          ? 'severe'
          : 'high',
    serveDuringSplit: answers.split === 'KeepServing',
    provableYears:
      answers.retention === 'RecentOnly' ? 1 : answers.retention === 'SeveralYears' ? 3 : 100,
  };
}

/** Turns the build state answers back into the five declarations, for a reopened project. */
export function declarationsFromBuildState(
  policies: BuildState['policies'],
): Record<string, string> {
  const held = policies.answers;
  const out: Record<string, string> = {};
  if (held.confirmationPreference) {
    out.confirmation =
      held.confirmationPreference === 'certain' ? 'MaximumCertainty' : 'InstantConfirmation';
  }
  if (held.organisationCount !== undefined) {
    out.operators =
      held.organisationCount <= 1
        ? 'SingleOrganisation'
        : held.organisationCount >= 50
          ? 'ManyOrganisations'
          : 'SeveralOrganisations';
  }
  if (held.wrongRecordCost) {
    out.errorCost =
      held.wrongRecordCost === 'low'
        ? 'Recoverable'
        : held.wrongRecordCost === 'severe'
          ? 'Irreversible'
          : 'Expensive';
  }
  if (held.serveDuringSplit !== undefined) {
    out.split = held.serveDuringSplit ? 'KeepServing' : 'HaltToStayConsistent';
  }
  if (held.provableYears !== undefined) {
    out.retention =
      held.provableYears <= 1 ? 'RecentOnly' : held.provableYears <= 3 ? 'SeveralYears' : 'Permanent';
  }
  return out;
}
