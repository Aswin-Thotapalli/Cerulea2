// apps/frontend/src/lib/interface/edit.ts
// The edits the interface builder makes over the Views section.
// Cerulea generates the application from the model. The builder then moves,
// hides, renames, binds, adds and removes components on the generated screens.
// Every edit here is a pure function over the typed section, so the section
// stays the one source and the save writes it back into the Blueprint.
// The grid a person drags on is derived from the per width overrides of each
// component (visible, span, order) and written back into them.
// Without this module the builder would hold a second layout beside the Blueprint.

import type {
  Binding,
  Breakpoint,
  ComponentEntry,
  ComponentNode,
  InterfaceSection,
  Screen,
  ThemeToken,
  ThemeTokens,
} from './types';

/** One cell of the builder grid, in the shape react-grid-layout reads and writes. */
export type GridCell = { i: string; x: number; y: number; w: number; h: number; minW?: number; maxW?: number };

/** The identifier of the band the builder edits on every generated screen. */
export const MAIN_SECTION_ID = 'main';

/** The width the builder opens at. */
export const DEFAULT_BREAKPOINT = 'desktop';

/** The rows a component takes on the grid, by kind. The grid rows are 26 pixels high. */
const ROWS_BY_KIND: Record<string, number> = {
  table: 10,
  list: 8,
  card_grid: 8,
  detail_panel: 8,
  chart: 8,
  timeline: 8,
  map: 8,
  calendar: 8,
  kanban: 8,
  section: 6,
  grid: 6,
  stack: 6,
  split: 6,
  tabs: 6,
  accordion: 6,
  audit_trail: 6,
  history_diff: 6,
  proof_viewer: 5,
  navigation: 3,
  header: 3,
  search: 3,
  empty_state: 3,
  loading_state: 3,
  error_state: 3,
};

/** The rows one component takes on the grid. */
export function rowsFor(kind: string): number {
  return ROWS_BY_KIND[kind] ?? 4;
}

/** Walks one component and everything under it. */
function walk(nodes: readonly ComponentNode[], visit: (node: ComponentNode) => void): void {
  for (const node of nodes) {
    visit(node);
    walk(node.children, visit);
  }
}

/** Finds the band the builder edits. The generated page carries a section named main. */
export function mainSection(screen: Screen): ComponentNode | undefined {
  let found: ComponentNode | undefined;
  walk(screen.components, (node) => {
    if (found === undefined && node.id === MAIN_SECTION_ID && node.component === 'section') found = node;
  });
  if (found !== undefined) return found;
  walk(screen.components, (node) => {
    if (found === undefined && node.component === 'section') found = node;
  });
  return found;
}

/** The components a person arranges on one screen. */
export function bodyOf(screen: Screen): ComponentNode[] {
  const main = mainSection(screen);
  return main === undefined ? screen.components : main.children;
}

/** Rewrites the body of one screen. The rest of the page stays as it is. */
export function withBody(screen: Screen, body: ComponentNode[]): Screen {
  const main = mainSection(screen);
  if (main === undefined) return { ...screen, components: body };
  const replace = (nodes: readonly ComponentNode[]): ComponentNode[] =>
    nodes.map((node) =>
      node === main ? { ...node, children: body } : { ...node, children: replace(node.children) },
    );
  return { ...screen, components: replace(screen.components) };
}

/** Finds one node anywhere on a screen. */
export function findNode(screen: Screen, nodeId: string): ComponentNode | undefined {
  let found: ComponentNode | undefined;
  walk(screen.components, (node) => {
    if (found === undefined && node.id === nodeId) found = node;
  });
  return found;
}

/** Every identifier a screen already uses. */
export function nodeIds(screen: Screen): Set<string> {
  const ids = new Set<string>();
  walk(screen.components, (node) => ids.add(node.id));
  return ids;
}

/** Rewrites one node anywhere on a screen. */
export function updateNode(
  screen: Screen,
  nodeId: string,
  change: (node: ComponentNode) => ComponentNode,
): Screen {
  const rewrite = (nodes: readonly ComponentNode[]): ComponentNode[] =>
    nodes.map((node) =>
      node.id === nodeId ? change(node) : { ...node, children: rewrite(node.children) },
    );
  return { ...screen, components: rewrite(screen.components) };
}

