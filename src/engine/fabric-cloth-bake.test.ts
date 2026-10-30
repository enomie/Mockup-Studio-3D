import { describe, expect, it } from 'vitest';
import { Group, MeshBasicMaterial, PlaneGeometry } from 'three/webgpu';
import {
  bakeFabricClothMeshFromDeformed,
  bakeFabricClothMeshFromVerletBinding,
  buildBufferGeometryFromBakedMeshPayload,
  normalizeFabricClothBakedMeshPayload,
  validateFabricClothBakedRestPlaneExtents,
} from './fabric-cloth-bake';
import { fabricClothBorderMaskFromRestPlane } from './fabric-cloth-border-nodes';
import { fabricClothGridSegments } from '@/physics/fabric-cloth-grid';
import { fabricClothBakedMeshTopology } from '@/scene/user-baked-asset';
import {
  buildFabricClothMeshFromOptions,
  readFabricClothPlaneSegments,
} from './fabric-cloth-geometry';
import {
  defaultFabricClothParams,
  FABRIC_CLOTH_BORDER_WIDTH_M,
  FABRIC_CLOTH_REST_PLANE_XY_ATTR,
} from '@/scene/asset-fabric-cloth';
import type { AssetEntity } from '@/scene/entity-types';
import {
  createFabricClothVerletBinding,
  flushBindingPlane,
} from './fabric-cloth-verlet-session';
import { vec3Get, vec3Set } from '@/physics/cloth/float-buffer';

