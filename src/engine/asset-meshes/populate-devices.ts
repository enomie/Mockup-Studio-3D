import { Group, Mesh, type Material, type Texture } from 'three/webgpu';
import {
  bezelWidthM,
  outerEdgeRadiusM,
  resolveBodyDepthMm,
  screenCornerRadiusM,
  SIDE_BUTTON_GAP_MM,
  SIDE_BUTTON_INSET_MM,
  SIDE_BUTTON_LENGTH_MM,
  SIDE_BUTTON_PROUD_MM,
  SIDE_BUTTON_THICKNESS_MM,
  type HandheldDeviceParams,
} from '@/scene/asset-handheld';
import {
  clampDisplayTiltDeg,
  monitorMountHeightM,
  monitorStandHeightsM,
  type MonitorDeviceParams,
} from '@/scene/asset-monitor';
import type { AssetFaceId, AssetKind } from '@/scene/entity-types';
import { isGeometryVisible, type AssetGeometryVisibility } from '@/scene/geometry-visibility';
import {
  resolveImageSurfaceSettings,
  type ImageSurfaceSettings,
} from '@/scene/image-surface';
import type { AssetMaterialSlots } from '@/scene/material-types';
import {
  MATERIAL_ALUMINUM_BRUSHED_ID,
  MATERIAL_CHROME_ID,
  MATERIAL_GLASS_PANE_ID,
} from '@/scene/material-ids';
import type { MaterialResolver } from '@/engine/material-resolver';
import { buildHandheldFrameGeometryCsg } from '@/engine/handheld-frame-csg';
import {
  createHandheldBackPlateGeometry,
  createRoundedGlassGeometry,
  createSideButtonGeometry,
} from '@/engine/handheld-geometry';
import {
  computeHandheldLayerStack,
  MONITOR_SIDE_BUTTON_CENTER_Y_FACTOR,
  type HandheldLayerBounds,
  type HandheldLayerStack,
} from '@/engine/handheld-layer-stack';
import {
  createStandBaseGeometry,
  createStandFootGeometry,
} from '@/engine/monitor-stand';
import { createPassepartoutDisplayMeshes } from '@/engine/passepartout-meshes';
import { resolveMeshMaterial } from './shared';

function layerThickness(layer: HandheldLayerBounds): number {
  return layer.zFront - layer.zBack;
}

function addSideButtons(
  meshes: Mesh[],
  stack: HandheldLayerStack,
  sizeScale: number,
  sideButtonMaterial: Material,
): void {
  const mm = 0.001 * sizeScale;
  const lengthY = SIDE_BUTTON_LENGTH_MM * mm;
  const widthZ = SIDE_BUTTON_THICKNESS_MM * mm;
  const gap = SIDE_BUTTON_GAP_MM * mm;
  const proud = SIDE_BUTTON_PROUD_MM * mm;
  const inset = SIDE_BUTTON_INSET_MM * mm;
  const buttonDepth = inset + proud;
  const sideX = stack.outerWidth * 0.5;

  const buttonGeometry = createSideButtonGeometry(
    lengthY,
    widthZ,
    gap,
    buttonDepth,
  );

  for (const center of stack.sideButtonCenters) {
    const button = new Mesh(buttonGeometry, sideButtonMaterial);
    button.position.set(sideX + proud, center.y, center.z);
    button.userData.assetMeshRole = 'sideButton';
    button.renderOrder = 5;
    meshes.push(button);
  }
}

interface HandheldDisplayBuildOptions {
  sideButtonCenterYFactor?: number;
}