/** The placement one component takes at one width. */
export function placementAt(
  node: ComponentNode,
  breakpoint: Breakpoint,
): { visible: boolean; span: number; order: number } {
  const held = node.overrides.find((entry) => entry.breakpoint === breakpoint.id);
  if (held === undefined) return { visible: true, span: breakpoint.columns, order: 0 };
  return { visible: held.visible, span: Math.min(held.span, breakpoint.columns), order: held.order };
}

/** The body components shown at one width, in the order they appear. */
export function visibleBody(screen: Screen, breakpoint: Breakpoint): ComponentNode[] {
  return bodyOf(screen)
    .map((node, position) => ({ node, placement: placementAt(node, breakpoint), position }))
    .filter((entry) => entry.placement.visible)
    .sort((left, right) => left.placement.order - right.placement.order || left.position - right.position)
    .map((entry) => entry.node);
}

/** The body components hidden at one width. */
export function hiddenBody(screen: Screen, breakpoint: Breakpoint): ComponentNode[] {
  return bodyOf(screen).filter((node) => !placementAt(node, breakpoint).visible);
}

/**
 * Lays the visible body out on the grid of one width.
 *
 * The section holds a span and an order for each component. The grid flows
 * them left to right across the columns of the width and wraps when a span
 * runs past the edge, so the picture matches what the deployment renders.
 */
export function gridFor(screen: Screen, breakpoint: Breakpoint): GridCell[] {
  const cells: GridCell[] = [];
  let x = 0;
  let y = 0;
  let rowHeight = 0;
  for (const node of visibleBody(screen, breakpoint)) {
    const span = Math.max(1, placementAt(node, breakpoint).span);
    const h = rowsFor(node.component);
    if (x + span > breakpoint.columns) {
      x = 0;
      y += rowHeight;
      rowHeight = 0;
    }
    cells.push({ i: node.id, x, y, w: span, h, minW: 1, maxW: breakpoint.columns });
    x += span;
    rowHeight = Math.max(rowHeight, h);
  }
  return cells;
}

/**
 * Writes a dragged grid back into the overrides of one width.
 *
 * Reading order on the grid (top to bottom, left to right) becomes the order
 * of each component. The width of each cell becomes its span. The other widths
 * keep their own overrides.
 */
export function applyGrid(screen: Screen, breakpoint: Breakpoint, cells: readonly GridCell[]): Screen {
  const ordered = [...cells].sort((left, right) => left.y - right.y || left.x - right.x);
  const orderOf = new Map(ordered.map((cell, index) => [cell.i, index] as const));
  const spanOf = new Map(cells.map((cell) => [cell.i, Math.max(1, Math.min(cell.w, breakpoint.columns))] as const));
  const body = bodyOf(screen).map((node) => {
    const order = orderOf.get(node.id);
    if (order === undefined) return node;
    const span = spanOf.get(node.id) ?? breakpoint.columns;
    return withOverride(node, breakpoint, { visible: true, span, order });
  });
  return withBody(screen, body);
}

/** Writes one override for one width, replacing the one already held. */
export function withOverride(
  node: ComponentNode,
  breakpoint: Breakpoint,
  value: { visible: boolean; span: number; order: number },
): ComponentNode {
  const others = node.overrides.filter((entry) => entry.breakpoint !== breakpoint.id);
  return { ...node, overrides: [...others, { breakpoint: breakpoint.id, ...value }] };
}

/** Shows or hides one body component at one width. */
export function setVisible(screen: Screen, nodeId: string, breakpoint: Breakpoint, visible: boolean): Screen {
  const node = findNode(screen, nodeId);
  if (node === undefined) return screen;
  const held = placementAt(node, breakpoint);
  const order = visible && !held.visible ? nextOrder(screen, breakpoint) : held.order;
  const span = visible ? (held.span > 0 ? held.span : breakpoint.columns) : 0;
  return updateNode(screen, nodeId, (entry) => withOverride(entry, breakpoint, { visible, span, order }));
}