describe('fabric-cloth-bake', () => {
  it('upsamples the sim grid 3x and rebuilds an indexed plane', () => {
    const segmentsW = 4;
    const segmentsH = 4;
    const w = 0.45;
    const h = 0.45;
    const mesh = buildFabricClothMeshFromOptions({
      faceWidth: w,
      faceHeight: h,
      material: new MeshBasicMaterial(),
      segments: { segmentsW, segmentsH },
    });
    const pos = mesh.geometry.getAttribute('position').array as Float32Array;
    const nu = segmentsW + 1;
    const nv = segmentsH + 1;
    for (let u = 0; u < nu; u++) {
      for (let v = 0; v < nv; v++) {
        pos[(v * nu + u) * 3 + 2] = 0.01 * (u + v);
      }
    }
    const payload = bakeFabricClothMeshFromDeformed(mesh);
    expect(payload.segmentsW).toBe(segmentsW * 3);
    expect(payload.segmentsH).toBe(segmentsH * 3);
    // Every sim vertex survives exactly, with its uv / rest-plane coordinate
    // (dense PlaneGeometry order: row 0 at +Y, every 3rd vertex is a sim vertex).
    const liveUv = mesh.geometry.getAttribute('uv').array as Float32Array;
    const liveRest = mesh.geometry.getAttribute(FABRIC_CLOTH_REST_PLANE_XY_ATTR)
      .array as Float32Array;
    const denseNu = payload.segmentsW + 1;
    for (let v = 0; v < nv; v++) {
      for (let u = 0; u < nu; u++) {
        const j = v * nu + u;
        const i = (nv - 1 - v) * 3 * denseNu + u * 3;
        expect(payload.positions[i * 3 + 2]).toBeCloseTo(pos[j * 3 + 2], 6);
        expect(payload.uvs[i * 2]).toBeCloseTo(liveUv[j * 2], 6);
        expect(payload.uvs[i * 2 + 1]).toBeCloseTo(liveUv[j * 2 + 1], 6);
        expect(payload.restPlaneXY[i * 2 + 1]).toBeCloseTo(liveRest[j * 2 + 1], 6);
      }
    }
    const rebuilt = buildBufferGeometryFromBakedMeshPayload(payload);
    expect(rebuilt.getAttribute('position').count).toBe(
      (payload.segmentsW + 1) * (payload.segmentsH + 1),
    );
    expect(rebuilt.index).not.toBeNull();
    const template = new PlaneGeometry(w, h, payload.segmentsW, payload.segmentsH);
    expect(rebuilt.index?.count).toBe(template.index?.count);
    template.dispose();
    rebuilt.dispose();
  });

  it('bakes Verlet binding from mesh-local centerline', () => {
    const entity: AssetEntity = {
      id: 'c1',
      type: 'asset',
      name: 'C',
      assetKind: 'fabric-cloth',
      screenImageId: null,
      sizeScale: 1,
      visible: true,
      physicsBodyMode: 'dynamic',
      physicsDensityKgPerM3: 1000,
      fabricClothParams: defaultFabricClothParams(),
      transform: { position: { x: 0, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0 } },
    };
    const root = new Group();
    const mesh = buildFabricClothMeshFromOptions({
      faceWidth: 0.4,
      faceHeight: 0.3,
      material: new MeshBasicMaterial(),
      segments: { segmentsW: 4, segmentsH: 4 },
    });
    root.add(mesh);
    const binding = createFabricClothVerletBinding(mesh, entity, root);
    const [wx, wy, wz] = vec3Get(binding.pos, 0);
    vec3Set(binding.pos, 0, wx, wy - 0.05, wz);
    flushBindingPlane(binding);
    const payload = bakeFabricClothMeshFromVerletBinding(binding);
    expect(payload.planeWidthM).toBeCloseTo(0.4);
    expect(payload.positions.length).toBe(13 * 13 * 3);
    mesh.geometry.dispose();
  });

  it('bakes deformed live cloth mesh', () => {
    const w = 0.45;
    const h = 0.3;
    const mesh = buildFabricClothMeshFromOptions({
      faceWidth: w,
      faceHeight: h,
      material: new MeshBasicMaterial(),
      segments: { segmentsW: 6, segmentsH: 4 },
    });
    const pos = mesh.geometry.getAttribute('position').array as Float32Array;
    const grid = mesh.userData.fabricClothGrid as { planeVertexCount: number };
    for (let i = 0; i < grid.planeVertexCount; i++) {
      pos[i * 3 + 2] += 0.002 * i;
    }
    const payload = bakeFabricClothMeshFromDeformed(mesh);
    expect(payload.planeWidthM).toBeCloseTo(w);
    expect(payload.planeHeightM).toBeCloseTo(h);
    expect(payload.positions.length).toBe(19 * 13 * 3);
    mesh.geometry.dispose();
  });

  it('production sim grid bakes to 3x denser topology', () => {
    const seg = fabricClothGridSegments(0.45, 0.45);
    const mesh = buildFabricClothMeshFromOptions({
      faceWidth: 0.45,
      faceHeight: 0.45,
      material: new MeshBasicMaterial(),
      segments: seg,
    });
    const coarse = readFabricClothPlaneSegments(mesh);
    const coarseTopology = fabricClothBakedMeshTopology({
      segmentsW: coarse.segmentsW,
      segmentsH: coarse.segmentsH,
    });

    const payload = bakeFabricClothMeshFromDeformed(mesh);
    const bakedTopology = fabricClothBakedMeshTopology(payload);
    expect(bakedTopology.triangleCount).toBe(coarseTopology.triangleCount * 9);

    const rebuilt = buildBufferGeometryFromBakedMeshPayload(payload);
    expect(rebuilt.index?.count).toBe(bakedTopology.triangleCount * 3);
    mesh.geometry.dispose();
    rebuilt.dispose();
  });

  it('validates restPlaneXY extents against plane footprint', () => {
    const mesh = buildFabricClothMeshFromOptions({
      faceWidth: 0.5,
      faceHeight: 0.4,
      material: new MeshBasicMaterial(),
      segments: { segmentsW: 3, segmentsH: 3 },
    });
    const payload = bakeFabricClothMeshFromDeformed(mesh);
    validateFabricClothBakedRestPlaneExtents(payload);
    mesh.geometry.dispose();
  });

  it('baked rest plane marks border strip on grid edges for shader mask', () => {
    const w = 0.45;
    const h = 0.45;
    const border = FABRIC_CLOTH_BORDER_WIDTH_M;
    const mesh = buildFabricClothMeshFromOptions({
      faceWidth: w,
      faceHeight: h,
      material: new MeshBasicMaterial(),
      segments: { segmentsW: 8, segmentsH: 8 },
    });
    const payload = bakeFabricClothMeshFromDeformed(mesh);
    const halfW = w * 0.5;
    let edgeMask = 0;
    let centerMask = 0;
    for (let i = 0; i < payload.restPlaneXY.length; i += 2) {
      const rx = payload.restPlaneXY[i];
      const ry = payload.restPlaneXY[i + 1];
      const mask = fabricClothBorderMaskFromRestPlane(rx, ry, w, h, border);
      if (Math.abs(rx - halfW) < 1e-6 || Math.abs(rx + halfW) < 1e-6) {
        edgeMask = mask;
      }
      if (Math.abs(rx) < 0.01 && Math.abs(ry) < 0.01) {
        centerMask = mask;
      }
    }
    expect(edgeMask).toBe(1);
    expect(centerMask).toBe(0);
    mesh.geometry.dispose();
  });

  it('keeps restPlaneXY centered after deformed positions drift', () => {
    const w = 0.45;
    const h = 0.3;
    const mesh = buildFabricClothMeshFromOptions({
      faceWidth: w,
      faceHeight: h,
      material: new MeshBasicMaterial(),
      segments: { segmentsW: 6, segmentsH: 4 },
    });
    const pos = mesh.geometry.getAttribute('position').array as Float32Array;
    const grid = mesh.userData.fabricClothGrid as { planeVertexCount: number };
    for (let i = 0; i < grid.planeVertexCount; i++) {
      pos[i * 3] += 0.05;
      pos[i * 3 + 1] -= 0.02;
    }
    const payload = bakeFabricClothMeshFromDeformed(mesh);
    validateFabricClothBakedRestPlaneExtents(payload);
    expect(payload.planeWidthM).toBeCloseTo(w);
    expect(payload.planeHeightM).toBeCloseTo(h);
    mesh.geometry.dispose();
  });

  it('normalizes legacy payloads when planeWidthM drifts from restPlaneXY', () => {
    const mesh = buildFabricClothMeshFromOptions({
      faceWidth: 0.45,
      faceHeight: 0.45,
      material: new MeshBasicMaterial(),
      segments: { segmentsW: 4, segmentsH: 4 },
    });
    const payload = bakeFabricClothMeshFromDeformed(mesh);
    const legacy = {
      ...payload,
      planeWidthM: 0.9,
      planeHeightM: 0.9,
    };
    const fixed = normalizeFabricClothBakedMeshPayload(legacy);
    expect(fixed.planeWidthM).toBeCloseTo(payload.planeWidthM);
    expect(fixed.planeHeightM).toBeCloseTo(payload.planeHeightM);
    const geometry = buildBufferGeometryFromBakedMeshPayload(legacy);
    geometry.dispose();
    mesh.geometry.dispose();
  });
});

