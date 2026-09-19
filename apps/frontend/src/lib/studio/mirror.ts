// apps/frontend/src/lib/studio/mirror.ts
// The plain-language mirror under every control.
//
// Each technical setting carries a sentence stating what the setting does and
// a sentence stating what breaks without it. The 225 module descriptions
// supply the text wherever a control stands for a module. The controls that
// stand for a platform property carry an authored pair.
//
// The audit at the end of this module walks a rendered screen and names every
// control carrying no mirror. A test runs that audit over each control screen,
// so a control added later without a mirror fails the build.
//
// Without the mirror a person meets a label and a number with no meaning.

import type { CatalogueModule } from '@/lib/catalogue/types';
import { SEED_MODULES } from '@/lib/catalogue/seed';
import { firstClause, removalConsequence } from '@/lib/outcomes/catalogue';

export type Mirror = {
  /** What the control does, in one sentence. */
  does: string;
  /** What breaks without it, in one sentence. */
  breaks: string;
};

function endStop(text: string): string {
  const held = text.trim();
  if (held.length === 0) return held;
  return /[.!?]$/.test(held) ? held : `${held}.`;
}

/** The mirror one module supplies, read from the catalogue. */
export function mirrorForModule(
  moduleId: string,
  modules: CatalogueModule[] = SEED_MODULES,
): Mirror | undefined {
  const part = modules.find((entry) => entry.moduleId === moduleId);
  if (part === undefined) return undefined;
  const does = part.longDescription?.[0] ?? part.blurb ?? firstClause(part.title);
  return {
    does: endStop(does),
    breaks: endStop(removalConsequence(part, modules)),
  };
}

/**
 * The mirror for every control that stands for a platform property.
 * A control naming a module reads its mirror from the catalogue instead.
 */
