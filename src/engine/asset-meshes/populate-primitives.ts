import { BoxGeometry, Mesh, type Group, type Texture } from 'three/webgpu';
import type { AssetFaceId, AssetFaces } from '@/scene/asset-faces';
import { defaultBlockParams, type BlockParams } from '@/scene/asset-block';
import {
  defaultFabricClothParams,
  type FabricClothParams,
} from '@/scene/asset-fabric-cloth';
import { buildFabricClothMesh } from '@/engine/fabric-cloth-geometry';
import { createFabricClothMaterial } from '@/engine/fabric-cloth-material';
import { defaultPrintParams, printCornerRadiusM, type PrintDeviceParams } from '@/scene/asset-print';
import {
  defaultWallParams,
  defaultWallpaperPattern,
  type WallParams,
  type WallpaperPattern,
} from '@/scene/asset-wall';
import type { AssetKind } from '@/scene/entity-types';
import { isGeometryVisible, type AssetGeometryVisibility } from '@/scene/geometry-visibility';
import {
  finishToMaterialId,
  resolveImageSurfaceSettings,
  type ImageSurfaceSettings,
} from '@/scene/image-surface';
import type { AssetMaterialSlots } from '@/scene/material-types';
import {
  MATERIAL_GLASS_PANE_ID,
  MATERIAL_GOLD_ID,
  MATERIAL_FABRIC_ID,
  MATERIAL_GLOSSY_PRINT_ID,
  MATERIAL_PAPER_ID,
} from '@/scene/material-ids';
import { buildBlockGeometry } from '@/engine/block-geometry';
import { buildCylinderGeometry } from '@/engine/cylinder-geometry';
import { buildSphereGeometry } from '@/engine/sphere-geometry';
import { defaultCylinderParams, type CylinderParams } from '@/scene/asset-cylinder';
import { defaultSphereParams, type SphereParams } from '@/scene/asset-sphere';
import {
  createWallpaperImageMaterial,
  type MaterialResolver,
} from '@/engine/material-resolver';
import { buildWallBodyGeometry, createWallFrontGeometry } from '@/engine/wall-geometry';
import {
  createExtrudedFrameGeometry,
  createRectangularGlassSlabGeometry,
} from '@/engine/frame-geometry';
import { createPassepartoutDisplayMeshes } from '@/engine/passepartout-meshes';
import { buildPrintFacePlacements } from '@/engine/print-geometry';
import type { ImageSize } from './asset-build-context';
import {
  BACK_WALL_THICKNESS,
  facePlaneSize,
  FRAME_DEPTH,
  FRAME_THICKNESS,
  GLAZING_IMAGE_GAP,
  GLAZING_THICKNESS,
  IMAGE_RECESS,
  resolveFaceTint,
  resolveMaterialId,
  resolveMeshMaterial,
  WALLPAPER_FRONT_Z_EPSILON_M,
} from './shared';

export function addFacetedPrism(
  group: Group,
  faces: AssetFaces,
  faceWidth: number,
  faceHeight: number,
  depth: number,
  faceTextures: Partial<Record<AssetFaceId, Texture | null>>,
  faceImageSizes: Partial<Record<AssetFaceId, ImageSize | null>>,
  materials: AssetMaterialSlots,
  resolver: MaterialResolver,
  printParams: PrintDeviceParams = defaultPrintParams(),
  sizeScale = 1,
  imageSurfaces?: Partial<Record<AssetFaceId, ImageSurfaceSettings>>,
): void {
  const cornerRadius = printCornerRadiusM(
    printParams,
    faceWidth,
    faceHeight,
    sizeScale,
  );
  const placements = buildPrintFacePlacements(
    faceWidth,
    faceHeight,
    depth,
    cornerRadius,
  );

  for (const placement of placements) {
    const content = faces[placement.faceId];
    const plane = facePlaneSize(placement.faceId, faceWidth, faceHeight, depth);

    if (content.mode === 'image') {
      const imageSize = faceImageSizes[placement.faceId] ?? null;
      const surface = resolveImageSurfaceSettings(
        imageSurfaces,
        placement.faceId,
        { assetKind: 'print' },
      );
      const displayMeshes = createPassepartoutDisplayMeshes({
        resolver,
        surface,
        outerW: plane.width,
        outerH: plane.height,
        outerRadiusM: cornerRadius,
        imageTexture: faceTextures[placement.faceId] ?? null,
        imageW: imageSize?.width,
        imageH: imageSize?.height,
        zBase: 0,
        sizeScale,
        tint: resolveFaceTint(placement.faceId, materials, faces),
        rounded: cornerRadius > 0,
        screenPick: placement.faceId === 'front',
      });

      for (const mesh of displayMeshes) {
        mesh.position.set(
          placement.position[0],
          placement.position[1],
          placement.position[2],
        );
        mesh.rotation.set(
          placement.rotation[0],
          placement.rotation[1],
          placement.rotation[2],
        );
        mesh.userData.assetFaceId = placement.faceId;
        group.add(mesh);
      }
      continue;
    }

    const materialId = resolveMaterialId(placement.faceId, materials);
    const tint = resolveFaceTint(placement.faceId, materials, faces);
    const material =
      resolver.create(materialId, { tint }) ?? resolver.create(MATERIAL_PAPER_ID);
    if (!material) {continue;}

    const mesh = new Mesh(placement.geometry, material);
    mesh.position.set(
      placement.position[0],
      placement.position[1],
      placement.position[2],
    );
    mesh.rotation.set(
      placement.rotation[0],
      placement.rotation[1],
      placement.rotation[2],
    );
    mesh.userData.assetFaceId = placement.faceId;
    group.add(mesh);
  }
}

