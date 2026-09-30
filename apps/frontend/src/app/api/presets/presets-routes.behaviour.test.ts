// @vitest-environment node
import path from 'path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * The preset and logic block routes read seed files from disk.
 *
 * The file system here is a map the test fills. Each test places the files a
 * branch needs, calls the handler and checks the list it builds. The template
 * preset route asks the module preset route for each module, so those tests
 * answer that call and check the address it sent.
 */

const disk = vi.hoisted(() => ({ files: new Map<string, string>(), reads: [] as string[] }));

vi.mock('fs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('fs')>();
  const readFile = async (target: string) => {
    disk.reads.push(String(target));
    const held = disk.files.get(String(target));
    if (held === undefined) {
      const missing = new Error(`ENOENT: no such file, open '${String(target)}'`) as Error & { code: string };
      missing.code = 'ENOENT';
      throw missing;
    }
    return held;
  };
  const promises = { ...actual.promises, readFile };
  return { ...actual, promises, default: { ...actual, promises } };
});

import * as blocks from '../blocks/route';
import * as modulePresets from './modules/route';
import * as templatePresets from './templates/route';

/** The first place each route looks for a seed. */
function primary(name: string): string {
  return path.join(process.cwd(), 'src', 'data', name);
}

/** The second place each route looks, used when Studio runs from the repository root. */
function secondary(name: string): string {
  return path.join(process.cwd(), 'apps', 'frontend', 'src', 'data', name);
}

function place(where: string, value: unknown): void {
  disk.files.set(where, JSON.stringify(value));
}

function at(route: string): Request {
  return new Request(`http://127.0.0.1:3000${route}`);
}

async function read<T>(response: Response): Promise<{ status: number; body: T }> {
  return { status: response.status, body: (await response.json()) as T };
}

type Entity = { id: string; name: string; fields: { name: string; type: string }[] };

beforeEach(() => {
  disk.files.clear();
  disk.reads.length = 0;
  delete process.env.NEXT_PUBLIC_BASE_URL;
});

afterEach(() => {
  vi.unstubAllGlobals();
  delete process.env.NEXT_PUBLIC_BASE_URL;
});