function buildHandheldDisplayMeshes(
  group: Group,
  assetKind: AssetKind,
  screenWidth: number,
  screenHeight: number,
  resolver: MaterialResolver,
  imageTexture: Texture | null,
  handheldParams: HandheldDeviceParams,
  materials: AssetMaterialSlots = {},
  sizeScale = 1,
  imageWidth?: number,
  imageHeight?: number,
  geometryVisibility?: AssetGeometryVisibility,
  imageSurfaces?: Partial<Record<AssetFaceId, ImageSurfaceSettings>>,
  buildOptions: HandheldDisplayBuildOptions = {},
): HandheldLayerStack {
  const isMonitor = assetKind === 'monitor';
  const frameMaterialId =
    materials.frameMaterialId ?? MATERIAL_ALUMINUM_BRUSHED_ID;
  const sideButtonMaterialId =
    materials.sideButtonMaterialId ?? frameMaterialId;
  const innerBackMaterialId =
    materials.backWallMaterialId ??
    (isMonitor ? MATERIAL_ALUMINUM_BRUSHED_ID : MATERIAL_CHROME_ID);
  const backGlassMaterialId =
    materials.backGlassMaterialId ??
    (isMonitor ? MATERIAL_ALUMINUM_BRUSHED_ID : MATERIAL_CHROME_ID);
  const glazingMaterialId =
    materials.glazingMaterialId ?? MATERIAL_GLASS_PANE_ID;

  const bezel = bezelWidthM(handheldParams, sizeScale);
  const innerRadius = screenCornerRadiusM(
    handheldParams,
    screenWidth,
    screenHeight,
    sizeScale,
  );
  const outerRadius = innerRadius + bezel;
  const outerWidth = screenWidth + bezel * 2;
  const outerHeight = screenHeight + bezel * 2;
  const bodyDepthMm = resolveBodyDepthMm(assetKind, handheldParams);
  const bodyDepth = bodyDepthMm * 0.001 * sizeScale;
  const outerEdgeRadius = outerEdgeRadiusM(
    handheldParams,
    bodyDepthMm,
    sizeScale,
  );
  const mm = 0.001 * sizeScale;

  const glazingVisible = isGeometryVisible(geometryVisibility, 'glazing');
  const stack = computeHandheldLayerStack({
    screenWidth,
    screenHeight,
    innerRadius,
    outerWidth,
    outerHeight,
    outerRadius,
    bodyDepth,
    sizeScale,
    glazingVisible,
    sideButtonCenterYFactor:
      buildOptions.sideButtonCenterYFactor ??
      (isMonitor ? MONITOR_SIDE_BUTTON_CENTER_Y_FACTOR : undefined),
  });

  const frameGeometry = buildHandheldFrameGeometryCsg(
    stack,
    sizeScale,
    outerEdgeRadius,
  );

  const frameMaterial = resolveMeshMaterial(resolver, frameMaterialId, {
    meshDepthM: bodyDepth,
    surfaceRole: 'frame',
    grainAlongU: true,
  });
  const frame = new Mesh(frameGeometry, frameMaterial);
  frame.userData.assetMeshRole = 'frame';

  const frontSurface = resolveImageSurfaceSettings(imageSurfaces, 'front', {
    assetKind,
  });
  const screenMeshes = createPassepartoutDisplayMeshes({
    resolver,
    surface: frontSurface,
    outerW: stack.screen.width,
    outerH: stack.screen.height,
    outerRadiusM: stack.screen.cornerRadius,
    imageTexture,
    imageW: imageWidth,
    imageH: imageHeight,
    zBase: stack.screen.zFront,
    sizeScale,
    rounded: true,
    screenPick: true,
    applyHandheldScreenMaterialFlags: true,
    renderOrder: { passepartout: 2, image: 3 },
  });

  const outerBackThickness = layerThickness(stack.outerBackGlass);
  const outerBackGlassMaterial = resolveMeshMaterial(
    resolver,
    backGlassMaterialId,
    { meshDepthM: outerBackThickness },
  );
  const outerBackGlassGeometry = createHandheldBackPlateGeometry(
    stack.outerBackGlass.width,
    stack.outerBackGlass.height,
    stack.outerBackGlass.cornerRadius,
    outerBackThickness,
  );
  const outerBackGlass = new Mesh(outerBackGlassGeometry, outerBackGlassMaterial);
  outerBackGlass.position.z = stack.outerBackGlass.zFront;
  outerBackGlass.userData.assetMeshRole = 'outerBackPlate';
  outerBackGlass.renderOrder = 0;

  const innerBackMaterial = resolveMeshMaterial(resolver, innerBackMaterialId);
  const innerBackThickness = layerThickness(stack.innerBack);
  const innerBackGeometry = createHandheldBackPlateGeometry(
    stack.innerBack.width,
    stack.innerBack.height,
    stack.innerBack.cornerRadius,
    innerBackThickness,
  );
  const innerBackPlate = new Mesh(innerBackGeometry, innerBackMaterial);
  innerBackPlate.position.z = stack.innerBack.zFront;
  innerBackPlate.userData.assetMeshRole = 'backWall';
  innerBackPlate.renderOrder = 0;
  innerBackMaterial.polygonOffset = true;
  innerBackMaterial.polygonOffsetFactor = -1;
  innerBackMaterial.polygonOffsetUnits = -1;

  frame.renderOrder = 5;
  frameMaterial.polygonOffset = true;
  frameMaterial.polygonOffsetFactor = -2;
  frameMaterial.polygonOffsetUnits = -2;

  const glassThickness = layerThickness(stack.frontGlass);
  const glazingCapMaterial = resolveMeshMaterial(resolver, glazingMaterialId, {
    meshDepthM: glassThickness,
    surfaceRole: 'displayGlass',
  });
  glazingCapMaterial.polygonOffset = true;
  glazingCapMaterial.polygonOffsetFactor = 1;
  glazingCapMaterial.polygonOffsetUnits = 1;
  const glazingGeometry = createRoundedGlassGeometry(
    stack.frontGlass.width,
    stack.frontGlass.height,
    stack.frontGlass.cornerRadius,
    glassThickness,
  );
  const glazing = new Mesh(glazingGeometry, [glazingCapMaterial, frameMaterial]);
  glazing.position.z = stack.frontGlass.zFront;
  glazing.userData.assetMeshRole = 'glazing';
  glazing.renderOrder = 3;

  const meshes: Mesh[] = [...screenMeshes];
  if (isGeometryVisible(geometryVisibility, 'outerBackPlate')) {
    meshes.push(outerBackGlass);
  }
  if (isGeometryVisible(geometryVisibility, 'backWall')) {
    meshes.push(innerBackPlate);
  }
  if (glazingVisible) {
    meshes.push(glazing);
  }
  if (isGeometryVisible(geometryVisibility, 'frame')) {
    meshes.push(frame);
  }

  if (isGeometryVisible(geometryVisibility, 'sideButton')) {
    const sideButtonMaterial = resolveMeshMaterial(
      resolver,
      sideButtonMaterialId,
      {
        meshDepthM: (SIDE_BUTTON_INSET_MM + SIDE_BUTTON_PROUD_MM) * mm,
        surfaceRole: 'frame',
        grainAlongU: true,
      },
    );
    addSideButtons(meshes, stack, sizeScale, sideButtonMaterial);
  }

  for (const mesh of meshes) {
    group.add(mesh);
  }

  return stack;
}