export const PLATFORM_MIRRORS: Record<string, Mirror> = {
  'project.name': {
    does: 'The name a colleague reads beside this work, and the name the deployed system carries.',
    breaks: 'Without a name nobody finds this work again in the project list.',
  },
  'project.summary': {
    does: 'One or two sentences stating what this system does.',
    breaks:
      'Cerulea checks the finished system against this statement, so an empty statement leaves nothing to check against.',
  },
  'project.workspace': {
    does: 'A project stays in the workspace it opened in, and colleagues reach it through that workspace.',
    breaks: 'Without a workspace nobody beside you reaches the work.',
  },
  'project.template': {
    does: 'The working system Cerulea starts from, already populated and already valid.',
    breaks: 'Without a starting point the canvas opens empty and every part is added by hand.',
  },
  'project.track': {
    does: 'Where the records live. The public-access chain is open to everybody. A private chain is open to the members you admit.',
    breaks: 'The wrong choice publishes records you meant to hold back, or hides records you meant to publish.',
  },
  'project.publish_selected': {
    does: 'Publishes the records you choose to the public-access chain while the rest stay private.',
    breaks: 'Without it every record in this system stays inside the private chain.',
  },
  'blueprint.document': {
    does: 'The typed document Cerulea deploys. Every level writes this same document.',
    breaks: 'A value the schema refuses stops the whole Blueprint from compiling.',
  },
  'blueprint.collection_privacy': {
    does: 'How much of a record the Blockchain holds in the open.',
    breaks: 'An open class publishes every field, and an encrypted class hides a field from a reader who needs it.',
  },
  'blueprint.retention_days': {
    does: 'How long a record stays provable against the chain.',
    breaks: 'A short period stops an audit reaching further back. A long period raises the storage every node carries.',
  },
  'blueprint.retention_expiry': {
    does: 'What Cerulea does with a record once its period ends.',
    breaks: 'Without a rule a record stays for ever and the storage grows without limit.',
  },
  'blueprint.purpose': {
    does: 'Why the deployment holds this data. A read outside the declared purpose is refused and recorded.',
    breaks: 'Without a purpose the compiler refuses the collection and no deployment starts.',
  },
  'blueprint.field_name': {
    does: 'The name this value carries inside the record.',
    breaks: 'A name the Blueprint refuses stops the whole document from compiling.',
  },
  'blueprint.field_type': {
    does: 'The kind of value this field holds.',
    breaks: 'A wrong type refuses the values a person enters every day.',
  },
  'blueprint.field_note': {
    does: 'The sentence a reviewer reads beside this field in the Deployment Manifest.',
    breaks: 'Without it a reviewer meets a bare field name and asks what it holds.',
  },
  'blueprint.field_required': {
    does: 'A required field carries a value on every record.',
    breaks: 'Leaving it open admits records with the value missing, and a rule reading that value then fails.',
  },
  'blueprint.role': {
    does: 'A role names a group of people who reach the same records.',
    breaks: 'Without a role nobody reaches a record at all.',
  },
  'blueprint.capability': {
    does: 'What this role does with this collection.',
    breaks: 'Too little stops the work. Too much lets a person change a record they should only read.',
  },
  'blueprint.row_filter': {
    does: 'Limits a role to the rows it qualifies for.',
    breaks: 'Without the limit the role reads every row in the collection.',
  },
  'blueprint.rule_statement': {
    does: 'The sentence a person reads when this rule declines a change.',
    breaks: 'Without it a refusal arrives with no reason and nobody knows what to correct.',
  },
  'blueprint.rule_kind': {
    does: 'An invariant holds at every moment. A precondition holds before an action runs.',
    breaks: 'The wrong choice checks the rule at the wrong moment and lets a bad record through.',
  },
  'blueprint.rule_formula': {
    does: 'Cerulea checks this formula against the record while you type.',
    breaks: 'A rule with a broken formula stops the whole Blueprint from compiling.',
  },
  'blueprint.action_class': {
    does: 'The class sets the share of validators that must agree before the action commits.',
    breaks: 'A low class commits a treasury movement at the everyday threshold.',
  },
  'blueprint.workflow_state': {
    does: 'A state is one place a record rests inside its workflow.',
    breaks: 'A state nothing reaches leaves work stuck with no way forward.',
  },
  'blueprint.workflow_transition': {
    does: 'A move carries a record from one state to another.',
    breaks: 'Without a move out of a state the work stops there for good.',
  },
  'blueprint.workflow_timer': {
    does: 'A timer moves a record on by itself once the period passes.',
    breaks: 'Without it a record waits for a person who may never come.',
  },
  'network.block_seconds': {
    does: 'Cerulea gathers transactions and commits them together at this interval.',
    breaks:
      'A very short interval raises message volume across validators. A long interval makes every confirmation wait.',
  },
  'network.history_days': {
    does: 'Every node keeps the history for this long, so a record stays provable across that window.',
    breaks: 'A short window stops an audit reaching further back. A long window raises the storage every node carries.',
  },
  'network.substrate': {
    does: 'Where the work runs. Native interpretation reads the Blueprint directly.',
    breaks: 'Another substrate runs under its own rules, so parallel execution and per-domain finality stop applying.',
  },
  'policy.confirmation': {
    does: 'A record confirms sooner when fewer validators must agree.',
    breaks: 'The wrong answer either makes everyday work wait or commits it on too little agreement.',
  },
  'policy.operators': {
    does: 'The number of organisations holding a seat in the validator set.',
    breaks: 'Too few seats let one party hold the network. Too many raise the cost of every agreement.',
  },
  'policy.error_cost': {
    does: 'What a wrong record costs this organisation.',
    breaks: 'A low answer commits a costly mistake at the everyday threshold.',
  },
  'policy.split': {
    does: 'What the network does while it splits in two.',
    breaks: 'Serving through a split admits records the other half never saw. Halting stops the work until the split heals.',
  },
  'policy.retention': {
    does: 'How far back a proof reaches.',
    breaks: 'A short answer stops an audit reaching the records it needs.',
  },
  'policy.profile': {
    does: 'The agreement profile this deployment runs under.',
    breaks: 'Without a profile the deployment holds no agreement thresholds and no deployment starts.',
  },
  'manifest.search': {
    does: 'Narrows every line of the manifest to the words typed here.',
    breaks: 'Without it a long manifest is read from top to bottom.',
  },
  'manifest.comparison_version': {
    does: 'The earlier version this manifest is set against.',
    breaks: 'Without a version the comparison shows every line as an addition.',
  },
  'workspace.application': {
    does: 'The application this workspace serves. Each one carries its own parts, its own language and its own commercial gates.',
    breaks: 'The wrong application offers parts this audience never uses and hides the parts it needs.',
  },
  'workspace.language': {
    does: 'The language every screen in Studio reads in.',
    breaks: 'Without a language the screens stay in English for a person who reads another.',
  },
};

