/**
 * Keeps a redirect target on the Studio site.
 *
 * A sign out link names the page the browser lands on next. The value comes
 * from the address, so a stranger can write any value into it. A value naming
 * another site would send a person from Studio to a page the stranger controls.
 * This function admits a path on this site and answers the home page for every
 * other value.
 */
export function sameSitePath(value: string | null | undefined): string {
  if (typeof value !== 'string' || value.length === 0) {
    return '/';
  }
  // A path starts with one slash. Two slashes, or a slash and a backslash,
  // name another host to a browser.
  if (!value.startsWith('/') || value.startsWith('//') || value.startsWith('/\\')) {
    return '/';
  }
  // A control character or a backslash anywhere in the path reads differently
  // across browsers. The home page stands in for such a value.
  if (/[\u0000-\u001f\u007f\\]/.test(value)) {
    return '/';
  }
  return value;
}

/**
 * The page the browser lands on after a sign in.
 *
 * The sign in screen reads the landing page from the address. A value naming
 * another site, or a script address, lands on the home page. An absent value
 * lands on the dashboard.
 */
export function landingAfterSignIn(value: string | null | undefined): string {
  if (value === null || value === undefined || value.length === 0) {
    return '/dashboard';
  }
  return sameSitePath(value);
}
