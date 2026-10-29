import { Scene } from 'three/webgpu';
import { describe, expect, it } from 'vitest';
import { FabricClothPinSet } from './fabric-cloth-pins';

describe('FabricClothPinSet', () => {
  it('shows only active pin anchors', () => {
    const scene = new Scene();
    const pins = new FabricClothPinSet(scene, 'e1');
    pins.applyVisibility(2, true);
    expect(pins.pinAnchors[0]?.visible).toBe(true);
    expect(pins.pinAnchors[1]?.visible).toBe(true);
    expect(pins.pinAnchors[2]?.visible).toBe(false);
    pins.dispose();
  });

  it('syncs pin positions from centerline buffer', () => {
    const scene = new Scene();
    const pins = new FabricClothPinSet(scene, 'e2');
    const cornerIndexMap = [0, 1, 2, 3];
    const pos = new Float32Array([
      1, 2, 3,
      4, 5, 6,
      7, 8, 9,
      10, 11, 12,
    ]);
    pins.syncFromWorldCenterline(cornerIndexMap, pos);
    expect(pins.pinAnchors[0]?.position.x).toBe(1);
    expect(pins.pinAnchors[1]?.position.y).toBe(5);
    pins.dispose();
  });
});
