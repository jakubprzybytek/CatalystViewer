import { describe, expect, it } from 'vitest';
import { colorMarkers } from './ColorCodes';

describe('colorMarkers', () => {
  it('uses a neutral tinted badge for white marker instead of pure white', () => {
    const whiteMarker = colorMarkers.white;

    expect(whiteMarker).toBeDefined();
    expect(whiteMarker?.backgroundColor).not.toBe('white');
  });
});