export function addPicture(
  group: Group,
  faceWidth: number,
  faceHeight: number,
  resolver: MaterialResolver,
  imageTexture: Texture | null,
  materials: AssetMaterialSlots = {},
  imageWidth?: number,
  imageHeight?: number,
  sizeScale = 1,
  geometryVisibility?: AssetGeometryVisibility,
  imageSurfaces?: Partial<Record<AssetFaceId, ImageSurfaceSettings>>,
): void {
  const frameMaterialId = materials.frameMaterialId ?? MATERIAL_GOLD_ID;
  const backWallMaterialId = materials.backWallMaterialId ?? MATERIAL_PAPER_ID;
  const glazingMaterialId = materials.glazingMaterialId ?? MATERIAL_GLASS_PANE_ID;

  const frameThickness = FRAME_THICKNESS * sizeScale;
  const frameDepth = FRAME_DEPTH * sizeScale;
  const backWallThickness = BACK_WALL_THICKNESS * sizeScale;
  const glazingThickness = GLAZING_THICKNESS * sizeScale;
  const glazingImageGap = GLAZING_IMAGE_GAP * sizeScale;
  const imageRecess = IMAGE_RECESS * sizeScale;

  const frameFrontZ = 0;
  const frameBackZ = frameFrontZ - frameDepth;
  const backWallCenterZ = frameBackZ + backWallThickness * 0.5;
  const imagePlaneZ = frameFrontZ - imageRecess;

  const frameGeometry = createExtrudedFrameGeometry(
    faceWidth,
    faceHeight,
    frameThickness,
    frameDepth,
  );
  const frameMaterial = resolveMeshMaterial(resolver, frameMaterialId, {
    meshDepthM: frameDepth,
    surfaceRole: 'frame',
    grainAlongU: true,
  });
  const frame = new Mesh(frameGeometry, frameMaterial);
  frame.userData.assetMeshRole = 'frame';

  const backWallMaterial = resolveMeshMaterial(resolver, backWallMaterialId);

  const backWall = new Mesh(
    new BoxGeometry(faceWidth, faceHeight, backWallThickness),
    backWallMaterial,
  );
  backWall.position.set(0, 0, backWallCenterZ);
  backWall.userData.assetMeshRole = 'backWall';

  const frontSurface = resolveImageSurfaceSettings(imageSurfaces, 'front', {
    assetKind: 'picture',
  });
  const screenMeshes = createPassepartoutDisplayMeshes({
    resolver,
    surface: frontSurface,
    outerW: faceWidth,
    outerH: faceHeight,
    outerRadiusM: 0,
    imageTexture,
    imageW: imageWidth,
    imageH: imageHeight,
    zBase: imagePlaneZ,
    sizeScale,
    rounded: false,
    screenPick: true,
  });

  const glazingBackZ = imagePlaneZ + glazingImageGap;
  const glazingZ = glazingBackZ + glazingThickness;
  const glazingCapMaterial = resolveMeshMaterial(resolver, glazingMaterialId, {
    meshDepthM: glazingThickness,
    surfaceRole: 'displayGlass',
  });
  glazingCapMaterial.polygonOffset = true;
  glazingCapMaterial.polygonOffsetFactor = 1;
  glazingCapMaterial.polygonOffsetUnits = 1;
  const glazingGeometry = createRectangularGlassSlabGeometry(
    faceWidth,
    faceHeight,
    glazingThickness,
  );
  const glazing = new Mesh(glazingGeometry, [glazingCapMaterial, frameMaterial]);
  glazing.position.z = glazingZ;
  glazing.userData.assetMeshRole = 'glazing';
  glazing.renderOrder = 3;

  const meshes: Mesh[] = [...screenMeshes];
  if (isGeometryVisible(geometryVisibility, 'frame')) {meshes.push(frame);}
  if (isGeometryVisible(geometryVisibility, 'backWall')) {meshes.push(backWall);}
  if (isGeometryVisible(geometryVisibility, 'glazing')) {meshes.push(glazing);}

  for (const mesh of meshes) {
    group.add(mesh);
  }
}

