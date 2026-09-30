import { describe, expect, it } from 'vitest';

import type { CatalogueModule } from '@/lib/catalogue/types';

import type { Outcome } from './catalogue';
import { detectConflicts } from './conflicts';
import type { OutcomeResolution } from './resolve';

function part(moduleId: string, title: string, dependsOn: string[] = []): CatalogueModule {
  return { moduleId, title, projectType: 'dapp', category: 'data-logic', dependsOn } as CatalogueModule;
}

function resolution(over: Partial<OutcomeResolution>): OutcomeResolution {
  return { outcomeIds: [], installOrder: [], modules: [], missing: [], recommendations: [], ...over };
}

const outcomes: Outcome[] = [];

describe('an absent part', () => {
  it('asks the person to wait when no installed part carries the request', () => {
    const conflicts = detectConflicts(
      resolution({ missing: [{ moduleId: 'customs_feed', askedBy: [] }] as OutcomeResolution['missing'] }),
      { track: 'dapp', outcomes, modules: [] },
    );
    expect(conflicts).toEqual([
      {
        conflictId: 'absent:customs_feed',
        severity: 'blocking',
        title: 'a part of this project asks for a part Cerulea does not hold',
        detail:
          'a part of this project needs a part that the Cerulea catalogue has yet to publish. ' +
          'Deployment stops here, because the part cannot install.',
        fixes: [{ kind: 'none', label: 'Wait for Cerulea to publish the part' }],
      },
    ]);
  });
});

describe('a loop of parts', () => {
  it('names the loop by title and reports it as blocking', () => {
    const modules = [part('berth_booking', 'Berth booking', ['invoicing']), part('invoicing', 'Invoicing', ['berth_booking'])];
    const conflicts = detectConflicts(
      resolution({ installOrder: ['berth_booking', 'invoicing'] }),
      { track: 'dapp', outcomes, modules },
    );
    expect(conflicts).toEqual([
      {
        conflictId: 'cycle:berth_booking>invoicing>berth_booking',
        severity: 'blocking',
        title: 'Two parts need each other',
        detail:
          'Berth booking needs Invoicing needs Berth booking. Cerulea installs a part after the parts it needs, ' +
          'so a loop like this never finishes. Deployment stops here.',
        fixes: [{ kind: 'none', label: 'Report the loop to Cerulea support' }],
      },
    ]);
  });

  it('names a part that needs itself', () => {
    const modules = [part('berth_booking', 'Berth booking', ['berth_booking'])];
    const conflicts = detectConflicts(
      resolution({ installOrder: ['berth_booking'] }),
      { track: 'dapp', outcomes, modules },
    );
    expect(conflicts.map((conflict) => conflict.detail.split('.')[0])).toEqual([
      'Berth booking needs Berth booking',
    ]);
  });
});