export function addHandheld(
  group: Group,
  assetKind: AssetKind,
  screenWidth: number,
  screenHeight: number,
  resolver: MaterialResolver,
  imageTexture: Texture | null,
  materials: AssetMaterialSlots = {},
  imageWidth?: number,
  imageHeight?: number,
  sizeScale = 1,
  handheldParams?: HandheldDeviceParams,
  geometryVisibility?: AssetGeometryVisibility,
  imageSurfaces?: Partial<Record<AssetFaceId, ImageSurfaceSettings>>,
): void {
  if (!handheldParams) {return;}
  buildHandheldDisplayMeshes(
    group,
    assetKind,
    screenWidth,
    screenHeight,
    resolver,
    imageTexture,
    handheldParams,
    materials,
    sizeScale,
    imageWidth,
    imageHeight,
    geometryVisibility,
    imageSurfaces,
  );
}

export function addMonitor(
  group: Group,
  screenWidth: number,
  screenHeight: number,
  resolver: MaterialResolver,
  imageTexture: Texture | null,
  materials: AssetMaterialSlots = {},
  imageWidth?: number,
  imageHeight?: number,
  sizeScale = 1,
  monitorParams?: MonitorDeviceParams,
  geometryVisibility?: AssetGeometryVisibility,
  imageSurfaces?: Partial<Record<AssetFaceId, ImageSurfaceSettings>>,
): void {
  if (!monitorParams) {return;}

  const mm = 0.001 * sizeScale;
  const standBaseMaterialId =
    materials.standBaseMaterialId ?? MATERIAL_ALUMINUM_BRUSHED_ID;
  const standFootMaterialId =
    materials.standFootMaterialId ?? MATERIAL_ALUMINUM_BRUSHED_ID;

  const { baseHeightM, footHeightM } = monitorStandHeightsM(
    monitorParams,
    sizeScale,
  );
  const mountY = baseHeightM + monitorMountHeightM(monitorParams, sizeScale);
  const bezel = bezelWidthM(monitorParams, sizeScale);
  const outerHeight = screenHeight + bezel * 2;

  const baseWidthM = monitorParams.standBaseWidthMm * mm;
  const baseDepthM = monitorParams.standBaseDepthMm * mm;
  const baseCornerM = monitorParams.standBaseCornerRadiusMm * mm;
  const footWidthM = monitorParams.standFootWidthMm * mm;
  const footDepthM = monitorParams.standFootDepthMm * mm;
  const footOffsetZMm = monitorParams.standFootOffsetZMm;
  const footOffsetZ = -footOffsetZMm * mm;

  if (isGeometryVisible(geometryVisibility, 'standBase')) {
    const baseGeometry = createStandBaseGeometry(
      baseWidthM,
      baseDepthM,
      baseHeightM,
      baseCornerM,
    );
    const baseMaterial = resolveMeshMaterial(resolver, standBaseMaterialId, {
      meshDepthM: baseHeightM,
      surfaceRole: 'frame',
      grainAlongU: true,
    });
    const standBase = new Mesh(baseGeometry, baseMaterial);
    standBase.position.y = baseHeightM * 0.5;
    standBase.userData.assetMeshRole = 'standBase';
    group.add(standBase);
  }

  if (isGeometryVisible(geometryVisibility, 'standFoot')) {
    const footGeometry = createStandFootGeometry(
      footWidthM,
      footDepthM,
      footHeightM,
    );
    const footMaterial = resolveMeshMaterial(resolver, standFootMaterialId, {
      meshDepthM: footDepthM,
      surfaceRole: 'frame',
      grainAlongU: true,
    });
    const standFoot = new Mesh(footGeometry, footMaterial);
    standFoot.position.set(0, baseHeightM + footHeightM * 0.5, footOffsetZ);
    standFoot.userData.assetMeshRole = 'standFoot';
    group.add(standFoot);
  }

  const pivotGroup = new Group();
  pivotGroup.position.set(0, mountY, 0);
  pivotGroup.rotation.x =
    (clampDisplayTiltDeg(monitorParams.displayTiltDeg) * Math.PI) / 180;
  group.add(pivotGroup);

  const displayGroup = new Group();
  displayGroup.position.y = outerHeight * 0.5;
  pivotGroup.add(displayGroup);

  buildHandheldDisplayMeshes(
    displayGroup,
    'monitor',
    screenWidth,
    screenHeight,
    resolver,
    imageTexture,
    monitorParams,
    materials,
    sizeScale,
    imageWidth,
    imageHeight,
    geometryVisibility,
    imageSurfaces,
    { sideButtonCenterYFactor: MONITOR_SIDE_BUTTON_CENTER_Y_FACTOR },
  );
}
