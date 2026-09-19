// apps/frontend/src/lib/interface/authoring.test.ts
// The reading Step 5 does over the section the engine generated.

import { describe, expect, it } from 'vitest';

import {
  collectionsShown,
  componentCount,
  componentsByGroup,
  describeScreen,
  findingsByArea,
  flattenScreen,
  openingSentence,
  screensOfCollection,
  sentenceFor,
  translationCoverage,
  widthWords,
  withToken,
} from './authoring';
import type { ComponentEntry, InterfaceSection, Screen } from './types';

function screen(overrides: Partial<Screen> = {}): Screen {
  return {
    id: 'parcels_list',
    kind: 'list',
    route: '/parcels',
    collection: 'parcels',
    roles: ['registrar', 'holder'],
    title_key: 'screen.parcels_list.title',
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
            id: 'records_table',
            component: 'table',
            label_key: 'screen.parcels_list.records_table',
            visibility: [],
            overrides: [],
            properties: [{ name: 'help_key', value: 'screen.parcels_list.help' }],
            children: [],
          },
        ],
      },
    ],
    ...overrides,
  };
}

function section(overrides: Partial<InterfaceSection> = {}): InterfaceSection {
  return {
    screens: [
      screen(),
      screen({ id: 'parcels_detail', kind: 'detail', route: '/parcels/{parcel_id}' }),
      screen({
        id: 'requests_list',
        kind: 'list',
        route: '/transfer_requests',
        collection: 'transfer_requests',
      }),
    ],
    theme: { colour_light: [], colour_dark: [], type_scale: [], spacing: [] },
    breakpoints: [{ id: 'phone', min_width: 0, columns: 4, label_key: 'breakpoint.phone' }],
    translations: [
      {
        language: 'en',
        entries: [
          { key: 'screen.parcels_list.title', text: 'Parcels' },
          { key: 'screen.parcels_list.records_table', text: 'Every parcel' },
          { key: 'screen.parcels_list.help', text: 'Search every field you read.' },
          { key: 'breakpoint.phone', text: 'Phone' },
        ],
      },
    ],
    conflict_rules: [],
    default_language: 'en',
    ...overrides,
  };
}

describe('the Step 5 reading', () => {
  it('lists the collections the application shows, in order', () => {
    expect(collectionsShown(section())).toEqual(['parcels', 'transfer_requests']);
  });

  it('orders the screens of one collection the way a person meets them', () => {
    const held = screensOfCollection(section(), 'parcels');
    expect(held.map((entry) => entry.kind)).toEqual(['list', 'detail']);
  });

  it('writes one line naming what a screen shows', () => {
    expect(describeScreen(screen())).toBe('List · /parcels · registrar, holder');
  });

  it('counts the components one screen places', () => {
    expect(componentCount(screen())).toBe(2);
    expect(flattenScreen(screen()).map((held) => held.depth)).toEqual([0, 1]);
  });

  it('groups the component set the way the engine publishes it', () => {
    const components: ComponentEntry[] = [
      { kind: 'table', group: 'data', binds: 'collection', holdsChildren: true, summary: 'Rows.', properties: [] },
      { kind: 'page', group: 'layout', binds: 'nothing', holdsChildren: true, summary: 'Screen.', properties: [] },
      { kind: 'card_grid', group: 'data', binds: 'collection', holdsChildren: true, summary: 'Cards.', properties: [] },
    ];
    const groups = componentsByGroup(components);
    expect(groups.map((held) => held.group)).toEqual(['data', 'layout']);
    expect(groups[0]?.label).toBe('Data');
    expect(groups[0]?.entries.map((held) => held.kind)).toEqual(['card_grid', 'table']);
  });

  it('reads the sentence behind one key', () => {
    expect(sentenceFor(section(), 'screen.parcels_list.title')).toBe('Parcels');
    expect(sentenceFor(section(), 'absent.key')).toBe('absent.key');
  });

  it('counts the sentences each language carries against the keys the screens name', () => {
    const held = translationCoverage(section());
    expect(held[0]?.language).toBe('en');
    expect(held[0]?.wanted).toBe(4);
    expect(held[0]?.missing).toBe(0);

    const partial = translationCoverage(
      section({
        translations: [
          {
            language: 'ta',
            entries: [{ key: 'screen.parcels_list.title', text: 'Parcels in Tamil' }],
          },
        ],
      }),
    );
    expect(partial[0]?.language).toBe('ta');
    expect(partial[0]?.missing).toBe(3);
  });

  it('groups the accessibility findings by area', () => {
    const groups = findingsByArea([
      {
        area: 'contrast',
        severity: 'failure',
        guideline: '1.4.3',
        screen: 'every screen',
        component: 'text on surface',
        problem: 'It falls short.',
        fix: 'Darken it.',
      },
      {
        area: 'contrast',
        severity: 'advice',
        guideline: '1.4.3',
        screen: 'every screen',
        component: 'border',
        problem: 'It sits close.',
        fix: 'Raise it.',
      },
    ]);
    expect(groups).toHaveLength(1);
    expect(groups[0]?.failures).toBe(1);
    expect(groups[0]?.entries).toHaveLength(2);
  });

  it('writes one token change over a token list', () => {
    const held = withToken([{ name: 'brand_primary', value: '#004AAD' }], 'brand_primary', '#123456');
    expect(held).toEqual([{ name: 'brand_primary', value: '#123456' }]);
    const added = withToken(held, 'panel', '#9BB7D4');
    expect(added).toHaveLength(2);
  });

  it('names each width in words', () => {
    expect(widthWords('phone')).toBe('Phone');
    expect(widthWords('tablet')).toBe('Tablet');
    expect(widthWords('desktop')).toBe('Desktop');
  });

  it('opens with one sentence naming what Cerulea generated', () => {
    expect(openingSentence(section())).toContain('3 screens across 2 collections');
    expect(openingSentence(section({ screens: [] }))).toContain('permission matrix');
  });
});
