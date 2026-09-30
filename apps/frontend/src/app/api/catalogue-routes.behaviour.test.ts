// @vitest-environment node
import { describe, expect, it } from 'vitest';

import modulesSeed from '@/data/modules.seed.json';
import paletteSeed from '@/data/logic-palette.seed.json';
import templatesSeed from '@/data/templates.seed.json';

import * as modules from './modules/route';
import * as palette from './static/logic-palette/route';
import * as templates from './templates/route';

/**
 * The catalogue route handlers read the seeds Studio ships.
 *
 * Each test sends one query and checks the list the handler returns against
 * the rule the query names. A request carrying an address the handler cannot
 * read checks the failure reply.
 */

type SeedModule = { moduleId: string; title: string; projectType: string; category: string };
type SeedTemplate = { id: string; title: string; projectType: string };

const allModules = (modulesSeed as unknown as { modules: SeedModule[] }).modules;
const allTemplates = (templatesSeed as unknown as { templates: SeedTemplate[] }).templates;

async function list<T>(response: Response): Promise<{ status: number; body: T }> {
  return { status: response.status, body: (await response.json()) as T };
}

function at(path: string): Request {
  return new Request(`http://127.0.0.1:3000${path}`);
}

/** A request whose address no URL parser reads. */
const unreadable = { url: 'not an address' } as unknown as Request;

describe('the module catalogue route', () => {
  it('returns all 225 modules when the query names nothing', async () => {
    const { status, body } = await list<SeedModule[]>(await modules.GET(at('/api/modules')));
    expect(status).toBe(200);
    expect(body).toHaveLength(225);
    expect(body.map((entry) => entry.moduleId)).toEqual(allModules.map((entry) => entry.moduleId));
  });

  it('keeps the modules of the named track', async () => {
    const { body } = await list<SeedModule[]>(await modules.GET(at('/api/modules?projectType=blockchain')));
    expect(body.length).toBe(100);
    expect(body.every((entry) => entry.projectType === 'blockchain')).toBe(true);
  });

  it('matches the category without regard to case', async () => {
    const { body } = await list<SeedModule[]>(
      await modules.GET(at('/api/modules?projectType=blockchain&category=SUPPLY%20CHAIN')),
    );
    expect(body.map((entry) => entry.moduleId).sort()).toEqual(
      ['cold-chain-monitoring', 'port-customs-events', 'quality-recall-ledger', 'traceability-ledger'].sort(),
    );
  });

  it('keeps the modules the id list names and ignores blank entries', async () => {
    const { body } = await list<SeedModule[]>(
      await modules.GET(at('/api/modules?ids=%20rbac%20,,wallet-auth,unknown-module')),
    );
    expect(body.map((entry) => entry.moduleId).sort()).toEqual(['rbac', 'wallet-auth']);
  });

  it('searches the long description as well as the title', async () => {
    const { body } = await list<SeedModule[]>(await modules.GET(at('/api/modules?q=SIWE')));
    expect(body.map((entry) => entry.moduleId)).toEqual(['wallet-auth']);
  });

  it('answers an empty list when the search matches nothing', async () => {
    const { body } = await list<SeedModule[]>(await modules.GET(at('/api/modules?q=zzzz-no-module')));
    expect(body).toEqual([]);
  });

  it('answers 500 with the reason when the address cannot be read', async () => {
    const { status, body } = await list<{ ok: boolean; error: string }>(await modules.GET(unreadable));
    expect(status).toBe(500);
    expect(body.ok).toBe(false);
    expect(body.error).toMatch(/invalid url/i);
  });
});

describe('the template catalogue route', () => {
  it('returns all 100 templates when the query names nothing', async () => {
    const { status, body } = await list<SeedTemplate[]>(await templates.GET(at('/api/templates')));
    expect(status).toBe(200);
    expect(body).toHaveLength(allTemplates.length);
    expect(body).toHaveLength(100);
  });

  it('keeps the templates of the named track', async () => {
    const { body } = await list<SeedTemplate[]>(await templates.GET(at('/api/templates?projectType=dapp')));
    expect(body).toHaveLength(25);
    expect(body.every((entry) => entry.projectType === 'dapp')).toBe(true);
  });

  it('keeps the templates the id list names', async () => {
    const { body } = await list<SeedTemplate[]>(
      await templates.GET(at('/api/templates?ids=dapp-defi-amm,%20dapp-crypto-wallet%20,')),
    );
    expect(body.map((entry) => entry.id).sort()).toEqual(['dapp-crypto-wallet', 'dapp-defi-amm']);
  });

  it('searches the page names of each template', async () => {
    const { body } = await list<SeedTemplate[]>(await templates.GET(at('/api/templates?q=Balances')));
    expect(body.map((entry) => entry.id)).toEqual(['dapp-crypto-wallet']);
  });

  it('answers 500 with the fix when the address cannot be read', async () => {
    const { status, body } = await list<{ ok: boolean; error: string }>(await templates.GET(unreadable));
    expect(status).toBe(500);
    expect(body.ok).toBe(false);
    expect(body.error).toContain('templates.seed.json');
  });
});

describe('the logic palette route', () => {
  const held = paletteSeed as unknown as Record<string, { id: string }[]>;

  it('returns the Dapp palette when the query names no track', async () => {
    const { body } = await list<{ items: { id: string }[] }>(
      await palette.GET(at('/api/static/logic-palette') as never),
    );
    expect(body.items.map((entry) => entry.id)).toEqual(held.dapp.map((entry) => entry.id));
  });

  it('returns the Blockchain palette for the Blockchain track', async () => {
    const { body } = await list<{ items: { id: string }[] }>(
      await palette.GET(at('/api/static/logic-palette?track=blockchain') as never),
    );
    expect(body.items).toHaveLength(10);
    expect(body.items[0].id).toBe('trigger.block');
  });

  it('returns an empty palette for a track it does not hold', async () => {
    const { body } = await list<{ items: unknown[] }>(
      await palette.GET(at('/api/static/logic-palette?track=mainframe') as never),
    );
    expect(body.items).toEqual([]);
  });
});
