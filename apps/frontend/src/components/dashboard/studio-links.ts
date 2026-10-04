// apps/frontend/src/components/dashboard/studio-links.ts
// The addresses the Dashboard screens open inside Studio and the Explorer.
// The Dashboard and Studio share one host, so every address starts from the
// origin the browser is already on. A fixed host would break the local host
// and every deployment that serves Studio under another name.
// Without this module each screen would guess the Studio host its own way.

import { type Division, pathSegmentForDivision, studioProjectUrl } from '@/config/divisions';

/** The origin the browser is on, or an empty string during server rendering. */
export function studioOrigin(): string {
  return typeof window === 'undefined' ? '' : window.location.origin;
}

/** The Studio chooser, where a new project starts. */
export function newProjectUrl(): string {
  return `${studioOrigin()}/`;
}

/** The Studio screen of one division, where a project of that kind starts. */
export function divisionStartUrl(division: Division): string {
  return `${studioOrigin()}/${pathSegmentForDivision(division)}`;
}

/** The Studio address that opens one saved project inside its division. */
export function openProjectUrl(projectId: string, division: string | null | undefined): string {
  return studioProjectUrl(studioOrigin(), projectId, division);
}

/**
 * The Explorer of the chain a deployment runs on.
 * Projects of the dApps division run on the public-access chain. Every other
 * division runs a private chain.
 */
export function explorerUrl(division: string | null | undefined): string {
  return `${studioOrigin()}/explorer/${division === 'dapp' ? 'public' : 'private'}`;
}

/** Opens an address in a new tab without handing the opener to that tab. */
export function openInNewTab(url: string): void {
  window.open(url, '_blank', 'noopener,noreferrer');
}
