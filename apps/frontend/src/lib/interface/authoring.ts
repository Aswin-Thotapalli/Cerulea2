// apps/frontend/src/lib/interface/authoring.ts
// The reading Step 5 does over the section the engine generated.
// Step 5 opens on a finished application. These calls group the screens, the
// component set, the translated strings and the accessibility findings so a
// person reads the application rather than a list of records.
// Without them each screen would repeat the same grouping.

import type {
  AccessibilityFinding,
  ComponentEntry,
  ComponentNode,
  InterfaceSection,
  Screen,
  ThemeToken,
} from './types';

/** The order a person meets the screen kinds. */
export const SCREEN_KIND_ORDER = ['list', 'detail', 'create', 'edit', 'approval', 'custom'];

/** The words a person reads for one screen kind. */
export const SCREEN_KIND_WORDS: Record<string, string> = {
  list: 'List',
  detail: 'Detail',
  create: 'Add',
  edit: 'Change',
  approval: 'Approval',
  custom: 'Custom',
};

/** The words a person reads for one component group. */
export const GROUP_WORDS: Record<string, string> = {
  layout: 'Layout',
  data: 'Data',
  input: 'Input',
  chain: 'Blockchain',
  chrome: 'Chrome',
  feedback: 'Feedback',
};

/** The screens of one collection, in the order a person meets them. */
export function screensOfCollection(section: InterfaceSection, collection: string): Screen[] {
  return section.screens
    .filter((screen) => screen.collection === collection)
    .sort(
      (left, right) =>
        SCREEN_KIND_ORDER.indexOf(left.kind) - SCREEN_KIND_ORDER.indexOf(right.kind),
    );
}

/** The collections the generated application shows, in order. */
export function collectionsShown(section: InterfaceSection): string[] {
  const found: string[] = [];
  for (const screen of section.screens) {
    if (screen.collection !== undefined && !found.includes(screen.collection)) {
      found.push(screen.collection);
    }
  }
  return found;
}

/** The components of one group, sorted by name. */
export function componentsByGroup(
  components: readonly ComponentEntry[],
): { group: string; label: string; entries: ComponentEntry[] }[] {
  const groups: string[] = [];
  for (const entry of components) {
    if (!groups.includes(entry.group)) {
      groups.push(entry.group);
    }
  }
  return groups.map((group) => ({
    group,
    label: GROUP_WORDS[group] ?? group,
    entries: components
      .filter((entry) => entry.group === group)
      .sort((left, right) => left.kind.localeCompare(right.kind)),
  }));
}

/** Walks one component and everything under it. */
export function walkComponents(
  nodes: readonly ComponentNode[],
  visit: (node: ComponentNode, depth: number) => void,
  depth = 0,
): void {
  for (const node of nodes) {
    visit(node, depth);
    walkComponents(node.children, visit, depth + 1);
  }
}

/** Every component placed on one screen, flattened with its depth. */
export function flattenScreen(screen: Screen): { node: ComponentNode; depth: number }[] {
  const found: { node: ComponentNode; depth: number }[] = [];
  walkComponents(screen.components, (node, depth) => found.push({ node, depth }));
  return found;
}

/** The count of components one screen places. */
export function componentCount(screen: Screen): number {
  return flattenScreen(screen).length;
}

/** One line naming what a screen shows. */
export function describeScreen(
  screen: Screen,
  roleNames: Readonly<Record<string, string>> = {},
): string {
  const kind = SCREEN_KIND_WORDS[screen.kind] ?? screen.kind;
  const roles = screen.roles.map((role) => roleNames[role] ?? role).join(', ');
  return `${kind} · ${screen.route} · ${roles}`;
}

/** The sentence behind one key in the language the application opens in. */
export function sentenceFor(section: InterfaceSection, key: string): string {
  const file =
    section.translations.find((held) => held.language === section.default_language) ??
    section.translations[0];
  return file?.entries.find((entry) => entry.key === key)?.text ?? key;
}

/** The count of sentences each language carries, against the count the screens name. */
export function translationCoverage(
  section: InterfaceSection,
): { language: string; held: number; wanted: number; missing: number }[] {
  const wanted = new Set<string>();
  for (const screen of section.screens) {
    wanted.add(screen.title_key);
    walkComponents(screen.components, (node) => {
      if (node.label_key !== undefined) {
        wanted.add(node.label_key);
      }
      for (const property of node.properties) {
        if (property.name.endsWith('_key')) {
          wanted.add(property.value);
        }
      }
    });
  }
  for (const width of section.breakpoints) {
    wanted.add(width.label_key);
  }
  return section.translations.map((file) => {
    const held = new Set(file.entries.map((entry) => entry.key));
    const missing = [...wanted].filter((key) => !held.has(key)).length;
    return { language: file.language, held: held.size, wanted: wanted.size, missing };
  });
}

/** The findings of one area of the accessibility check. */
export function findingsByArea(
  findings: readonly AccessibilityFinding[],
): { area: string; failures: number; entries: AccessibilityFinding[] }[] {
  const areas: string[] = [];
  for (const finding of findings) {
    if (!areas.includes(finding.area)) {
      areas.push(finding.area);
    }
  }
  return areas.map((area) => {
    const entries = findings.filter((finding) => finding.area === area);
    return {
      area,
      failures: entries.filter((finding) => finding.severity === 'failure').length,
      entries,
    };
  });
}

/** Writes one token change over a token list. */
export function withToken(tokens: readonly ThemeToken[], name: string, value: string): ThemeToken[] {
  const held = tokens.map((token) => (token.name === name ? { name, value } : token));
  return held.some((token) => token.name === name) ? held : [...held, { name, value }];
}

/** The words a person reads for one width. */
export function widthWords(breakpoint: string): string {
  switch (breakpoint) {
    case 'phone':
      return 'Phone';
    case 'tablet':
      return 'Tablet';
    case 'desktop':
      return 'Desktop';
    default:
      return breakpoint;
  }
}

/** One sentence stating what Step 5 opened with. */
export function openingSentence(section: InterfaceSection): string {
  const screens = section.screens.length;
  const collections = collectionsShown(section).length;
  if (screens === 0) {
    return 'Cerulea generated no screen. Grant a role a capability in the permission matrix, and the screens appear here.';
  }
  return `Cerulea generated ${screens} screen${screens === 1 ? '' : 's'} across ${collections} collection${collections === 1 ? '' : 's'}. Open one and change what it shows.`;
}
