import { afterEach, describe, expect, it, vi } from 'vitest';

import * as client from './cerulea-api';
import { firstWorkspaceName, homeWorkspace, workspacesWithHome } from './workspace-home';

function workspace(id: string, name: string): client.CeruleaWorkspace {
  return {
    workspaceId: id,
    name,
    slug: name.toLowerCase().replace(/\s+/g, '-'),
    application: 'dapps',
    tier: 'starter',
    state: 'active',
    ownerAccountId: 'acc-1',
    createdAt: '2026-09-01T00:00:00.000Z',
  };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('firstWorkspaceName', () => {
  it('names the first workspace after the person', () => {
    expect(firstWorkspaceName('Anita Rao')).toBe('Anita Rao workspace');
  });

  it('falls back to a plain name when no display name arrived', () => {
    expect(firstWorkspaceName('   ')).toBe('My workspace');
  });
});

describe('workspacesWithHome', () => {
  it('returns the list Cerulea holds when one exists', async () => {
    vi.spyOn(client, 'listWorkspaces').mockResolvedValue({
      workspaces: [workspace('ws-1', 'Harbour')],
    });
    const opening = vi.spyOn(client, 'createWorkspace');
    const list = await workspacesWithHome('Anita Rao', {});
    expect(list).toHaveLength(1);
    expect(opening).not.toHaveBeenCalled();
  });

  it('opens the first workspace so no screen shows an empty chooser', async () => {
    vi.spyOn(client, 'listWorkspaces').mockResolvedValue({ workspaces: [] });
    vi.spyOn(client, 'createWorkspace').mockResolvedValue({
      workspace: workspace('ws-2', 'Anita Rao workspace'),
    });
    const list = await workspacesWithHome('Anita Rao', {});
    expect(list).toHaveLength(1);
    expect(list[0].name).toBe('Anita Rao workspace');
  });
});

describe('homeWorkspace', () => {
  it('takes the named workspace when the account belongs to it', async () => {
    vi.spyOn(client, 'listWorkspaces').mockResolvedValue({
      workspaces: [workspace('ws-1', 'Harbour'), workspace('ws-2', 'Land office')],
    });
    expect((await homeWorkspace('Anita Rao', {}, 'ws-2')).name).toBe('Land office');
  });

  it('takes the first workspace when the named one is absent', async () => {
    vi.spyOn(client, 'listWorkspaces').mockResolvedValue({
      workspaces: [workspace('ws-1', 'Harbour')],
    });
    expect((await homeWorkspace('Anita Rao', {}, 'ws-9')).workspaceId).toBe('ws-1');
  });
});