describe('normalizeFabricClothBakedMeshPayload base pivot', () => {
  it('moves a legacy payload (pre-drop origin) onto the base pivot', () => {
    const mesh = buildFabricClothMeshFromOptions({
      faceWidth: 0.4,
      faceHeight: 0.3,
      material: new MeshBasicMaterial(),
      segments: { segmentsW: 4, segmentsH: 4 },
    });
    const payload = bakeFabricClothMeshFromDeformed(mesh);
    // Legacy: cloth fell 0.5 m below its origin (mesh-local z = entity Y) and drifted.
    const legacy = {
      ...payload,
      positions: payload.positions.map((v, i) => v + (i % 3 === 0 ? 0.1 : i % 3 === 2 ? -0.5 : 0)),
    };
    const fixed = normalizeFabricClothBakedMeshPayload(legacy);
    let minZ = Infinity;
    let minX = Infinity;
    let maxX = -Infinity;
    for (let i = 0; i < fixed.positions.length; i += 3) {
      minX = Math.min(minX, fixed.positions[i]);
      maxX = Math.max(maxX, fixed.positions[i]);
      minZ = Math.min(minZ, fixed.positions[i + 2]);
    }
    expect(minZ).toBeCloseTo(0, 6);
    expect(minX + maxX).toBeCloseTo(0, 6);
    expect(normalizeFabricClothBakedMeshPayload(fixed)).toBe(fixed);
    mesh.geometry.dispose();
  });
});

describe('baked triangle winding', () => {
  it('faces the same way as the vertex normals (no back-face shading)', () => {
    const mesh = buildFabricClothMeshFromOptions({
      faceWidth: 0.3,
      faceHeight: 0.2,
      material: new MeshBasicMaterial(),
      segments: { segmentsW: 4, segmentsH: 3 },
    });
    const geometry = buildBufferGeometryFromBakedMeshPayload(bakeFabricClothMeshFromDeformed(mesh));
    const p = geometry.getAttribute('position');
    const n = geometry.getAttribute('normal');
    const index = geometry.index?.array ?? [];
    for (let t = 0; t < index.length; t += 3) {
      const [a, b, c] = [index[t], index[t + 1], index[t + 2]];
      const e1x = p.getX(b) - p.getX(a);
      const e1y = p.getY(b) - p.getY(a);
      const e2x = p.getX(c) - p.getX(a);
      const e2y = p.getY(c) - p.getY(a);
      const faceZ = e1x * e2y - e1y * e2x;
      expect(Math.sign(faceZ)).toBe(Math.sign(n.getZ(a)));
    }
    geometry.dispose();
    mesh.geometry.dispose();
  });
});
