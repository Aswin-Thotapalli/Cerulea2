import { describe, expect, it } from 'vitest';

import type { CatalogueModule } from '@/lib/catalogue/types';

import { LinkNotEditable, createUserLink, deleteUserLink, deriveRequiresLinks, type MapLink } from './links';

function part(moduleId: string, title: string, over: Partial<CatalogueModule> = {}): CatalogueModule {
  return { moduleId, title, projectType: 'dapp', category: 'data-logic', ...over } as CatalogueModule;
}

describe('deriving requires links', () => {
  it('writes the reason from the two titles when the catalogue names none', () => {
    const modules = [
      part('berth_booking', 'Berth booking', { dependsOn: ['identity', 'payments'] }),
      part('identity', 'Identity'),
      part('payments', 'Payments'),
    ];
    const links = deriveRequiresLinks(['identity', 'payments', 'berth_booking'], modules);
    expect(links.map((link) => [link.linkId, link.reason])).toEqual([
      ['requires:berth_booking->identity', 'Berth booking needs Identity to work.'],
      ['requires:berth_booking->payments', 'Berth booking needs Payments to work.'],
    ]);
  });

  it('prefers the reason the catalogue records and skips parts it does not hold', () => {
    const modules = [
      part('berth_booking', 'Berth booking', {
        dependsOn: ['identity', 'absent_part'],
        reasonByDepId: { identity: 'Each booking names the person who made it.' },
      }),
      part('identity', 'Identity'),
    ];
    const links = deriveRequiresLinks(['identity', 'berth_booking', 'unknown_module'], modules);
    expect(links).toEqual([
      {
        linkId: 'requires:berth_booking->identity',
        from: 'berth_booking',
        to: 'identity',
        type: 'requires',
        origin: 'derived',
        reason: 'Each booking names the person who made it.',
        removable: false,
      },
    ]);
  });
});

describe('links a person draws', () => {
  it('creates a feeds link a person may remove', () => {
    expect(createUserLink('feeds', 'berth_booking', 'invoicing', 'Each booking raises an invoice.')).toEqual({
      linkId: 'feeds:berth_booking->invoicing',
      from: 'berth_booking',
      to: 'invoicing',
      type: 'feeds',
      origin: 'chosen',
      reason: 'Each booking raises an invoice.',
      removable: true,
    });
  });

  it('refuses a governs link and names the fix', () => {
    expect(() => createUserLink('governs', 'a', 'b', 'why')).toThrowError(
      new LinkNotEditable(
        'Cerulea draws every governs link itself. Add or remove an outcome to change these links.',
      ),
    );
  });

  it('removes a chosen link and keeps the rest', () => {
    const chosen = createUserLink('triggers', 'a', 'b', 'why');
    const derived: MapLink = { ...chosen, linkId: 'requires:a->c', type: 'requires', removable: false };
    expect(deleteUserLink([chosen, derived], chosen.linkId)).toEqual([derived]);
  });

  it('answers with the same list when the link is absent', () => {
    const links = [createUserLink('feeds', 'a', 'b', 'why')];
    expect(deleteUserLink(links, 'feeds:x->y')).toBe(links);
  });

  it('refuses to remove a derived link and names the fix', () => {
    const derived: MapLink = {
      linkId: 'governs:a->b',
      from: 'a',
      to: 'b',
      type: 'governs',
      origin: 'derived',
      reason: 'why',
      removable: false,
    };
    let caught: unknown;
    try {
      deleteUserLink([derived], 'governs:a->b');
    } catch (cause) {
      caught = cause;
    }
    expect(caught).toBeInstanceOf(LinkNotEditable);
    expect((caught as Error).name).toBe('LinkNotEditable');
    expect((caught as Error).message).toBe(
      'Cerulea draws this governs link itself. Remove the outcome that installed these parts to remove the link.',
    );
  });
});
