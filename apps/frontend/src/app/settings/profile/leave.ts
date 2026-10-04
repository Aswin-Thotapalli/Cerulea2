// apps/frontend/src/app/settings/profile/leave.ts
// A full page move to a Studio route.
// Signing out and closing every session both end at a route handler that
// expires the browser cookie, so the browser has to load it as a page rather
// than through the client router.
// Without this module the profile screen would hold the browser location call inline.

/** Loads the given Studio path as a full page. */
export function leaveTo(path: string): void {
  window.location.assign(path);
}
