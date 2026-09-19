// apps/frontend/src/lib/accessibility/audit.ts
// The accessibility check Studio runs over its own screens.
//
// Cerulea checks contrast, focus order, labelling, keyboard reach and target
// size against the Web Content Accessibility Guidelines version 2.2 level AA.
// The tests run this check over every route and every wizard step, so a screen
// that fails never reaches a person.
//
// The generated application carries its own check inside Cerulea APIs. This
// module checks the Studio screens a person builds with.
//
// Without this check a screen would reach a person who cannot use it.

import axe, { type AxeResults, type Result } from 'axe-core';

/** The guideline level every Studio screen meets. */
export const GUIDELINE_LEVEL = 'Web Content Accessibility Guidelines version 2.2 level AA';

/** The rule sets the check runs. */
export const RULE_SETS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

export type AccessibilityFinding = {
  /** The rule the finding rests on. */
  rule: string;
  /** What is wrong, in one sentence. */
  problem: string;
  /** What to do about it, in one sentence. */
  fix: string;
  /** The places on the screen that carry the fault. */
  places: string[];
  impact: string;
};

export type AccessibilityOutcome = {
  passes: boolean;
  findings: AccessibilityFinding[];
  /** One sentence stating the outcome. */
  headline: string;
};

function findingOf(result: Result): AccessibilityFinding {
  return {
    rule: result.id,
    problem: result.help,
    fix:
      result.nodes[0]?.failureSummary?.replace(/\s+/g, ' ').trim() ??
      `Correct the ${result.id} rule on this screen.`,
    places: result.nodes.map((node) => node.target.join(' ')),
    impact: result.impact ?? 'moderate',
  };
}

/** One sentence stating the outcome of a check. */
export function headlineFor(findings: AccessibilityFinding[], screen: string): string {
  if (findings.length === 0) {
    return `${screen} meets the ${GUIDELINE_LEVEL}.`;
  }
  return `${screen} holds ${findings.length} ${findings.length === 1 ? 'fault' : 'faults'} against the ${GUIDELINE_LEVEL}.`;
}

/**
 * Runs the check over one rendered screen.
 * The answer names every fault, the places it sits and the fix.
 */
export async function auditScreen(
  element: Element,
  screen = 'This screen',
): Promise<AccessibilityOutcome> {
  const results: AxeResults = await axe.run(element, {
    runOnly: { type: 'tag', values: RULE_SETS },
    resultTypes: ['violations'],
  });
  const findings = results.violations.map(findingOf);
  return { passes: findings.length === 0, findings, headline: headlineFor(findings, screen) };
}

/** One sentence per fault, for a failure message a person reads. */
export function describeFindings(findings: AccessibilityFinding[]): string {
  return findings
    .map((finding) => `${finding.rule}. ${finding.problem}. ${finding.fix}`)
    .join('\n');
}

/* Keyboard reach -------------------------------------------------------- */

/** The elements a person reaches with the keyboard, in the order they reach them. */
export const FOCUSABLE = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ');

/** Reports whether a person reaches this element with the keyboard. */
export function reachable(element: Element): boolean {
  if (element.getAttribute('aria-hidden') === 'true') return false;
  if (element.closest('[aria-hidden="true"]') !== null) return false;
  if (element.getAttribute('tabindex') === '-1') return false;
  return true;
}

/** Every control a person reaches with the keyboard on one screen. */
export function keyboardOrder(container: ParentNode): Element[] {
  return Array.from(container.querySelectorAll(FOCUSABLE)).filter(reachable);
}

export type ReachFault = {
  /** The name a person hears for the control. */
  name: string;
  problem: string;
  fix: string;
};

/**
 * The name a screen reader announces for one control.
 * The order follows the accessible name computation. An aria-label first, then
 * the elements aria-labelledby names, then a bound label, then a wrapping
 * label, then the text inside the control.
 */
export function accessibleName(element: Element, root: ParentNode = document): string {
  const label = element.getAttribute('aria-label');
  if (label && label.trim().length > 0) return label.trim();

  const labelledBy = element.getAttribute('aria-labelledby');
  if (labelledBy) {
    const named = labelledBy
      .split(/\s+/)
      .map((id) => (root as Document).getElementById?.(id)?.textContent ?? '')
      .join(' ')
      .trim();
    if (named.length > 0) return named;
  }

  const id = element.getAttribute('id');
  if (id) {
    const bound = (root as Document | Element).querySelector?.(
      `label[for="${CSS.escape(id)}"]`,
    );
    const text = bound?.textContent?.replace(/\s+/g, ' ').trim() ?? '';
    if (text.length > 0) return text;
  }

  const wrapping = element.closest('label');
  const wrapped = wrapping?.textContent?.replace(/\s+/g, ' ').trim() ?? '';
  if (wrapped.length > 0) return wrapped;

  const text = element.textContent?.replace(/\s+/g, ' ').trim() ?? '';
  if (text.length > 0) return text;

  const placeholder = element.getAttribute('placeholder');
  if (placeholder && placeholder.trim().length > 0) return placeholder.trim();

  return element.tagName.toLowerCase();
}

/**
 * Every control a keyboard reaches that carries no name.
 * A person using a screen reader hears the name, so a control without one is
 * a control they cannot identify.
 */
export function unnamedControls(container: ParentNode): ReachFault[] {
  return keyboardOrder(container)
    .filter((element) => {
      const name = accessibleName(element, container);
      return name === element.tagName.toLowerCase();
    })
    .map((element) => ({
      name: element.tagName.toLowerCase(),
      problem: 'A person using a screen reader hears no name for this control.',
      fix: 'Give the control a label, or an aria-label naming what it does.',
    }));
}