/** Reads the mirror for one control, whichever source holds it. */
export function mirrorFor(controlId: string, modules: CatalogueModule[] = SEED_MODULES): Mirror {
  const platform = PLATFORM_MIRRORS[controlId];
  if (platform) return platform;
  const moduleMirror = mirrorForModule(controlId, modules);
  if (moduleMirror) return moduleMirror;
  return {
    does: 'This control changes one property of the system.',
    breaks: 'Leaving it unset holds the property Cerulea started from.',
  };
}

/** The two sentences joined, for a helper line under one field. */
export function mirrorText(controlId: string, modules: CatalogueModule[] = SEED_MODULES): string {
  const held = mirrorFor(controlId, modules);
  return `${held.does} ${held.breaks}`;
}

/* The audit ------------------------------------------------------------ */

const CONTROL_SELECTOR = [
  'input:not([type="hidden"])',
  'textarea',
  'select',
  '[role="combobox"]',
  '[role="switch"]',
].join(', ');

function accessibleName(element: Element, root: ParentNode): string {
  const label = element.getAttribute('aria-label');
  if (label && label.trim().length > 0) return label.trim();
  const labelledBy = element.getAttribute('aria-labelledby');
  if (labelledBy) {
    const named = labelledBy
      .split(/\s+/)
      .map((id) => (root as Document | Element).querySelector?.(`#${CSS.escape(id)}`)?.textContent ?? '')
      .join(' ')
      .trim();
    if (named.length > 0) return named;
  }
  const id = element.getAttribute('id');
  if (id) {
    const bound = (root as Document | Element).querySelector?.(`label[for="${CSS.escape(id)}"]`);
    if (bound?.textContent) return bound.textContent.trim();
  }
  const wrapping = element.closest('label');
  if (wrapping?.textContent) return wrapping.textContent.trim();
  return element.getAttribute('name') ?? element.tagName.toLowerCase();
}

function describedText(element: Element, root: ParentNode): string {
  const describedBy = element.getAttribute('aria-describedby');
  if (!describedBy) return '';
  return describedBy
    .split(/\s+/)
    .map((id) => (root as Document | Element).querySelector?.(`#${CSS.escape(id)}`)?.textContent ?? '')
    .join(' ')
    .trim();
}

/** Reports whether one control carries a mirror a person reads. */
export function controlCarriesMirror(element: Element, root: ParentNode): boolean {
  if (describedText(element, root).length > 0) return true;
  let held: Element | null = element;
  for (let depth = 0; depth < 6 && held !== null; depth += 1) {
    if (held.querySelector('[data-mirror]') !== null) return true;
    if (held.getAttribute('data-mirror') !== null) return true;
    held = held.parentElement;
  }
  const group = element.closest('[role="radiogroup"], fieldset');
  if (group && group.querySelector('[data-mirror]') !== null) return true;
  return false;
}

/**
 * Reports whether a person reaches this control at all.
 * Material UI renders a hidden field beside a select and a hidden copy beside
 * a multiline field. Neither one is a control a person meets.
 */
export function controlIsReachable(element: Element): boolean {
  if (element.getAttribute('aria-hidden') === 'true') return false;
  if (element.closest('[aria-hidden="true"]') !== null) return false;
  if (element.getAttribute('type') === 'hidden') return false;
  if (element.classList.contains('MuiSelect-nativeInput')) return false;
  if (element.getAttribute('tabindex') === '-1' && element.hasAttribute('readonly')) return false;
  return true;
}

/**
 * Walks one rendered screen and names every control carrying no mirror.
 * A radio inside a group reads the mirror of the group.
 */
export function controlsWithoutMirror(container: ParentNode): string[] {
  const missing: string[] = [];
  const controls = Array.from(container.querySelectorAll(CONTROL_SELECTOR)).filter(
    controlIsReachable,
  );
  for (const control of controls) {
    const kind = control.getAttribute('type');
    if (kind === 'radio' || kind === 'checkbox') {
      const group = control.closest('[role="radiogroup"], fieldset, [data-control-group]');
      if (group && controlCarriesMirror(group, container)) continue;
    }
    if (controlCarriesMirror(control, container)) continue;
    missing.push(accessibleName(control, container));
  }
  return Array.from(new Set(missing));
}