/** The order after the last visible component at one width. */
function nextOrder(screen: Screen, breakpoint: Breakpoint): number {
  const shown = visibleBody(screen, breakpoint);
  return shown.length === 0 ? 0 : placementAt(shown[shown.length - 1], breakpoint).order + 1;
}

/** Writes one span at one width. */
export function setSpan(screen: Screen, nodeId: string, breakpoint: Breakpoint, span: number): Screen {
  const node = findNode(screen, nodeId);
  if (node === undefined) return screen;
  const held = placementAt(node, breakpoint);
  const bounded = Math.max(1, Math.min(Math.round(span), breakpoint.columns));
  return updateNode(screen, nodeId, (entry) =>
    withOverride(entry, breakpoint, { visible: held.visible, span: bounded, order: held.order }),
  );
}

/** Binds one component. */
export function setBinding(screen: Screen, nodeId: string, binding: Binding | undefined): Screen {
  return updateNode(screen, nodeId, (node) => {
    const next = { ...node };
    if (binding === undefined) delete next.binding;
    else next.binding = binding;
    return next;
  });
}

/** Writes one named property. An empty value removes it. */
export function setProperty(screen: Screen, nodeId: string, name: string, value: string): Screen {
  return updateNode(screen, nodeId, (node) => {
    const others = node.properties.filter((entry) => entry.name !== name);
    return {
      ...node,
      properties: value.trim().length === 0 ? others : [...others, { name, value: value.trim() }],
    };
  });
}

/** Removes one component and everything under it. */
export function removeNode(screen: Screen, nodeId: string): Screen {
  const prune = (nodes: readonly ComponentNode[]): ComponentNode[] =>
    nodes.filter((node) => node.id !== nodeId).map((node) => ({ ...node, children: prune(node.children) }));
  return { ...screen, components: prune(screen.components) };
}

/** Writes an identifier the Blueprint accepts out of free words. */
export function identifierFrom(words: string, fallback = 'item'): string {
  const held = words
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .replace(/_+/g, '_')
    .slice(0, 96);
  const named = /^[a-z]/.test(held) ? held : held.length > 0 ? `${fallback}_${held}` : fallback;
  return named.slice(0, 96);
}

/** An identifier no component on the screen uses yet. */
export function freshNodeId(screen: Screen, base: string): string {
  const used = nodeIds(screen);
  const root = identifierFrom(base);
  if (!used.has(root)) return root;
  let count = 2;
  while (used.has(`${root}_${count}`)) count += 1;
  return `${root}_${count}`;
}

/** The translation key one label of one component takes. */
export function labelKeyFor(screenId: string, nodeId: string): string {
  return `screen.${screenId}.${nodeId}.label`;
}

/** The sentence behind one key in the language the application opens in. */
export function sentenceFor(section: InterfaceSection, key: string | undefined): string {
  if (key === undefined) return '';
  const file =
    section.translations.find((held) => held.language === section.default_language) ??
    section.translations[0];
  return file?.entries.find((entry) => entry.key === key)?.text ?? key;
}

/** Writes one sentence behind one key in the language the application opens in. */
export function withSentence(section: InterfaceSection, key: string, text: string): InterfaceSection {
  const language = section.default_language;
  const files = section.translations.some((held) => held.language === language)
    ? section.translations
    : [...section.translations, { language, entries: [] }];
  return {
    ...section,
    translations: files.map((file) => {
      if (file.language !== language) return file;
      const others = file.entries.filter((entry) => entry.key !== key);
      return { ...file, entries: [...others, { key, text }] };
    }),
  };
}

/** Rewrites one screen inside the section. */
export function withScreen(section: InterfaceSection, screen: Screen): InterfaceSection {
  return {
    ...section,
    screens: section.screens.map((held) => (held.id === screen.id ? screen : held)),
  };
}

/** Renames one component. The label lives in the translation file, so the key stays. */
export function renameNode(
  section: InterfaceSection,
  screen: Screen,
  nodeId: string,
  text: string,
): InterfaceSection {
  const node = findNode(screen, nodeId);
  if (node === undefined) return section;
  const key = node.label_key ?? labelKeyFor(screen.id, nodeId);
  const named = node.label_key === undefined ? updateNode(screen, nodeId, (held) => ({ ...held, label_key: key })) : screen;
  return withSentence(withScreen(section, named), key, text);
}

