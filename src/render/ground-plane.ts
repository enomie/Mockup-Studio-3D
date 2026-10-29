import { Mesh, PlaneGeometry } from 'three/webgpu';
import { GROUND_PLANE_SIZE } from '@/constants';
import { createGroundMaterial, type GroundMaterial } from '@/materials/groundMaterial';
import { PlanarReflectionPass } from './planar-reflection';
import { applyReceiveShadowFlags } from './shadow-setup';
import { ensureGeometryTangents } from '@/engine/geometry-tangents';

export interface GroundPlane {
  mesh: Mesh;
  material: GroundMaterial;
}

export function createGroundPlane(): GroundPlane {
  const planarReflection = new PlanarReflectionPass();
  const material = createGroundMaterial(planarReflection);
  const groundGeometry = new PlaneGeometry(GROUND_PLANE_SIZE, GROUND_PLANE_SIZE);
  ensureGeometryTangents(groundGeometry);
  const mesh = new Mesh(
    groundGeometry,
    material,
  );
  mesh.rotation.x = -Math.PI / 2;
  mesh.frustumCulled = false;
  // Floor receives only — castShadow on a 5 km plane causes VSM/self-shadow banding.
  applyReceiveShadowFlags(mesh);
  material.bindGroundMesh(mesh);
  return { mesh, material };
}
