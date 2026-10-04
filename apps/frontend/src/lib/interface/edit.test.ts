import { describe, expect, it } from 'vitest';

import {
  addComponent,
  addScreen,
  applyGrid,
  bodyOf,
  breakpointNamed,
  freshNodeId,
  gridFor,
  hiddenBody,
  identifierFrom,
  labelKeyFor,
  mainSection,
  placementAt,
  removeNode,
  removeScreen,
  renameNode,
  renameScreen,
  sameSection,
  sentenceFor,
  setBinding,
  setProperty,
  setSpan,
  setThemeToken,
  setVisible,
  visibleBody,
  withOverride,
} from './edit';
import type { ComponentEntry, ComponentNode, InterfaceSection, Screen } from './types';

const breakpoints = [
  { id: 'phone', min_width: 0, columns: 4, label_key: 'width.phone' },
  { id: 'tablet', min_width: 768, columns: 8, label_key: 'width.tablet' },
  { id: 'desktop', min_width: 1200, columns: 12, label_key: 'width.desktop' },
];

function node(id: string, component: string, overrides: ComponentNode['overrides'] = [], extra: Partial<ComponentNode> = {}): ComponentNode {
  return { id, component, visibility: [], overrides, properties: [], children: [], ...extra };
}

function spans(phone: number, tablet: number, desktop: number): ComponentNode['overrides'] {
  return [
    { breakpoint: 'phone', visible: phone > 0, span: phone, order: 0 },
    { breakpoint: 'tablet', visible: tablet > 0, span: tablet, order: 0 },
    { breakpoint: 'desktop', visible: desktop > 0, span: desktop, order: 0 },
  ];
}

/** A list screen the engine would generate: page, chrome, navigation, main with a table, cards and a chart. */
function listScreen(): Screen {
  return {
    id: 'shipment_list',
    kind: 'list',
    route: '/shipment',
    collection: 'shipment',
    roles: ['inspector', 'buyer'],
    title_key: 'screen.shipment_list.title',
    offline_capture: false,
    components: [
      node('page', 'page', [], {
        children: [
          node('chrome', 'header', spans(4, 8, 12), { label_key: 'screen.shipment_list.chrome.label' }),
          node('main', 'section', spans(4, 6, 10), {
            label_key: 'screen.shipment_list.main.label',
            children: [
              node('records_table', 'table', spans(0, 8, 12), { binding: { kind: 'Collection', collection: 'shipment' }, label_key: 'screen.shipment_list.records_table.label', properties: [{ name: 'page_size', value: '25' }] }),
              node('records_cards', 'card_grid', spans(4, 0, 0), { binding: { kind: 'Collection', collection: 'shipment' }, label_key: 'screen.shipment_list.records_cards.label' }),
              node('records_chart', 'chart', spans(4, 8, 6), { binding: { kind: 'Collection', collection: 'shipment' }, label_key: 'screen.shipment_list.records_chart.label' }),
            ],
          }),
        ],
      }),
    ],
  };
}

function section(): InterfaceSection {
  return {
    screens: [listScreen()],
    theme: { colour_light: [{ name: 'brand', value: '#004AAD' }], colour_dark: [], type_scale: [], spacing: [] },
    breakpoints,
    translations: [
      {
        language: 'en',
        entries: [
          { key: 'screen.shipment_list.title', text: 'Shipments' },
          { key: 'screen.shipment_list.records_table.label', text: 'Every shipment Cerulea holds' },
          { key: 'screen.shipment_list.records_chart.label', text: 'Shipments under each grade' },
        ],
      },
    ],
    conflict_rules: [],
    default_language: 'en',
  };
}

const desktop = breakpoints[2];
const phone = breakpoints[0];

describe('the band the builder edits', () => {
  it('finds the main section the generator wraps every screen in', () => {
    const main = mainSection(listScreen());
    expect(main?.id).toBe('main');
    expect(bodyOf(listScreen()).map((held) => held.id)).toEqual(['records_table', 'records_cards', 'records_chart']);
  });

  it('reads the placement of a component at each width', () => {
    const table = bodyOf(listScreen())[0];
    expect(placementAt(table, desktop)).toEqual({ visible: true, span: 12, order: 0 });
    expect(placementAt(table, phone).visible).toBe(false);
    expect(placementAt(node('free', 'text_input'), desktop)).toEqual({ visible: true, span: 12, order: 0 });
  });

  it('separates the visible body from the hidden body at one width', () => {
    expect(visibleBody(listScreen(), desktop).map((held) => held.id)).toEqual(['records_table', 'records_chart']);
    expect(hiddenBody(listScreen(), desktop).map((held) => held.id)).toEqual(['records_cards']);
    expect(visibleBody(listScreen(), phone).map((held) => held.id)).toEqual(['records_cards', 'records_chart']);
  });
});