export function addWall(
  group: Group,
  assetKind: AssetKind,
  resolver: MaterialResolver,
  imageTexture: Texture | null,
  materials: AssetMaterialSlots = {},
  imageSurfaces?: Partial<Record<AssetFaceId, ImageSurfaceSettings>>,
  wallParams: WallParams = defaultWallParams(),
  wallpaperPattern: WallpaperPattern = defaultWallpaperPattern(),
): void {
  const wallMaterialId = materials.wallMaterialId ?? MATERIAL_PAPER_ID;
  const bodyMaterial = resolveMeshMaterial(resolver, wallMaterialId);

  const bodyGeometry = buildWallBodyGeometry(assetKind, wallParams);
  const body = new Mesh(bodyGeometry, bodyMaterial);
  body.userData.assetMeshRole = 'wallBody';
  group.add(body);

  if (!imageTexture) {return;}

  const frontSurface = resolveImageSurfaceSettings(imageSurfaces, 'front');
  const screenMaterialId = finishToMaterialId(frontSurface.finish);
  const screenPreset = resolver.resolvePreset(screenMaterialId);
  const frontMaterial = screenPreset
    ? createWallpaperImageMaterial(
        screenPreset,
        imageTexture,
        wallParams.widthM,
        wallpaperPattern.stripWidthM,
        wallpaperPattern.stripHeightM,
        wallpaperPattern.columnOffsetM,
        undefined,
        frontSurface,
      )
    : resolveMeshMaterial(resolver, MATERIAL_GLOSSY_PRINT_ID);

  const withDoor = assetKind === 'wall-door';
  const frontGeometry = createWallFrontGeometry(
    wallParams.widthM,
    wallParams.heightM,
    withDoor,
  );
  const front = new Mesh(frontGeometry, frontMaterial);
  front.position.z =
    wallParams.thicknessM / 2 + WALLPAPER_FRONT_Z_EPSILON_M;
  front.userData.isAssetScreen = true;
  front.userData.assetMeshRole = 'wallFront';
  front.renderOrder = 1;
  group.add(front);
}

export function addBlock(
  group: Group,
  resolver: MaterialResolver,
  materials: AssetMaterialSlots = {},
  blockParams: BlockParams = defaultBlockParams(),
): void {
  const blockMaterialId = materials.blockMaterialId ?? MATERIAL_PAPER_ID;
  const material = resolveMeshMaterial(resolver, blockMaterialId);
  const geometry = buildBlockGeometry(blockParams);
  const mesh = new Mesh(geometry, material);
  mesh.userData.assetMeshRole = 'blockBody';
  group.add(mesh);
}

export function addCylinder(
  group: Group,
  resolver: MaterialResolver,
  materials: AssetMaterialSlots = {},
  cylinderParams: CylinderParams = defaultCylinderParams(),
): void {
  const cylinderMaterialId = materials.cylinderMaterialId ?? MATERIAL_PAPER_ID;
  const material = resolveMeshMaterial(resolver, cylinderMaterialId);
  const geometry = buildCylinderGeometry(cylinderParams);
  const mesh = new Mesh(geometry, material);
  mesh.userData.assetMeshRole = 'cylinderBody';
  group.add(mesh);
}

export function addSphere(
  group: Group,
  resolver: MaterialResolver,
  materials: AssetMaterialSlots = {},
  sphereParams: SphereParams = defaultSphereParams(),
): void {
  const sphereMaterialId = materials.sphereMaterialId ?? MATERIAL_PAPER_ID;
  const material = resolveMeshMaterial(resolver, sphereMaterialId);
  const geometry = buildSphereGeometry(sphereParams);
  const mesh = new Mesh(geometry, material);
  mesh.userData.assetMeshRole = 'sphereBody';
  group.add(mesh);
}

export function addFabricCloth(
  group: Group,
  faceWidth: number,
  faceHeight: number,
  resolver: MaterialResolver,
  imageTexture: Texture | null,
  materials: AssetMaterialSlots = {},
  imageWidth?: number,
  imageHeight?: number,
  imageName?: string,
  fabricClothParams: FabricClothParams = defaultFabricClothParams(),
): void {
  const clothMaterialId = materials.fabricClothMaterialId ?? MATERIAL_FABRIC_ID;
  const clothMaterial = createFabricClothMaterial(
    (id: string) => resolver.resolvePreset(id),
    clothMaterialId,
    imageTexture,
    faceWidth,
    faceHeight,
    fabricClothParams,
    imageWidth,
    imageHeight,
    imageName,
  );

  group.add(buildFabricClothMesh(faceWidth, faceHeight, clothMaterial));
}
