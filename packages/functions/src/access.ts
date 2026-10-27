// Who may call the API. The Cognito pool is shared with other apps, so a valid token is not enough:
// the user must be in one of the groups this stage accepts (ACCESS_GROUPS, set in infra/api.ts).
// prod accepts only real users (catalyst-viewer); other stages also the test user (catalyst-viewer-test).

type Claims = Record<string, unknown> | undefined;

// HTTP API passes array claims flattened to a string, e.g. "[a b]".
export function groupsOf(claims: Claims): string[] {
  const raw = claims?.['cognito:groups'];
  if (Array.isArray(raw)) return raw.map(String);
  if (typeof raw !== 'string' || !raw.trim()) return [];
  return raw.trim().replace(/^\[|\]$/g, '').split(/[\s,"]+/).filter(Boolean);
}

// No ACCESS_GROUPS means nobody gets in.
export function allowedGroups(env: string | undefined = process.env.ACCESS_GROUPS): string[] {
  return (env ?? '').split(',').map(g => g.trim()).filter(Boolean);
}

export function hasAccess(claims: Claims, allowed: string[] = allowedGroups()): boolean {
  return groupsOf(claims).some(g => allowed.includes(g));
}
