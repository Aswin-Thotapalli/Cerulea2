// apps/frontend/src/app/api/profile/_shared/profile.ts
// The profile and usage reads the account screens share.
// Cerulea APIs holds the profile fields beside the account and the usage
// figures beside the workspace. Both reads live here so the profile route and
// the account route answer the same shapes.
// Without this module each route would spell the same call twice.
import {
  type CeruleaApiOptions,
  type CeruleaWorkspace,
  CeruleaApiError,
  ceruleaRequest,
} from '@/lib/cerulea-api';

import type { PlanView } from './plan';

/** The profile shape Cerulea APIs answers. */
export type ProfileRecord = {
  user: { id: string; email: string; name: string; createdAt: string };
  profile: {
    displayName: string | null;
    avatarUrl: string | null;
    company: string | null;
    role: string | null;
  };
};

/** The usage summary of one workspace over the last thirty days. */
export type UsageSummary = {
  workspaceId: string;
  from: string;
  to: string;
  totals: { metric: string; unit: string; quantity: number }[];
};

/** The answer of GET /api/profile. */
export type ProfileView = {
  user: ProfileRecord['user'] & {
    state: string;
    multiFactorActive: boolean;
    lastSignInAt: string | null;
  };
  profile: ProfileRecord['profile'];
  plan: PlanView;
  workspace: { workspaceId: string; name: string; application: string } | null;
  projectCount: number | null;
  usage: UsageSummary | null;
  usageFix: string | null;
};

/** The change PUT /api/profile and PUT /api/auth/me send on. */
export type ProfileChange = {
  name?: string;
  displayName?: string;
  avatarUrl?: string;
  company?: string;
  role?: string;
};

/** Reads the profile of the signed in account. */
export function readProfile(options: CeruleaApiOptions): Promise<ProfileRecord> {
  return ceruleaRequest<ProfileRecord>('/studio/profile', { method: 'GET' }, options);
}

/** Changes the profile of the signed in account. A field left out stays as it is. */
export function changeProfile(change: ProfileChange, options: CeruleaApiOptions): Promise<ProfileRecord> {
  return ceruleaRequest<ProfileRecord>(
    '/studio/profile',
    { method: 'PUT', body: JSON.stringify(change) },
    options,
  );
}

/** Reads the usage of one workspace, and names the fix when the read is refused. */
export async function readUsage(
  workspace: CeruleaWorkspace | null,
  options: CeruleaApiOptions,
): Promise<{ usage: UsageSummary | null; fix: string | null }> {
  if (!workspace) return { usage: null, fix: null };
  try {
    const answer = await ceruleaRequest<{ usage: UsageSummary }>(
      `/v1/workspaces/${encodeURIComponent(workspace.workspaceId)}/usage`,
      { method: 'GET' },
      options,
    );
    return { usage: answer.usage, fix: null };
  } catch (cause) {
    return {
      usage: null,
      fix:
        cause instanceof CeruleaApiError
          ? cause.fix
          : 'Open the screen again. Report the problem to the Cerulea operator when it repeats.',
    };
  }
}
