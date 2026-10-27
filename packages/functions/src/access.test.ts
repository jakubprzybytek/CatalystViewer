import { describe, expect, it } from 'vitest';
import { allowedGroups, groupsOf, hasAccess } from './access';

describe('groupsOf', () => {
  it('reads the flattened and array forms', () => {
    expect(groupsOf({ 'cognito:groups': '[catalyst-viewer portfolio-tracker]' })).toEqual(['catalyst-viewer', 'portfolio-tracker']);
    expect(groupsOf({ 'cognito:groups': '[catalyst-viewer]' })).toEqual(['catalyst-viewer']);
    expect(groupsOf({ 'cognito:groups': '["catalyst-viewer","admins"]' })).toEqual(['catalyst-viewer', 'admins']);
    expect(groupsOf({ 'cognito:groups': ['catalyst-viewer'] })).toEqual(['catalyst-viewer']);
    expect(groupsOf({ 'cognito:groups': 'catalyst-viewer' })).toEqual(['catalyst-viewer']);
  });

  it('is empty without groups', () => {
    expect(groupsOf(undefined)).toEqual([]);
    expect(groupsOf({ sub: 'x' })).toEqual([]);
    expect(groupsOf({ 'cognito:groups': '' })).toEqual([]);
  });
});

describe('hasAccess', () => {
  const prod = allowedGroups('catalyst-viewer');
  const int = allowedGroups('catalyst-viewer,catalyst-viewer-test');

  it('prod accepts real users only', () => {
    expect(hasAccess({ 'cognito:groups': '[portfolio-tracker catalyst-viewer]' }, prod)).toBe(true);
    expect(hasAccess({ 'cognito:groups': '[catalyst-viewer-test]' }, prod)).toBe(false);
    expect(hasAccess({ 'cognito:groups': '[portfolio-tracker]' }, prod)).toBe(false);
  });

  it('other stages also accept the test user', () => {
    expect(hasAccess({ 'cognito:groups': '[catalyst-viewer-test]' }, int)).toBe(true);
    expect(hasAccess({ 'cognito:groups': '[catalyst-viewer]' }, int)).toBe(true);
  });

  it('nobody gets in without configured groups or user groups', () => {
    expect(hasAccess({ 'cognito:groups': '[catalyst-viewer]' }, allowedGroups(undefined))).toBe(false);
    expect(hasAccess(undefined, prod)).toBe(false);
  });
});