describe('the grid derived from the overrides', () => {
  it('flows the visible components across the columns and wraps at the edge', () => {
    const cells = gridFor(listScreen(), desktop);
    expect(cells).toEqual([
      { i: 'records_table', x: 0, y: 0, w: 12, h: 10, minW: 1, maxW: 12 },
      { i: 'records_chart', x: 0, y: 10, w: 6, h: 8, minW: 1, maxW: 12 },
    ]);
  });

  it('writes a dragged grid back as order and span, leaving the other widths alone', () => {
    const screen = listScreen();
    const moved = applyGrid(screen, desktop, [
      { i: 'records_chart', x: 0, y: 0, w: 4, h: 8 },
      { i: 'records_table', x: 4, y: 0, w: 8, h: 10 },
    ]);
    expect(visibleBody(moved, desktop).map((held) => held.id)).toEqual(['records_chart', 'records_table']);
    const chart = bodyOf(moved).find((held) => held.id === 'records_chart') as ComponentNode;
    expect(placementAt(chart, desktop)).toEqual({ visible: true, span: 4, order: 0 });
    expect(placementAt(chart, phone)).toEqual({ visible: true, span: 4, order: 0 });
    const table = bodyOf(moved).find((held) => held.id === 'records_table') as ComponentNode;
    expect(placementAt(table, desktop)).toEqual({ visible: true, span: 8, order: 1 });
    expect(placementAt(table, phone).visible).toBe(false);
  });

  it('keeps a span inside the columns of the width', () => {
    const screen = listScreen();
    const wide = applyGrid(screen, phone, [{ i: 'records_cards', x: 0, y: 0, w: 9, h: 8 }, { i: 'records_chart', x: 0, y: 8, w: 0, h: 8 }]);
    expect(placementAt(bodyOf(wide)[1], phone).span).toBe(4);
    expect(placementAt(bodyOf(wide)[2], phone).span).toBe(1);
  });

  it('leaves the section as it is when the grid did not move', () => {
    const screen = listScreen();
    const same = applyGrid(screen, desktop, gridFor(screen, desktop));
    expect(sameSection({ ...section(), screens: [same] }, { ...section(), screens: [applyGrid(screen, desktop, gridFor(screen, desktop))] })).toBe(true);
  });
});

describe('showing, hiding and sizing', () => {
  it('hides a component at one width and shows it again after the last visible one', () => {
    const hidden = setVisible(listScreen(), 'records_table', desktop, false);
    expect(hiddenBody(hidden, desktop).map((held) => held.id)).toEqual(['records_table', 'records_cards']);
    const shown = setVisible(hidden, 'records_cards', desktop, true);
    expect(visibleBody(shown, desktop).map((held) => held.id)).toEqual(['records_chart', 'records_cards']);
    const cards = bodyOf(shown).find((held) => held.id === 'records_cards') as ComponentNode;
    expect(placementAt(cards, desktop)).toEqual({ visible: true, span: 12, order: 1 });
  });

  it('bounds a span between one column and the width', () => {
    expect(placementAt(bodyOf(setSpan(listScreen(), 'records_chart', desktop, 40))[2], desktop).span).toBe(12);
    expect(placementAt(bodyOf(setSpan(listScreen(), 'records_chart', desktop, -3))[2], desktop).span).toBe(1);
  });

  it('replaces the override of one width and keeps the rest', () => {
    const changed = withOverride(bodyOf(listScreen())[0], phone, { visible: true, span: 2, order: 3 });
    expect(changed.overrides).toHaveLength(3);
    expect(changed.overrides.find((held) => held.breakpoint === 'phone')).toEqual({ breakpoint: 'phone', visible: true, span: 2, order: 3 });
  });
});

describe('binding, properties and removal', () => {
  it('binds and unbinds a component', () => {
    const bound = setBinding(listScreen(), 'records_chart', { kind: 'View', view: 'grades' } as never);
    expect(bodyOf(bound)[2].binding).toEqual({ kind: 'View', view: 'grades' });
    expect(bodyOf(setBinding(bound, 'records_chart', undefined))[2].binding).toBeUndefined();
  });

  it('writes a property and removes it on an empty value', () => {
    const sized = setProperty(listScreen(), 'records_table', 'page_size', '50');
    expect(bodyOf(sized)[0].properties).toEqual([{ name: 'page_size', value: '50' }]);
    expect(bodyOf(setProperty(sized, 'records_table', 'page_size', '  '))[0].properties).toEqual([]);
  });

  it('removes a component and everything under it', () => {
    const pruned = removeNode(listScreen(), 'records_cards');
    expect(bodyOf(pruned).map((held) => held.id)).toEqual(['records_table', 'records_chart']);
    expect(bodyOf(removeNode(listScreen(), 'main'))).toHaveLength(1);
  });
});