/** Renames one screen. The title lives in the translation file, so the key stays. */
export function renameScreen(section: InterfaceSection, screen: Screen, text: string): InterfaceSection {
  return withSentence(section, screen.title_key, text);
}

/** The words a person reads for one component kind. */
export function kindWords(kind: string): string {
  const words = kind.replace(/_/g, ' ');
  return `${words[0]?.toUpperCase() ?? ''}${words.slice(1)}`;
}

/**
 * Places one component of the set on a screen.
 *
 * The component arrives visible at every width, spanning the full band, after
 * the last component already shown. A binding comes with it when the picker
 * chose one, so the engine finds a legal binding on the first check.
 */
export function addComponent(
  section: InterfaceSection,
  screen: Screen,
  entry: ComponentEntry,
  binding: Binding | undefined,
  label: string,
): { section: InterfaceSection; nodeId: string } {
  const nodeId = freshNodeId(screen, entry.kind);
  const key = labelKeyFor(screen.id, nodeId);
  const node: ComponentNode = {
    id: nodeId,
    component: entry.kind,
    ...(binding === undefined ? {} : { binding }),
    label_key: key,
    visibility: [],
    overrides: section.breakpoints.map((breakpoint) => ({
      breakpoint: breakpoint.id,
      visible: true,
      span: breakpoint.columns,
      order: nextOrder(screen, breakpoint),
    })),
    properties: [],
    children: [],
  };
  const placed = withBody(screen, [...bodyOf(screen), node]);
  return { section: withSentence(withScreen(section, placed), key, label), nodeId };
}

/**
 * Opens a new screen beside the generated ones.
 *
 * A custom screen carries a page with one section a person fills. It opens
 * for the roles the first generated screen opens for, so a role always reaches it.
 */
export function addScreen(section: InterfaceSection, name: string): { section: InterfaceSection; screen: Screen } {
  const used = new Set(section.screens.map((held) => held.id));
  const root = identifierFrom(name, 'screen');
  let id = root;
  let count = 2;
  while (used.has(id)) {
    id = `${root}_${count}`;
    count += 1;
  }
  const roles = section.screens[0]?.roles ?? [];
  const titleKey = `screen.${id}.title`;
  const mainKey = `screen.${id}.main.label`;
  const screen: Screen = {
    id,
    kind: 'custom',
    route: `/${id}`,
    roles,
    title_key: titleKey,
    offline_capture: false,
    components: [
      {
        id: 'page',
        component: 'page',
        visibility: [],
        overrides: [],
        properties: [],
        children: [
          {
            id: MAIN_SECTION_ID,
            component: 'section',
            label_key: mainKey,
            visibility: [],
            overrides: section.breakpoints.map((breakpoint) => ({
              breakpoint: breakpoint.id,
              visible: true,
              span: breakpoint.columns,
              order: 0,
            })),
            properties: [],
            children: [],
          },
        ],
      },
    ],
  };
  const grown = { ...section, screens: [...section.screens, screen] };
  return { section: withSentence(withSentence(grown, titleKey, name), mainKey, name), screen };
}

/** Removes one screen. The last screen stays, since an application needs one. */
export function removeScreen(section: InterfaceSection, screenId: string): InterfaceSection {
  if (section.screens.length <= 1) return section;
  return { ...section, screens: section.screens.filter((held) => held.id !== screenId) };
}

/** Writes one theme token. */
export function setThemeToken(
  section: InterfaceSection,
  group: keyof ThemeTokens,
  name: string,
  value: string,
): InterfaceSection {
  const tokens: ThemeToken[] = section.theme[group].map((token) =>
    token.name === name ? { name, value } : token,
  );
  return { ...section, theme: { ...section.theme, [group]: tokens } };
}

/** The width named, or the first the section declares. */
export function breakpointNamed(section: InterfaceSection, id: string): Breakpoint {
  return (
    section.breakpoints.find((held) => held.id === id) ??
    section.breakpoints[0] ?? { id, min_width: 0, columns: 12, label_key: `width.${id}` }
  );
}

/** Reports whether two sections hold the same content. */
export function sameSection(left: InterfaceSection, right: InterfaceSection): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}
