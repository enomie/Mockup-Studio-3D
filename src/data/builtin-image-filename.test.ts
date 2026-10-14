import { describe, expect, it } from 'vitest';
import {
  assertFormatMatchesOrientation,
  parseBuiltinImageBasename,
  sizeTokenToDimensions,
} from '@/data/builtin-image-filename';

const MIGRATED_BASENAMES = [
  'sample--portrait--772x1031',
  'sample--portrait--440x955',
  'sample--landscape--2560x1440',
  'sample--landscape--1439x960',
  'label-F--blue-transparent--square',
  'fabric--silk--square',
] as const;

describe('parseBuiltinImageBasename', () => {
  it('parses all migrated builtin names', () => {
    expect(parseBuiltinImageBasename('sample--portrait--772x1031')).toEqual({
      logicalName: 'sample',
      logicalFormat: 'portrait',
      sizeToken: '772x1031',
    });
    expect(parseBuiltinImageBasename('label-F--blue-transparent--square')).toEqual({
      logicalName: 'label-F',
      logicalFormat: 'blue-transparent',
      sizeToken: 'square',
    });
    expect(parseBuiltinImageBasename('fabric--silk--square')).toEqual({
      logicalName: 'fabric',
      logicalFormat: 'silk',
      sizeToken: 'square',
    });
  });

  it('accepts every migrated basename', () => {
    for (const basename of MIGRATED_BASENAMES) {
      expect(() => parseBuiltinImageBasename(basename)).not.toThrow();
    }
  });

  it('rejects wrong separator count', () => {
    expect(() => parseBuiltinImageBasename('sample-portrait-772x1031')).toThrow(
      /--/,
    );
    expect(() => parseBuiltinImageBasename('a--b')).toThrow();
  });

  it('rejects invalid pixelsize token', () => {
    expect(() => parseBuiltinImageBasename('sample--portrait--wide')).toThrow(
      /pixelsize/,
    );
  });
});

describe('sizeTokenToDimensions', () => {
  it('reads WxH from token', () => {
    expect(sizeTokenToDimensions('772x1031')).toEqual({
      width: 772,
      height: 1031,
    });
  });

  it('reads square from file dimensions', () => {
    expect(
      sizeTokenToDimensions('square', { width: 2048, height: 2048 }),
    ).toEqual({ width: 2048, height: 2048 });
  });

  it('rejects non-square file for square token', () => {
    expect(() =>
      sizeTokenToDimensions('square', { width: 100, height: 200 }),
    ).toThrow(/square/);
  });
});

describe('assertFormatMatchesOrientation', () => {
  it('validates portrait/landscape/square format tokens', () => {
    expect(() => { assertFormatMatchesOrientation('portrait', 'portrait', 'x'); },
    ).not.toThrow();
    expect(() => { assertFormatMatchesOrientation('portrait', 'landscape', 'bad'); },
    ).toThrow(/format/);
  });

  it('skips free-form format descriptors', () => {
    expect(() => { assertFormatMatchesOrientation('blue-transparent', 'square', 'x'); },
    ).not.toThrow();
  });
});