describe('names and screens', () => {
  it('renames a component through the translation file and keeps its key', () => {
    const held = section();
    const renamed = renameNode(held, held.screens[0], 'records_table', 'Shipments on the water');
    expect(sentenceFor(renamed, 'screen.shipment_list.records_table.label')).toBe('Shipments on the water');
    expect(bodyOf(renamed.screens[0])[0].label_key).toBe('screen.shipment_list.records_table.label');
  });

  it('gives a component without a label a key before it names it', () => {
    const held = section();
    const renamed = renameNode(held, held.screens[0], 'records_cards', 'Shipment cards');
    expect(bodyOf(renamed.screens[0])[1].label_key).toBe(labelKeyFor('shipment_list', 'records_cards'));
    expect(sentenceFor(renamed, labelKeyFor('shipment_list', 'records_cards'))).toBe('Shipment cards');
  });

  it('renames a screen through its title key', () => {
    const held = section();
    expect(sentenceFor(renameScreen(held, held.screens[0], 'Cargo'), 'screen.shipment_list.title')).toBe('Cargo');
  });

  it('writes identifiers the Blueprint accepts', () => {
    expect(identifierFrom('Quality Checks 2')).toBe('quality_checks_2');
    expect(identifierFrom('9 lives')).toBe('item_9_lives');
    expect(identifierFrom('***')).toBe('item');
    expect(freshNodeId(listScreen(), 'table')).toBe('table');
    expect(freshNodeId(listScreen(), 'records_table')).toBe('records_table_2');
  });

  it('places a component of the set visible at every width, after the last one, with its name', () => {
    const held = section();
    const entry: ComponentEntry = { kind: 'timeline', group: 'data', binds: 'collection', holdsChildren: true, summary: 'Records along time.', properties: [] };
    const placed = addComponent(held, held.screens[0], entry, { kind: 'Collection', collection: 'shipment' }, 'Timeline');
    expect(placed.nodeId).toBe('timeline');
    const added = bodyOf(placed.section.screens[0]).find((node) => node.id === 'timeline') as ComponentNode;
    expect(added.binding).toEqual({ kind: 'Collection', collection: 'shipment' });
    expect(added.overrides).toEqual([
      { breakpoint: 'phone', visible: true, span: 4, order: 1 },
      { breakpoint: 'tablet', visible: true, span: 8, order: 1 },
      { breakpoint: 'desktop', visible: true, span: 12, order: 1 },
    ]);
    expect(sentenceFor(placed.section, added.label_key)).toBe('Timeline');
    expect(visibleBody(placed.section.screens[0], desktop).map((node) => node.id)).toEqual(['records_table', 'records_chart', 'timeline']);
  });

  it('opens a custom screen for the roles of the first screen and keeps the last screen', () => {
    const grown = addScreen(section(), 'Inspection desk');
    expect(grown.screen.id).toBe('inspection_desk');
    expect(grown.screen.kind).toBe('custom');
    expect(grown.screen.route).toBe('/inspection_desk');
    expect(grown.screen.roles).toEqual(['inspector', 'buyer']);
    expect(mainSection(grown.screen)?.id).toBe('main');
    expect(sentenceFor(grown.section, grown.screen.title_key)).toBe('Inspection desk');
    const again = addScreen(grown.section, 'Inspection desk');
    expect(again.screen.id).toBe('inspection_desk_2');
    expect(removeScreen(section(), 'shipment_list').screens).toHaveLength(1);
    expect(removeScreen(grown.section, 'inspection_desk').screens.map((held) => held.id)).toEqual(['shipment_list']);
  });

  it('writes a theme token and finds a width by name', () => {
    const themed = setThemeToken(section(), 'colour_light', 'brand', '#30B700');
    expect(themed.theme.colour_light).toEqual([{ name: 'brand', value: '#30B700' }]);
    expect(breakpointNamed(section(), 'tablet').columns).toBe(8);
    expect(breakpointNamed(section(), 'watch').id).toBe('phone');
  });
});
