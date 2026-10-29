import { describe, expect, it } from 'vitest';
import { SIZE_SCALE_MAX, SIZE_SCALE_MIN } from '@/constants';
import { FABRIC_CLOTH_REF_WIDTH_M } from './asset-fabric-cloth';
import {
  defaultHandheldParams,
  HANDHELD_PLACEHOLDER_ASPECT,
  SMARTPHONE_REF_SCREEN_HEIGHT_M,
  TABLET_REF_SCREEN_HEIGHT_M,
} from './asset-handheld';
import { defaultMonitorParams, MONITOR_REF_SCREEN_WIDTH_M } from './asset-monitor';
import { defaultTinCanParams } from './asset-tin-can';
import { defaultWineBottleParams } from './asset-wine-bottle';
import { DEFAULT_SIZE_SCALE, defaultTransform, type AssetEntity } from './entity-types';
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

  it('uses A5 portrait for book without image', () => {
    const book = computeFaceSize('book-softcover', undefined, undefined, 1);
    expect(book.width).toBeCloseTo(0.148);
    expect(book.height).toBeCloseTo(0.21);
    expect(book.height).toBeGreaterThan(book.width);
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

    const sizeScale = sizeScaleFromFaceWidth('print', targetWidth, aspect);
    expect(sizeScale).not.toBeNull();

    const face = computeFaceSize('print', imageWidth, imageHeight, sizeScale!);
    expect(face.width).toBeCloseTo(targetWidth);
    expect(face.height).toBeCloseTo(targetWidth / aspect);
  });

  it('roundtrips with computeFaceSize for pen footprint', () => {
    const aspect = resolveAssetAspectRatio('pen');
    const targetWidth = 0.012;
    const sizeScale = sizeScaleFromFaceWidth('pen', targetWidth, aspect);
    expect(sizeScale).not.toBeNull();

    const face = computeFaceSize('pen', undefined, undefined, sizeScale!);
    expect(face.width).toBeCloseTo(targetWidth);
    expect(face.height).toBeCloseTo(targetWidth / aspect);
  });

  it('computeFaceSize for tin-can uses radius and height times sizeScale', () => {
    const params = defaultTinCanParams();
    const entity: AssetEntity = {
      id: 'tin-1',
      type: 'asset',
      name: 'Can Tin',
      assetKind: 'tin-can',
      screenImageId: null,
      visible: true,
      transform: defaultTransform(),
      sizeScale: 2,
      tinCanParams: params,
    };
    const face = computeFaceSize(
      'tin-can',
      undefined,
      undefined,
      2,
      undefined,
      undefined,
      entity,
    );
    expect(face.width).toBeCloseTo(params.bodyRadiusM * 2 * 2);
    expect(face.height).toBeCloseTo(params.bodyHeightM * 2);
  });

  it('roundtrips with computeFaceSize for wine-bottle footprint', () => {
    const entity: AssetEntity = {
      id: 'wb-1',
      type: 'asset',
      name: 'Bottle Wine',
      assetKind: 'wine-bottle',
      screenImageId: null,
      visible: true,
      transform: defaultTransform(),
      sizeScale: DEFAULT_SIZE_SCALE,
      wineBottleParams: defaultWineBottleParams('sparkling'),
    };
    const aspect = resolveAssetAspectRatio(
      'wine-bottle',
      undefined,
      undefined,
      entity,
    );
    const targetHeight = 0.25;
    const sizeScale = sizeScaleFromFaceHeight(
      'wine-bottle',
      targetHeight,
      aspect,
      entity,
    );
    expect(sizeScale).not.toBeNull();

    const face = computeFaceSize(
      'wine-bottle',
      undefined,
      undefined,
      sizeScale!,
      undefined,
      undefined,
      entity,
    );
    expect(face.height).toBeCloseTo(targetHeight);
    expect(face.width).toBeCloseTo(targetHeight * aspect);
  });

  it('roundtrips with computeFaceSize for book-softcover', () => {
    const aspect = 4 / 3;
    const imageWidth = 800;
    const imageHeight = imageWidth / aspect;
    const targetWidth = 0.25;

    const sizeScale = sizeScaleFromFaceWidth('book-softcover', targetWidth, aspect);
    expect(sizeScale).not.toBeNull();

    const face = computeFaceSize(
      'book-softcover',
      imageWidth,
      imageHeight,
      sizeScale!,
    );
    expect(face.width).toBeCloseTo(targetWidth);
    expect(face.height).toBeCloseTo(targetWidth / aspect);
  });

  it('roundtrips with computeFaceSize for picture', () => {
    const aspect = 50 / 60;
    const imageWidth = 500;
    const imageHeight = imageWidth / aspect;
    const targetWidth = 0.75;

    const sizeScale = sizeScaleFromFaceWidth('picture', targetWidth, aspect);
    expect(sizeScale).not.toBeNull();

    const face = computeFaceSize('picture', imageWidth, imageHeight, sizeScale!);
    expect(face.width).toBeCloseTo(targetWidth);
    expect(face.height).toBeCloseTo(targetWidth / aspect);
  });

  it('rejects non-positive width', () => {
    const aspect = resolveAssetAspectRatio('print');
    expect(sizeScaleFromFaceWidth('print', 0, aspect)).toBeNull();
    expect(sizeScaleFromFaceWidth('print', -0.1, aspect)).toBeNull();
  });

  it('rejects width outside sizeScale range', () => {
    const aspect = resolveAssetAspectRatio('print');
    const minWidth = referenceFaceWidth('print') * SIZE_SCALE_MIN;
    const maxWidth = referenceFaceWidth('print') * SIZE_SCALE_MAX;

    expect(sizeScaleFromFaceWidth('print', minWidth * 0.5, aspect)).toBeNull();
    expect(sizeScaleFromFaceWidth('print', maxWidth * 1.1, aspect)).toBeNull();
    expect(sizeScaleFromFaceWidth('print', minWidth, aspect)).toBeCloseTo(SIZE_SCALE_MIN);
    expect(sizeScaleFromFaceWidth('print', maxWidth, aspect)).toBeCloseTo(SIZE_SCALE_MAX);
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

describe('handheld face size', () => {
  const imageW = 900;
  const imageH = 1600;
  const aspect = imageW / imageH;

  it('uses portrait placeholder without image for smartphone', () => {
    const face = computeFaceSize('smartphone');
    expect(face.height).toBeCloseTo(SMARTPHONE_REF_SCREEN_HEIGHT_M);
    expect(face.width).toBeCloseTo(SMARTPHONE_REF_SCREEN_HEIGHT_M * HANDHELD_PLACEHOLDER_ASPECT);
  });

  it('uses portrait placeholder without image for tablet', () => {
    const face = computeFaceSize('tablet');
    expect(face.height).toBeCloseTo(TABLET_REF_SCREEN_HEIGHT_M);
    expect(face.width).toBeCloseTo(TABLET_REF_SCREEN_HEIGHT_M * HANDHELD_PLACEHOLDER_ASPECT);
  });

  it('couples width and height when editing smartphone width with image aspect', () => {
    const targetWidth = 0.1;
    const sizeScale = sizeScaleFromFaceWidth('smartphone', targetWidth, aspect);
    expect(sizeScale).not.toBeNull();

    const face = computeFaceSize('smartphone', imageW, imageH, sizeScale!);
    expect(face.width).toBeCloseTo(targetWidth);
    expect(face.height).toBeCloseTo(targetWidth / aspect);
  });

  it('couples width and height when editing smartphone height with image aspect', () => {
    const targetHeight = 0.2;
    const sizeScale = sizeScaleFromFaceHeight('smartphone', targetHeight, aspect);
    expect(sizeScale).not.toBeNull();

    const face = computeFaceSize('smartphone', imageW, imageH, sizeScale!);
    expect(face.height).toBeCloseTo(targetHeight);
    expect(face.width).toBeCloseTo(targetHeight * aspect);
  });
});

describe('fabric-cloth face size', () => {
  const imageW = 800;
  const imageH = 1200;
  const aspect = imageW / imageH;

  it('uses square placeholder without image', () => {
    const face = computeFaceSize('fabric-cloth');
    expect(face.width).toBeCloseTo(FABRIC_CLOTH_REF_WIDTH_M);
    expect(face.height).toBeCloseTo(FABRIC_CLOTH_REF_WIDTH_M);
  });

  it('derives height from image aspect', () => {
    const face = computeFaceSize('fabric-cloth', imageW, imageH);
    expect(face.width).toBeCloseTo(FABRIC_CLOTH_REF_WIDTH_M);
    expect(face.height).toBeCloseTo(FABRIC_CLOTH_REF_WIDTH_M / aspect);
  });

  it('couples width and height when editing width via sizeScale', () => {
    const targetWidth = 0.6;
    const sizeScale = sizeScaleFromFaceWidth('fabric-cloth', targetWidth, aspect);
    expect(sizeScale).not.toBeNull();

    const face = computeFaceSize('fabric-cloth', imageW, imageH, sizeScale!);
    expect(face.width).toBeCloseTo(targetWidth);
    expect(face.height).toBeCloseTo(targetWidth / aspect);
  });

  it('couples width and height when editing height via sizeScale', () => {
    const targetHeight = 0.5;
    const sizeScale = sizeScaleFromFaceHeight('fabric-cloth', targetHeight, aspect);
    expect(sizeScale).not.toBeNull();

    const face = computeFaceSize('fabric-cloth', imageW, imageH, sizeScale!);
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
      name: 'Device Smartphone 1',
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
      name: 'Device Desktop 1',
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
