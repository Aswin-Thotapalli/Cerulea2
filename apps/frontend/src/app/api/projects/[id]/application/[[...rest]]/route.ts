// apps/frontend/src/app/api/projects/[id]/application/[[...rest]]/route.ts
// The live generated application of one project, served through Studio.
// Cerulea APIs renders every screen on the server and answers the account
// token alone. This route carries each request across with the session token:
// the screens, the client script, the offline worker, the translated strings,
// the assets and the outbox writes. A link inside the application names a
// route such as /shipments; the route finds the screen that serves it. The
// role and the deployment a person opened the application with travel in a
// cookie, so every later link keeps them.
// Without this route the link to the live application would open nothing.
import { NextResponse } from 'next/server';

import {
  carryApplicationRequest,
  choiceCookieName,
  firstScreenFor,
  readChoice,
  screenForRoute,
  sectionOfProject,
  studioApplicationPath,
  writeChoice,
} from '@/lib/deployment/application';
import type { Screen } from '@/lib/interface/types';
import { callOptions, ceruleaActor, failureReply, failureResponse, signInRequired } from '@/lib/cerulea-server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type Context = { params: Promise<{ id: string; rest?: string[] }> };

/** The parts of the application Cerulea APIs serves under their own names. */
const DIRECT_PARTS = new Set(['screens', 'client.js', 'offline-worker.js', 'strings', 'assets', 'outbox']);

/** Reads one cookie out of the request. */
function cookieValue(request: Request, name: string): string | undefined {
  const header = request.headers.get('cookie') ?? '';
  for (const part of header.split(';')) {
    const [key, ...rest] = part.trim().split('=');
    if (key === name) return rest.join('=');
  }
  return undefined;
}

async function handle(request: Request, context: Context): Promise<Response> {
  const params = await context.params;
  const actor = await ceruleaActor();
  if (!actor) return signInRequired();
  const options = callOptions(actor);
  const url = new URL(request.url);
  const rest = (params.rest ?? []).map((part) => decodeURIComponent(part));
  const cookieName = choiceCookieName(params.id);
  const remembered = readChoice(cookieValue(request, cookieName));

  // The sign out link of the application chrome leads back to Studio.
  if (rest[0] === 'sign-out') {
    return NextResponse.redirect(new URL('/dashboard', url.origin));
  }

  try {
    let target = rest.join('/');
    const search = new URLSearchParams(url.searchParams);

    if (rest.length === 0 || !DIRECT_PARTS.has(rest[0])) {
      // A route of the application. Find the screen that serves it.
      const { section, roles } = await sectionOfProject(params.id, options);
      const role = search.get('role') ?? remembered.role ?? roles[0];
      const found: { screen: Screen; key?: string } | undefined =
        rest.length === 0
          ? (() => {
              const screen = firstScreenFor(section, role);
              return screen === undefined ? undefined : { screen };
            })()
          : screenForRoute(section, `/${rest.join('/')}`, role);
      if (found === undefined || role === undefined) {
        return failureResponse(
          {
            code: 'application.screen_absent',
            message: `The application holds no screen at /${rest.join('/')}.`,
            fix: 'Open a screen the navigation lists.',
            details: { route: `/${rest.join('/')}` },
          },
          404,
        );
      }
      target = `screens/${encodeURIComponent(found.screen.id)}`;
      search.set('role', role);
      if (found.key !== undefined) search.set('key', found.key);
    }

    // The role and the deployment travel in the cookie once chosen.
    const choice = {
      role: search.get('role') ?? remembered.role,
      deployment: search.get('deployment') ?? remembered.deployment,
      width: search.get('width') ?? remembered.width,
      mode: (search.get('mode') ?? remembered.mode) as 'light' | 'dark' | undefined,
      language: search.get('language') ?? remembered.language,
    };
    if (rest[0] === 'screens' || !DIRECT_PARTS.has(rest[0] ?? '')) {
      if (choice.role && !search.has('role')) search.set('role', choice.role);
      if (choice.deployment && !search.has('deployment')) search.set('deployment', choice.deployment);
      if (choice.width && !search.has('width')) search.set('width', choice.width);
      if (choice.mode && !search.has('mode')) search.set('mode', choice.mode);
      if (choice.language && !search.has('language')) search.set('language', choice.language);
    }
    if (rest[0] === 'outbox') {
      if (choice.role && !search.has('role')) search.set('role', choice.role);
      if (choice.deployment && !search.has('deployment')) search.set('deployment', choice.deployment);
    }

    const body = request.method === 'GET' || request.method === 'HEAD' ? undefined : await request.text();
    const answer = await carryApplicationRequest({
      projectId: params.id,
      rest: target,
      search,
      method: request.method,
      body,
      contentType: request.headers.get('content-type') ?? undefined,
      options,
    });
    const headers = new Headers(answer.headers);
    headers.set('x-cerulea-application', studioApplicationPath(params.id));
    const response = new NextResponse(answer.body, { status: answer.status, headers });
    if (choice.role || choice.deployment) {
      response.cookies.set(cookieName, writeChoice(choice), {
        path: studioApplicationPath(params.id),
        sameSite: 'lax',
        httpOnly: true,
      });
    }
    return response;
  } catch (cause) {
    return failureReply(cause);
  }
}

export const GET = handle;
export const POST = handle;
export const HEAD = handle;