describe('the module preset route', () => {
  it('answers an empty list and reads nothing when the query names no module', async () => {
    const { status, body } = await read<unknown[]>(await modulePresets.GET(at('/api/presets/modules')));
    expect(status).toBe(200);
    expect(body).toEqual([]);
    expect(disk.reads).toHaveLength(0);
  });

  it('returns the explicit preset the presets file holds for the module', async () => {
    place(primary('module-entity-presets.json'), {
      'land-registry': [{ id: 'ent_parcel', name: 'Parcel', fields: [] }],
    });
    const { body } = await read<Entity[]>(await modulePresets.GET(at('/api/presets/modules?id=land-registry')));
    expect(body).toEqual([{ id: 'ent_parcel', name: 'Parcel', fields: [] }]);
    expect(disk.reads).toEqual([primary('module-entity-presets.json')]);
  });

  it('falls back to the second location when the first holds no file', async () => {
    place(secondary('module-entity-presets.json'), {
      'land-registry': [{ id: 'ent_owner', name: 'Owner', fields: [] }],
    });
    const { body } = await read<Entity[]>(await modulePresets.GET(at('/api/presets/modules?id=land-registry')));
    expect(body[0].name).toBe('Owner');
    expect(disk.reads).toEqual([
      primary('module-entity-presets.json'),
      secondary('module-entity-presets.json'),
    ]);
  });

  it('builds an entity from the module tags when the presets file lacks the module', async () => {
    place(primary('module-entity-presets.json'), { other: [] });
    place(primary('modules.seed.json'), {
      modules: [
        { id: 'checkout', name: 'checkout', tags: ['Auth', 'Payment', 'NFT', 'ERC20'] },
      ],
    });

    const { status, body } = await read<Entity[]>(
      await modulePresets.GET(at('/api/presets/modules?id=checkout&track=blockchain')),
    );

    expect(status).toBe(200);
    expect(body).toHaveLength(1);
    expect(body[0].id).toBe('ent_checkout');
    expect(body[0].name).toBe('Checkout');
    expect(body[0].fields.map((field) => field.name)).toEqual([
      'id',
      'createdAt',
      'updatedAt',
      'email',
      'passwordHash',
      'role',
      'status',
      'amount',
      'currency',
      'tokenId',
      'owner',
      'metadata',
      'tokenAddress',
      'holder',
      'balance',
    ]);
  });

  it('reads a bare module list and names the entity after the module id', async () => {
    place(primary('modules.seed.json'), [{ id: 'reward-points', keywords: ['token'] }]);
    const { body } = await read<Entity[]>(await modulePresets.GET(at('/api/presets/modules?id=reward-points')));
    expect(body[0].name).toBe('Reward-points');
    expect(body[0].fields.map((field) => field.name)).toEqual([
      'id',
      'createdAt',
      'updatedAt',
      'tokenAddress',
      'holder',
      'balance',
    ]);
    expect(body[0].fields.find((field) => field.name === 'balance')?.type).toBe('bigint');
  });

  it('reads the categories of a module and adds the order fields', async () => {
    place(primary('modules.seed.json'), [{ id: 'orders', name: 'orders', categories: ['order'] }]);
    const { body } = await read<Entity[]>(await modulePresets.GET(at('/api/presets/modules?id=orders')));
    expect(body[0].fields.map((field) => field.name).slice(3)).toEqual(['status', 'amount', 'currency']);
  });

  it('gives a module with no tag the three base fields alone', async () => {
    place(primary('modules.seed.json'), { modules: [{ id: 'notes', name: 'notes' }] });
    const { body } = await read<Entity[]>(await modulePresets.GET(at('/api/presets/modules?id=notes')));
    expect(body[0].fields).toEqual([
      { name: 'id', type: 'string', required: true, unique: true, indexed: true },
      { name: 'createdAt', type: 'datetime', indexed: true },
      { name: 'updatedAt', type: 'datetime', indexed: true },
    ]);
  });

  it('answers an empty list when no seed names the module', async () => {
    place(primary('modules.seed.json'), { modules: [{ id: 'notes' }] });
    const { body } = await read<unknown[]>(await modulePresets.GET(at('/api/presets/modules?id=absent')));
    expect(body).toEqual([]);
  });

  it('answers an empty list when neither seed exists', async () => {
    const { body } = await read<unknown[]>(await modulePresets.GET(at('/api/presets/modules?id=absent')));
    expect(body).toEqual([]);
    expect(disk.reads).toHaveLength(4);
  });
});

