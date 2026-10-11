import {
  FrontSide,
  Mesh,
  PlaneGeometry,
  type BufferGeometry,
  type MeshPhysicalNodeMaterial,
  type MeshStandardNodeMaterial,
  type Texture,
} from 'three/webgpu';
import type { Rgb } from '@/colors/rgb';
import {
  computePassepartoutInnerBounds,
  type ImageSurfaceSettings,
} from '@/scene/image-surface';
import { createRoundedScreenGeometry } from './handheld-geometry';
import {
  createImagePbrMaterial,
  createPassepartoutPbrMaterial,
  type MaterialResolver,
} from './material-resolver';

export type PassepartoutMeshOptions = {
  resolver: MaterialResolver;
  surface: ImageSurfaceSettings;
  outerW: number;
  outerH: number;
  outerRadiusM: number;
  imageTexture: Texture | null;
  imageW?: number;
  imageH?: number;
  zBase: number;
  sizeScale: number;
  tint?: Rgb;
  rounded: boolean;
  screenPick?: boolean;
  renderOrder?: { passepartout: number; image: number };
  applyHandheldScreenMaterialFlags?: boolean;
};

function createOpeningGeometry(
  width: number,
  height: number,
  cornerRadiusM: number,
  rounded: boolean,
): BufferGeometry {
  if (rounded) {
    return createRoundedScreenGeometry(width, height, cornerRadiusM);
  }
  return new PlaneGeometry(width, height);
}

function applyPassepartoutBackMaterialFlags(
  material: MeshStandardNodeMaterial | MeshPhysicalNodeMaterial,
): void {
  material.side = FrontSide;
  material.depthWrite = true;
  material.polygonOffset = true;
  material.polygonOffsetFactor = 2;
  material.polygonOffsetUnits = 2;
}

function applyImageMeshFlags(
  material: MeshStandardNodeMaterial | MeshPhysicalNodeMaterial,
  mesh: Mesh,
  options: PassepartoutMeshOptions,
  renderOrder: number,
): void {
  material.side = FrontSide;
  material.polygonOffset = true;
  material.polygonOffsetFactor = -2;
  material.polygonOffsetUnits = -2;
  if (options.applyHandheldScreenMaterialFlags) {
    material.polygonOffsetFactor = 1;
    material.polygonOffsetUnits = 1;
  }
  mesh.renderOrder = renderOrder;
  if (options.screenPick) {
    mesh.userData.isAssetScreen = true;
  }
  mesh.userData.assetMeshRole = 'screen';
}

export function createPassepartoutDisplayMeshes(
  options: PassepartoutMeshOptions,
): Mesh[] {
  const {
    resolver,
    surface,
    outerW,
    outerH,
    outerRadiusM,
    imageTexture,
    imageW,
    imageH,
    zBase,
    tint,
    rounded,
  } = options;

  const resolvePreset = resolver.resolvePreset.bind(resolver);
  const passepartoutOrder = options.renderOrder?.passepartout ?? 2;
  const imageOrder = options.renderOrder?.image ?? 3;

  const { effectiveOffsetM, innerW, innerH, innerRadiusM } =
    computePassepartoutInnerBounds(
      outerW,
      outerH,
      outerRadiusM,
      surface.passepartoutOffsetM,
    );

  const meshes: Mesh[] = [];

  if (effectiveOffsetM === 0) {
    const geometry = createOpeningGeometry(
      outerW,
      outerH,
      outerRadiusM,
      rounded,
    );
    const material = imageTexture
      ? createImagePbrMaterial(
          resolvePreset,
          surface,
          imageTexture,
          outerW,
          outerH,
          imageW,
          imageH,
          tint,
        )
      : createPassepartoutPbrMaterial(resolvePreset, surface);

    const mesh = new Mesh(geometry, material);
    mesh.position.z = zBase;
    if (imageTexture) {
      applyImageMeshFlags(material, mesh, options, imageOrder);
    } else {
      mesh.userData.assetMeshRole = 'passepartout';
      mesh.renderOrder = passepartoutOrder;
    }
    meshes.push(mesh);
    return meshes;
  }

  const outerGeometry = createOpeningGeometry(
    outerW,
    outerH,
    outerRadiusM,
    rounded,
  );
  const passepartoutMaterial = createPassepartoutPbrMaterial(
    resolvePreset,
    surface,
  );
  const hasInnerImage =
    Boolean(imageTexture) && innerW > 0 && innerH > 0;
  if (hasInnerImage) {
    applyPassepartoutBackMaterialFlags(passepartoutMaterial);
  } else {
    passepartoutMaterial.side = FrontSide;
  }
  const passepartoutMesh = new Mesh(outerGeometry, passepartoutMaterial);
  passepartoutMesh.position.z = zBase;
  passepartoutMesh.userData.assetMeshRole = 'passepartout';
  passepartoutMesh.renderOrder = passepartoutOrder;
  meshes.push(passepartoutMesh);

  if (!hasInnerImage) {
    return meshes;
  }

  const innerGeometry = createOpeningGeometry(
    innerW,
    innerH,
    innerRadiusM,
    rounded,
  );
  const imageMaterial = createImagePbrMaterial(
    resolvePreset,
    surface,
    imageTexture,
    innerW,
    innerH,
    imageW,
    imageH,
    tint,
  );
  const imageMesh = new Mesh(innerGeometry, imageMaterial);
  // Coplanar with passepartout — depth separation via polygonOffset, not world Z
  // (world Z epsilon would push the screen into handheld display glass).
  imageMesh.position.z = zBase;
  applyImageMeshFlags(imageMaterial, imageMesh, options, imageOrder);
  meshes.push(imageMesh);

  return meshes;
}
