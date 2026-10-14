import {
  type Camera,
  type Mesh,
  type Object3D,
  Raycaster,
  type Scene,
  Vector2,
} from 'three/webgpu';

const _ndc = new Vector2();
const _raycaster = new Raycaster();

function isGroundHit(hitObject: Object3D, groundMesh: Mesh): boolean {
  let current: Object3D | null = hitObject;
  while (current) {
    if (current === groundMesh) {return true;}
    current = current.parent;
  }
  return false;
}

/** Per-pixel mask: 1 = closest surface is the ground plane mesh. */
export function buildGroundPixelMask(
  scene: Scene,
  groundMesh: Mesh,
  camera: Camera,
  width: number,
  height: number,
): Uint8Array {
  const mask = new Uint8Array(width * height);
  const roots = scene.children;

  for (let y = 0; y < height; y += 1) {
    const v = (y + 0.5) / height;
    for (let x = 0; x < width; x += 1) {
      const u = (x + 0.5) / width;
      _ndc.x = u * 2 - 1;
      _ndc.y = -v * 2 + 1;
      _raycaster.setFromCamera(_ndc, camera);
      const hits = _raycaster.intersectObjects(roots, true);
      if (hits.length === 0) {continue;}
      const first = hits[0];
      if (isGroundHit(first.object, groundMesh)) {
        mask[y * width + x] = 1;
      }
    }
  }

  return mask;
}
