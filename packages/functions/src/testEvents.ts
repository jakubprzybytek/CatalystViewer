// For handler tests: an API event from a user in an accepted group (see access.ts).
process.env.ACCESS_GROUPS = 'catalyst-viewer';

export function apiEvent<T extends object>(fields: T, groups = '[catalyst-viewer]'): never {
  return { ...fields, requestContext: { authorizer: { jwt: { claims: { 'cognito:groups': groups } } } } } as never;
}