describe('the template preset route', () => {
  function answerPresets(byModule: Record<string, unknown>) {
    const sent: string[] = [];
    vi.stubGlobal(
      'fetch',
      vi.fn(async (address: string) => {
        sent.push(String(address));
        const id = new URL(String(address), 'http://studio.test').searchParams.get('id') ?? '';
        const held = byModule[id];
        if (held === 'refuse') return new Response('{}', { status: 500 });
        if (held === 'unreachable') throw new TypeError('fetch failed');
        return Response.json(held ?? []);
      }),
    );
    return sent;
  }

  it('answers an empty list when the query names no template', async () => {
    const { body } = await read<unknown[]>(await templatePresets.GET(at('/api/presets/templates')));
    expect(body).toEqual([]);
    expect(disk.reads).toHaveLength(0);
  });

  it('answers an empty list when the catalogue lacks the template', async () => {
    place(primary('templates.seed.json'), { templates: [{ id: 'wallet', preinstalledModules: ['a'] }] });
    const { body } = await read<unknown[]>(await templatePresets.GET(at('/api/presets/templates?id=market')));
    expect(body).toEqual([]);
  });

  it('answers an empty list when the catalogue is absent', async () => {
    const { body } = await read<unknown[]>(await templatePresets.GET(at('/api/presets/templates?id=market')));
    expect(body).toEqual([]);
  });

  it('gathers the presets of every preinstalled module once each', async () => {
    process.env.NEXT_PUBLIC_BASE_URL = 'http://studio.test';
    place(primary('templates.seed.json'), {
      templates: [{ id: 'wallet', preinstalledModules: ['wallet-auth', 'erc20'], modules: ['ignored'] }],
    });
    const sent = answerPresets({
      'wallet-auth': [{ id: 'ent_account' }, { id: 'ent_session' }],
      erc20: [{ id: 'ent_session' }, { id: 'ent_balance' }],
    });

    const { status, body } = await read<{ id: string }[]>(
      await templatePresets.GET(at('/api/presets/templates?id=wallet&track=blockchain')),
    );

    expect(status).toBe(200);
    expect(body.map((entry) => entry.id)).toEqual(['ent_account', 'ent_session', 'ent_balance']);
    expect(sent).toEqual([
      'http://studio.test/api/presets/modules?id=wallet-auth&track=blockchain',
      'http://studio.test/api/presets/modules?id=erc20&track=blockchain',
    ]);
  });

  it('reads the module list of a bare catalogue and skips a module whose preset read fails', async () => {
    place(secondary('templates.seed.json'), [
      { id: 'market', modules: ['listing', 'escrow', 'reviews'] },
    ]);
    const sent = answerPresets({
      listing: [{ id: 'ent_listing' }],
      escrow: 'refuse',
      reviews: 'unreachable',
    });

    const { body } = await read<{ id: string }[]>(await templatePresets.GET(at('/api/presets/templates?id=market')));

    expect(body).toEqual([{ id: 'ent_listing' }]);
    expect(sent).toEqual([
      '/api/presets/modules?id=listing&track=dapp',
      '/api/presets/modules?id=escrow&track=dapp',
      '/api/presets/modules?id=reviews&track=dapp',
    ]);
  });

  it('answers an empty list for a template that lists no module', async () => {
    place(primary('templates.seed.json'), { templates: [{ id: 'blank' }] });
    const sent = answerPresets({});
    const { body } = await read<unknown[]>(await templatePresets.GET(at('/api/presets/templates?id=blank')));
    expect(body).toEqual([]);
    expect(sent).toEqual([]);
  });
});

describe('the logic block route', () => {
  it('answers 500 naming the missing seed', async () => {
    const { status, body } = await read<{ ok: boolean; error: string }>(await blocks.GET(at('/api/blocks')));
    expect(status).toBe(500);
    expect(body).toEqual({ ok: false, error: 'Not found: blocks.seed.json' });
  });

  it('keeps the blocks of the named track, the shared ones and the unmarked ones', async () => {
    place(secondary('blocks.seed.json'), {
      groups: [{ id: 'triggers' }],
      edgeDefaults: { animated: true },
      blocks: [
        { id: 'every', track: undefined },
        { id: 'dapp_only', track: 'dapp' },
        { id: 'chain_only', track: 'blockchain' },
        { id: 'shared', track: 'common' },
      ],
    });

    const { status, body } = await read<{
      ok: boolean;
      groups: unknown[];
      blocks: { id: string }[];
      edgeDefaults: unknown;
    }>(await blocks.GET(at('/api/blocks?track=DAPP')));

    expect(status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.groups).toEqual([{ id: 'triggers' }]);
    expect(body.edgeDefaults).toEqual({ animated: true });
    expect(body.blocks.map((entry) => entry.id)).toEqual(['every', 'dapp_only', 'shared']);
  });

  it('returns every block with empty groups and edge defaults when the seed holds neither', async () => {
    place(primary('blocks.seed.json'), { blocks: [{ id: 'a', track: 'dapp' }, { id: 'b', track: 'blockchain' }] });
    const { body } = await read<{ groups: unknown[]; blocks: { id: string }[]; edgeDefaults: unknown }>(
      await blocks.GET(at('/api/blocks')),
    );
    expect(body.groups).toEqual([]);
    expect(body.edgeDefaults).toEqual({});
    expect(body.blocks.map((entry) => entry.id)).toEqual(['a', 'b']);
  });

  it('answers an empty block list for a seed that holds none', async () => {
    place(primary('blocks.seed.json'), {});
    const { body } = await read<{ blocks: unknown[] }>(await blocks.GET(at('/api/blocks?track=blockchain')));
    expect(body.blocks).toEqual([]);
  });
});
