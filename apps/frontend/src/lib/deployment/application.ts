// apps/frontend/src/lib/deployment/application.ts
// The live generated application, opened through Studio.
// Cerulea APIs renders every screen of a deployed application on the server at
// /applications/:projectId/screens/:screen and answers to the account token
// alone. The browser holds no token, so Studio carries each request across
// with the session token and hands the answer back. The application names its
// own address inside the markup it renders, so Studio points that name at this
// route. A link inside the application names a route such as /shipments or
// /shipments/{key}; Studio finds the screen that serves it.
// Without this module the link to the live application would open nothing.

import { type CeruleaApiOptions, CERULEA_STUDIO_DEVICE, ceruleaApiBaseUrl, ceruleaRequest, readBlueprint } from '@/lib/cerulea-api';
import { storedSection } from '@/lib/interface/server';
import type { InterfaceSection, Screen } from '@/lib/interface/types';

/** The values a person chose when they opened the application. */
export type ApplicationChoice = {
  role: string;
  deployment: string;
  width: string;
  mode: 'light' | 'dark';
  language: string;
};

/** The headers Studio hands back from the application answer. */
const PASSED_HEADERS = ['content-type', 'cache-control', 'etag', 'service-worker-allowed', 'last-modified'];

/** The address the application names for itself, as Cerulea APIs renders it. */
export function applicationBasePath(projectId: string): string {
  return `/applications/${projectId}`;
}

/** The address Studio serves the application on. */
export function studioApplicationPath(projectId: string): string {
  return `/api/projects/${encodeURIComponent(projectId)}/application`;
}

/** The name of the cookie holding the choice for one project. */
export function choiceCookieName(projectId: string): string {
  return `cerulea.application.${projectId.replace(/[^a-zA-Z0-9_-]/g, '_')}`;
}

/** Reads the choice out of a cookie value. */
export function readChoice(value: string | undefined): Partial<ApplicationChoice> {
  if (!value) return {};
  try {
    const held = JSON.parse(decodeURIComponent(value)) as Record<string, unknown>;
    const text = (key: string) => (typeof held[key] === 'string' ? (held[key] as string) : undefined);
    const mode = text('mode');
    return {
      role: text('role'),
      deployment: text('deployment'),
      width: text('width'),
      mode: mode === 'dark' ? 'dark' : mode === 'light' ? 'light' : undefined,
      language: text('language'),
    };
  } catch {
    return {};
  }
}

/** Writes the choice as a cookie value. */
export function writeChoice(choice: Partial<ApplicationChoice>): string {
  return encodeURIComponent(JSON.stringify(choice));
}

/** Turns one route pattern of a screen into a matcher. */
function routeMatcher(route: string): RegExp {
  const pattern = route
    .split('/')
    .map((part) => (/^\{[a-z][a-z0-9_]*\}$/.test(part) ? '([^/]+)' : part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))
    .join('/');
  return new RegExp(`^${pattern}/?$`);
}

/**
 * Finds the screen that serves one route.
 *
 * A route with a key, such as /shipments/{shipment_id}, captures the key. A
 * screen the role reaches wins over one it does not, so a list screen and a
 * detail screen on the same collection resolve by the route shape alone.
 */
export function screenForRoute(
  section: InterfaceSection,
  route: string,
  role: string | undefined,
): { screen: Screen; key?: string } | undefined {
  const path = route.startsWith('/') ? route : `/${route}`;
  const candidates = section.screens
    .filter((screen) => role === undefined || screen.roles.includes(role))
    .concat(section.screens);
  for (const screen of candidates) {
    const found = routeMatcher(screen.route).exec(path);
    if (found) {
      const key = found[1];
      return key === undefined ? { screen } : { screen, key: decodeURIComponent(key) };
    }
  }
  return undefined;
}

/** The first screen one role reaches, with its list screens first. */
export function firstScreenFor(section: InterfaceSection, role: string | undefined): Screen | undefined {
  const reachable = section.screens.filter((screen) => role === undefined || screen.roles.includes(role));
  return reachable.find((screen) => screen.kind === 'list') ?? reachable[0] ?? section.screens[0];
}

/** Reads the Views section the deployment renders: the authored one, or the generated one. */
export async function sectionOfProject(
  projectId: string,
  options: CeruleaApiOptions,
): Promise<{ section: InterfaceSection; roles: string[] }> {
  const held = await readBlueprint(projectId, {}, options);
  const document = held.document as { identities?: { roles?: { id: string }[] } };
  const roles = (document.identities?.roles ?? []).map((role) => role.id);
  const stored = storedSection(held.document);
  if (stored) return { section: stored, roles };
  const generated = await ceruleaRequest<{ section: InterfaceSection }>(
    '/engine/interface',
    { method: 'POST', body: JSON.stringify({ document: held.document }) },
    options,
  );
  return { section: generated.section, roles };
}

/** The answer Studio hands back for one application request. */
export type ApplicationAnswer = {
  status: number;
  headers: Record<string, string>;
  body: string | ArrayBuffer | null;
};

/**
 * Carries one request across to the application and hands the answer back.
 *
 * A text answer that names the application address is rewritten to name the
 * Studio address, so every link and script the markup carries keeps working.
 */
export async function carryApplicationRequest(input: {
  projectId: string;
  rest: string;
  search: URLSearchParams;
  method: string;
  body?: string;
  contentType?: string;
  options: CeruleaApiOptions;
}): Promise<ApplicationAnswer> {
  const base = ceruleaApiBaseUrl(input.options.baseUrl);
  const call = input.options.fetchImpl ?? fetch;
  const query = input.search.toString();
  const address = `${base}${applicationBasePath(input.projectId)}/${input.rest}${query.length > 0 ? `?${query}` : ''}`;
  const headers: Record<string, string> = { 'x-cerulea-device': input.options.device ?? CERULEA_STUDIO_DEVICE };
  if (input.options.accessToken) headers.authorization = `Bearer ${input.options.accessToken}`;
  if (input.contentType) headers['content-type'] = input.contentType;
  let response: Response;
  try {
    response = await call(address, {
      method: input.method,
      headers,
      ...(input.body === undefined ? {} : { body: input.body }),
      redirect: 'manual',
    });
  } catch {
    return {
      status: 503,
      headers: { 'content-type': 'text/plain; charset=utf-8' },
      body: `Cerulea APIs at ${base} did not answer. Start Cerulea APIs, then open the application again.`,
    };
  }
  const passed: Record<string, string> = {};
  for (const name of PASSED_HEADERS) {
    const value = response.headers.get(name);
    if (value) passed[name] = value;
  }
  const type = response.headers.get('content-type') ?? '';
  const textual = /text\/|json|javascript/.test(type);
  if (response.status === 304) return { status: 304, headers: passed, body: null };
  if (!textual) {
    return { status: response.status, headers: passed, body: await response.arrayBuffer() };
  }
  const text = await response.text();
  const rewritten = text.split(applicationBasePath(input.projectId)).join(studioApplicationPath(input.projectId));
  return { status: response.status, headers: passed, body: rewritten };
}
