import type { BookParams } from '@/scene/asset-book';
import { MM_TO_M } from '@/units/length';
import type {
  MeshPhysicalNodeMaterial,
  MeshStandardNodeMaterial,
  Node,
} from 'three/webgpu';
import { abs, float, positionLocal, smoothstep } from 'three/tsl';

export type BookHingeSide = 'front' | 'back';

function hingeGrooveMaskNode(
  coverWidthM: number,
  offsetM: number,
  widthM: number,
  side: BookHingeSide,
): Node<'float'> {
  const halfW = float(coverWidthM * 0.5);
  const spineEdgeX = side === 'front' ? halfW.negate() : halfW;
  const grooveCenterX = side === 'front' ? spineEdgeX.add(float(offsetM)) : spineEdgeX.sub(float(offsetM));
  const dist = abs(positionLocal.x.sub(grooveCenterX));
  const halfGroove = float(widthM * 0.5);
  const inner = smoothstep(halfGroove, float(0), dist);
  const outer = smoothstep(halfGroove.add(float(widthM * 0.35)), halfGroove, dist);
  return inner.mul(outer);
}

export function applyBookHingeGrooveToMaterial(
  material: MeshStandardNodeMaterial | MeshPhysicalNodeMaterial,
  coverWidthM: number,
  bookParams: BookParams,
  side: BookHingeSide,
): void {
  if (!bookParams.hingeGrooveEnabled || bookParams.hingeGrooveIntensity <= 0) {
    return;
  }

  const offsetM = bookParams.hingeGrooveOffsetMm * MM_TO_M;
  const widthM = bookParams.hingeGrooveWidthMm * MM_TO_M;
  const intensity = bookParams.hingeGrooveIntensity;

  const mask = hingeGrooveMaskNode(coverWidthM, offsetM, widthM, side);
  const strength = mask.mul(float(intensity));

  const baseColor = material.colorNode;
  if (baseColor) {
    const darken = float(1).sub(strength.mul(float(0.45)));
    material.colorNode = (baseColor).mul(darken);
  }

  const baseRough = (material.roughnessNode ?? float(0.5)) as ReturnType<typeof float>;
  material.roughnessNode = baseRough.add(strength.mul(float(0.25)));
}
