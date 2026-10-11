import { describe, expect, it } from 'vitest';
import { SIZE_SCALE_MAX, SIZE_SCALE_MIN } from '@/constants';
import { defaultHandheldParams } from './asset-handheld';
import { defaultMonitorParams, MONITOR_REF_SCREEN_WIDTH_M } from './asset-monitor';
import type { AssetEntity } from './entity-types';
import {
  assetFootprintHeight,
  assetGroundCenterY,
  assetTransformUsesFootPivot,
  computeFaceSize,
  footWorldY,
  footWorldYPreservedAfterFootprintChange,
  referenceFaceHeight,
  referenceFaceWidth,
  resolveAssetAspectRatio,
  sizeScaleFromFaceHeight,
  sizeScaleFromFaceWidth,
  transformYForFootWorldY,
} from './asset-sizing';

describe('referenceFaceWidth', () => {
  it('returns print and picture reference widths', () => {
    expect(referenceFaceWidth('print')).toBe(0.148);
    expect(referenceFaceWidth('picture')).toBe(0.5);
  });

  it('returns monitor reference screen width', () => {
    expect(referenceFaceWidth('monitor')).toBe(MONITOR_REF_SCREEN_WIDTH_M);
  });
});

describe('referenceFaceHeight', () => {
  it('returns handheld reference screen heights', () => {
    expect(referenceFaceHeight('smartphone')).toBe(0.16);
    expect(referenceFaceHeight('tablet')).toBe(0.25);
  });
});

describe('resolveAssetAspectRatio', () => {
  it('uses image pixels when available', () => {
    expect(resolveAssetAspectRatio('print', 800, 600)).toBeCloseTo(800 / 600);
  });

  it('falls back to placeholder aspect without image', () => {
    expect(resolveAssetAspectRatio('print')).toBeCloseTo(148 / 210);
    expect(resolveAssetAspectRatio('picture')).toBeCloseTo(50 / 60);
    expect(resolveAssetAspectRatio('smartphone')).toBeCloseTo(9 / 16);
    expect(resolveAssetAspectRatio('tablet')).toBeCloseTo(9 / 16);
    expect(resolveAssetAspectRatio('monitor')).toBeCloseTo(16 / 9);
  });
});

describe('computeFaceSize portrait placeholder defaults', () => {
  it('uses A5 portrait for print without image', () => {
    const print = computeFaceSize('print', undefined, undefined, 1);
    expect(print.width).toBeCloseTo(0.148);
    expect(print.height).toBeCloseTo(0.21);
    expect(print.height).toBeGreaterThan(print.width);
  });

  it('uses portrait placeholder for handheld without image', () => {
    const phone = computeFaceSize('smartphone', undefined, undefined, 1);
    expect(phone.height).toBeGreaterThan(phone.width);

    const tablet = computeFaceSize('tablet', undefined, undefined, 1);
    expect(tablet.height).toBeGreaterThan(tablet.width);
  });
});

describe('sizeScaleFromFaceWidth', () => {
  it('roundtrips with computeFaceSize for print', () => {
    const aspect = 4 / 3;
    const imageWidth = 800;
    const imageHeight = imageWidth / aspect;
    const targetWidth = 0.3;

    const sizeScale = sizeScaleFromFaceWidth('print', targetWidth);
    expect(sizeScale).not.toBeNull();

    const face = computeFaceSize('print', imageWidth, imageHeight, sizeScale!);
    expect(face.width).toBeCloseTo(targetWidth);
    expect(face.height).toBeCloseTo(targetWidth / aspect);
  });

  it('roundtrips with computeFaceSize for picture', () => {
    const aspect = 50 / 60;
    const imageWidth = 500;
    const imageHeight = imageWidth / aspect;
    const targetWidth = 0.75;

    const sizeScale = sizeScaleFromFaceWidth('picture', targetWidth);
    expect(sizeScale).not.toBeNull();

    const face = computeFaceSize('picture', imageWidth, imageHeight, sizeScale!);
    expect(face.width).toBeCloseTo(targetWidth);
    expect(face.height).toBeCloseTo(targetWidth / aspect);
  });

  it('rejects non-positive width', () => {
    expect(sizeScaleFromFaceWidth('print', 0)).toBeNull();
    expect(sizeScaleFromFaceWidth('print', -0.1)).toBeNull();
  });

  it('rejects width outside sizeScale range', () => {
    const minWidth = referenceFaceWidth('print') * SIZE_SCALE_MIN;
    const maxWidth = referenceFaceWidth('print') * SIZE_SCALE_MAX;

    expect(sizeScaleFromFaceWidth('print', minWidth * 0.5)).toBeNull();
    expect(sizeScaleFromFaceWidth('print', maxWidth * 1.1)).toBeNull();
    expect(sizeScaleFromFaceWidth('print', minWidth)).toBeCloseTo(SIZE_SCALE_MIN);
    expect(sizeScaleFromFaceWidth('print', maxWidth)).toBeCloseTo(SIZE_SCALE_MAX);
  });
});

describe('sizeScaleFromFaceHeight', () => {
  it('roundtrips with computeFaceSize using placeholder aspect', () => {
    const aspect = resolveAssetAspectRatio('print');
    const targetHeight = 0.45;

    const sizeScale = sizeScaleFromFaceHeight('print', targetHeight, aspect);
    expect(sizeScale).not.toBeNull();

    const face = computeFaceSize('print', undefined, undefined, sizeScale!);
    expect(face.height).toBeCloseTo(targetHeight);
    expect(face.width).toBeCloseTo(targetHeight * aspect);
  });

  it('rejects non-positive height or aspect', () => {
    expect(sizeScaleFromFaceHeight('print', 0, 148 / 210)).toBeNull();
    expect(sizeScaleFromFaceHeight('print', 0.5, 0)).toBeNull();
  });

  it('rejects height outside sizeScale range', () => {
    const aspect = resolveAssetAspectRatio('print');
    const minFace = computeFaceSize('print', undefined, undefined, SIZE_SCALE_MIN);
    const maxFace = computeFaceSize('print', undefined, undefined, SIZE_SCALE_MAX);

    expect(sizeScaleFromFaceHeight('print', minFace.height * 0.5, aspect)).toBeNull();
    expect(sizeScaleFromFaceHeight('print', maxFace.height * 1.1, aspect)).toBeNull();
    expect(sizeScaleFromFaceHeight('print', minFace.height, aspect)).toBeCloseTo(
      SIZE_SCALE_MIN,
    );
    expect(sizeScaleFromFaceHeight('print', maxFace.height, aspect)).toBeCloseTo(
      SIZE_SCALE_MAX,
    );
  });

  it('roundtrips with computeFaceSize for smartphone using screen height', () => {
    const aspect = 9 / 16;
    const targetHeight = 0.2;

    const sizeScale = sizeScaleFromFaceHeight('smartphone', targetHeight, aspect);
    expect(sizeScale).not.toBeNull();

    const face = computeFaceSize('smartphone', 900, 1600, sizeScale!);
    expect(face.height).toBeCloseTo(targetHeight);
    expect(face.width).toBeCloseTo(targetHeight * aspect);
  });
});

describe('assetFootprintHeight', () => {
  it('includes bezel on handheld devices', () => {
    const face = computeFaceSize('smartphone', undefined, undefined, 1);
    const entity: AssetEntity = {
      id: 'test',
      type: 'asset',
      name: 'Smartphone 1',
      assetKind: 'smartphone',
      screenImageId: null,
      sizeScale: 1,
      params: defaultHandheldParams('smartphone'),
      visible: true,
      transform: {
        position: { x: 0, y: 0, z: 0 },
        rotation: { x: 0, y: 0, z: 0 },
      },
    };

    const footprint = assetFootprintHeight('smartphone', face, 1, entity);
    expect(footprint).toBeGreaterThan(face.height);
  });

  it('includes stand and bezel on monitor', () => {
    const face = computeFaceSize('monitor', undefined, undefined, 1);
    const params = defaultMonitorParams();
    const entity: AssetEntity = {
      id: 'test',
      type: 'asset',
      name: 'Monitor 1',
      assetKind: 'monitor',
      screenImageId: null,
      sizeScale: 1,
      params,
      visible: true,
      transform: {
        position: { x: 0, y: 0, z: 0 },
        rotation: { x: 0, y: 0, z: 0 },
      },
    };

    const footprint = assetFootprintHeight('monitor', face, 1, entity);
    const standM =
      (params.standBaseHeightMm + params.standFootHeightMm) * 0.001;
    expect(footprint).toBeGreaterThan(face.height + standM);
  });
});

describe('assetGroundCenterY wall', () => {
  it('spawns with foot on ground plane', () => {
    const face = computeFaceSize('wall', undefined, undefined, 1);
    expect(assetGroundCenterY('wall', face, 1)).toBe(0);
  });
});

describe('assetGroundCenterY block', () => {
  it('spawns with foot on ground plane', () => {
    const face = computeFaceSize('block', undefined, undefined, 1);
    expect(assetGroundCenterY('block', face, 1)).toBe(0);
  });
});

describe('foot world Y', () => {
  it('uses foot pivot for wall and center pivot for smartphone', () => {
    expect(assetTransformUsesFootPivot('wall')).toBe(true);
    expect(assetTransformUsesFootPivot('smartphone')).toBe(false);
  });

  it('roundtrips foot Y for wall at ground', () => {
    const face = computeFaceSize('wall', undefined, undefined, 1);
    const spawnY = assetGroundCenterY('wall', face, 1);
    const entity: AssetEntity = {
      id: 'w1',
      type: 'asset',
      name: 'Wall',
      assetKind: 'wall',
      screenImageId: null,
      sizeScale: 1,
      visible: true,
      transform: {
        position: { x: 0, y: spawnY, z: 0 },
        rotation: { x: 0, y: 0, z: 0 },
      },
    };
    expect(footWorldY(entity, null)).toBe(0);
    expect(transformYForFootWorldY(entity, 0, null)).toBe(spawnY);
  });

  it('preserves foot when smartphone sizeScale increases', () => {
    const face = computeFaceSize('smartphone', undefined, undefined, 1);
    const spawnY = assetGroundCenterY('smartphone', face, 1);
    const base: AssetEntity = {
      id: 'p1',
      type: 'asset',
      name: 'Phone',
      assetKind: 'smartphone',
      screenImageId: null,
      sizeScale: 1,
      params: defaultHandheldParams('smartphone'),
      visible: true,
      transform: {
        position: { x: 0, y: spawnY, z: 0 },
        rotation: { x: 0, y: 0, z: 0 },
      },
    };
    const scaled: AssetEntity = { ...base, sizeScale: 1.5 };
    const foot = footWorldY(base, null);
    const nextY = transformYForFootWorldY(scaled, foot, null);
    expect(nextY).toBeGreaterThan(spawnY);
    const after: AssetEntity = {
      ...scaled,
      transform: {
        ...scaled.transform,
        position: { ...scaled.transform.position, y: nextY },
      },
    };
    expect(footWorldYPreservedAfterFootprintChange(base, after, null)).toBe(true);
  });
});
