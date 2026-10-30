import {
  Color,
  DoubleSide,
  MeshPhysicalNodeMaterial,
  MeshStandardNodeMaterial,
  RepeatWrapping,
  type Material,
  type Node,
  type Texture,
} from 'three/webgpu';
import {
  float,
  floor,
  mix,
  mod,
  positionLocal,
  texture,
  uv,
  vec2,
  vec3,
} from 'three/tsl';
import {
  applyImagePlaneAlpha,
  applyImagePlaneAlphaCutout,
  imageFormatMayHaveAlpha,
  resolveImageFileName,
} from './image-surface-alpha';
import { rotationalPrintFit, type RotationalPrintFit } from './rotational-print-mapping';
import { rotationalPrintNodes } from './rotational-print-nodes';
import { finishToMaterialId, type ImageSurfaceSettings } from '@/scene/image-surface';
import { multiplyRgb, type Rgb } from '@/colors/rgb';
import { createTexturedMaterial } from '@/materials/procedural';
import type { ProceduralSurfaceRole } from '@/materials/procedural/procedural-params';
import { applyGlassSurfaceToPhysicalMaterial } from '@/materials/procedural/glass-surface';
import {
  MATERIAL_ALUMINUM_BRUSHED_ID,
  MATERIAL_GLASS_WINE_BOTTLE_ID,
  MATERIAL_PLASTIC_MATTE_ID,
  migrateMaterialId,
} from '@/scene/material-ids';
import {
  TINT_NEUTRAL,
  type MaterialPreset,
  type MaterialPresetResolver,
} from '@/scene/material-types';

const GLAZING_THICKNESS_M = 0.002;
const CLEAR_GLASS_ROUGHNESS_THRESHOLD = 0.1;
/** Beer–Lambert path for wine-bottle green (matches preset tint #176132). */
const WINE_BOTTLE_ATTENUATION_DISTANCE_M = 0.015;
const WINE_BOTTLE_ATTENUATION_COLOR = new Color(23 / 255, 97 / 255, 50 / 255);
/** Brighter same-hue green for env/IBL specular (F0 tint on surface highlights). */
const WINE_BOTTLE_SPECULAR_COLOR = (() => {
  const c = WINE_BOTTLE_ATTENUATION_COLOR.clone().multiplyScalar(2.25);
  c.r = Math.min(1, c.r);
  c.g = Math.min(1, c.g);
  c.b = Math.min(1, c.b);
  return c;
})();

export interface MaterialResolveOptions {
  tint?: Rgb;
  meshDepthM?: number;
  /** Procedural grain along UV.u (horizontal frame bars) vs UV.v (vertical bars). */
  grainAlongU?: boolean;
  /** Frame extrusion uses perimeter UVs; procedural profiles sample via mesh UVs. */
  surfaceRole?:
    | 'frame'
    | 'default'
    | 'ground'
    | 'displayGlass'
    | 'handheldGlazing'
    | 'wallpaper';
}

function rgbToColor(rgb: Rgb): Color {
  return new Color(rgb.r, rgb.g, rgb.b);
}

export function createSolidPbrMaterial(
  preset: MaterialPreset,
  tint?: Rgb,
): MeshStandardNodeMaterial | MeshPhysicalNodeMaterial {
  const baseColor = preset.color ?? { r: 0.8, g: 0.8, b: 0.8 };
  const color = tint ? multiplyRgb(baseColor, tint) : baseColor;
  const roughness = preset.roughness ?? 0.5;
  const metalness = preset.metalness ?? 0;

  if ((preset.clearcoat ?? 0) > 0) {
    const material = new MeshPhysicalNodeMaterial({
      color: rgbToColor(color),
      roughness,
      metalness,
      clearcoat: preset.clearcoat,
      clearcoatRoughness: preset.clearcoatRoughness ?? 0.1,
    });
    return material;
  }

  return new MeshStandardNodeMaterial({
    color: rgbToColor(color),
    roughness,
    metalness,
  });
}

export function isClearTransmissionPreset(preset: MaterialPreset): boolean {
  return (preset.roughness ?? 0.02) < CLEAR_GLASS_ROUGHNESS_THRESHOLD;
}

function isGlazingCapRole(surfaceRole?: MaterialResolveOptions['surfaceRole']): boolean {
  return surfaceRole === 'displayGlass' || surfaceRole === 'handheldGlazing';
}

/**
 * Clear display glazing — surface gloss/reflection only, no transmission sampling.
 * Keeps the screen image behind pixel-sharp (no viewport mip blur).
 */
function createDisplayGlazingMaterial(
  preset: MaterialPreset,
  options: MaterialResolveOptions = {},
): MeshPhysicalNodeMaterial {
  const glassTint = options.tint ?? preset.tint ?? { r: 1, g: 1, b: 1 };

  const material = new MeshPhysicalNodeMaterial({
    color: rgbToColor(glassTint),
    roughness: 0.02,
    metalness: 0,
    transparent: true,
    opacity: 0.04,
    clearcoat: 1,
    clearcoatRoughness: 0.03,
    ior: preset.ior ?? 1.52,
    specularIntensity: 1,
    envMapIntensity: 0.55,
    side: DoubleSide,
    depthWrite: true,
  });
  applyGlassSurfaceToPhysicalMaterial(material, preset);
  return material;
}

export function createTransmissionMaterial(
  preset: MaterialPreset,
  options: MaterialResolveOptions = {},
): MeshPhysicalNodeMaterial {
  const glassTint = options.tint ?? preset.tint ?? { r: 1, g: 1, b: 1 };
  const isGlazingCap = isGlazingCapRole(options.surfaceRole);
  const roughness = preset.roughness ?? 0.02;
  const thickness = options.meshDepthM ?? GLAZING_THICKNESS_M;
  const isClearGlass = roughness < CLEAR_GLASS_ROUGHNESS_THRESHOLD;
  const isWineBottleGlassPreset = preset.id === MATERIAL_GLASS_WINE_BOTTLE_ID;

  const material = new MeshPhysicalNodeMaterial({
    color: rgbToColor(glassTint),
    roughness,
    metalness: 0,
    transmission: 1,
    ior: preset.ior ?? 1.52,
    thickness,
    transparent: true,
  });

  if (isClearGlass) {
    material.specularIntensity = 1;
    material.envMapIntensity = 1;
    material.side = DoubleSide;
    material.depthWrite = isWineBottleGlassPreset ? false : isGlazingCap;
    if (isWineBottleGlassPreset) {
      material.shadowSide = DoubleSide;
      material.specularColor.copy(WINE_BOTTLE_SPECULAR_COLOR);
      material.attenuationColor = WINE_BOTTLE_ATTENUATION_COLOR;
      material.attenuationDistance = WINE_BOTTLE_ATTENUATION_DISTANCE_M;
    } else {
      material.attenuationColor = new Color(1, 1, 1);
      material.attenuationDistance = Infinity;
    }
  } else if (isGlazingCap) {
    material.side = DoubleSide;
    material.depthWrite = true;
  }

  applyGlassSurfaceToPhysicalMaterial(material, preset);
  return material;
}

/** Opaque ground surface — transmission presets become solid PBR (no glazing). */
export function createGroundSurfaceMaterial(
  preset: MaterialPreset,
): MeshStandardNodeMaterial | MeshPhysicalNodeMaterial {
  if (preset.kind === 'transmission') {
    return createSolidPbrMaterial(preset);
  }
  return createMaterialFromPreset(preset, { surfaceRole: 'ground' });
}

export function createMaterialFromPreset(
  preset: MaterialPreset,
  options: MaterialResolveOptions = {},
): MeshStandardNodeMaterial | MeshPhysicalNodeMaterial {
  if (preset.kind === 'transmission') {
    if (
      options.surfaceRole === 'displayGlass' &&
      preset.glassVariant === 'pane' &&
      isClearTransmissionPreset(preset)
    ) {
      return createDisplayGlazingMaterial(preset, options);
    }
    return createTransmissionMaterial(preset, options);
  }
  if (preset.kind === 'textured') {
    const texturedSurfaceRole =
      options.surfaceRole === 'frame'
        ? 'frame'
        : options.surfaceRole === 'ground'
          ? 'ground'
          : 'default';
    return createTexturedMaterial(preset, options.tint, {
      grainAlongU: options.grainAlongU,
      surfaceRole: texturedSurfaceRole,
    });
  }
  return createSolidPbrMaterial(preset, options.tint);
}

function coverUvNode(
  planeW: number,
  planeH: number,
  imageW: number,
  imageH: number,
) {
  const planeAspect = planeW / planeH;
  const imageAspect = imageW / imageH;

  if (imageAspect > planeAspect) {
    const repeatX = planeAspect / imageAspect;
    const offsetX = (1 - repeatX) / 2;
    return vec2(uv().x.mul(float(repeatX)).add(float(offsetX)), uv().y);
  }

  const repeatY = imageAspect / planeAspect;
  const offsetY = (1 - repeatY) / 2;
  return vec2(uv().x, uv().y.mul(float(repeatY)).add(float(offsetY)));
}

function rgbColorNode(color: Rgb) {
  return vec3(float(color.r), float(color.g), float(color.b));
}

function solidColorPbrMaterial(
  preset: MaterialPreset,
  color: Rgb,
): MeshStandardNodeMaterial {
  const material = new MeshStandardNodeMaterial({
    metalness: preset.metalness ?? 0,
  });
  material.colorNode = rgbColorNode(color);
  material.roughnessNode = float(preset.roughness ?? 0.5);
  return material;
}

type ShaderColorNode = NonNullable<MeshStandardNodeMaterial['colorNode']>;

interface ImagePlaneTextureNodes {
  sample: ReturnType<typeof texture>;
  useAlphaChannel: boolean;
}

function asTextureRgba(sample: ReturnType<typeof texture>): Node<'vec4'> {
  return sample as unknown as Node<'vec4'>;
}

function buildImagePlaneTextureNodes(
  tex: Texture,
  planeW: number,
  planeH: number,
  imageW: number,
  imageH: number,
  imageName?: string,
): ImagePlaneTextureNodes {
  const canCover =
    planeW > 0 && planeH > 0 && imageW > 0 && imageH > 0;
  const sample = canCover
    ? texture(tex, coverUvNode(planeW, planeH, imageW, imageH))
    : texture(tex);
  const useAlphaChannel = imageFormatMayHaveAlpha(
    resolveImageFileName(tex, imageName),
  );
  return { sample, useAlphaChannel };
}

export type ImagePlaneAlphaMode = 'blend' | 'cutout';

function bindImagePlaneTexture(
  material: MeshStandardNodeMaterial | MeshPhysicalNodeMaterial,
  surface: ImageSurfaceSettings,
  nodes: ImagePlaneTextureNodes,
  alphaMode: ImagePlaneAlphaMode = 'blend',
): void {
  const { sample, useAlphaChannel } = nodes;

  if (useAlphaChannel) {
    const rgba = asTextureRgba(sample);
    material.colorNode = rgba.rgb;
    if (alphaMode === 'cutout') {
      applyImagePlaneAlphaCutout(material, rgba.a);
    } else {
      applyImagePlaneAlpha(material, rgba.a);
    }
    if (surface.emissiveEnabled) {
      material.emissiveNode = (rgba.rgb as ShaderColorNode)
        .mul(float(surface.emissiveIntensity))
        .mul(rgba.a);
    }
    return;
  }

  material.colorNode = sample as unknown as ShaderColorNode;
  if (surface.emissiveEnabled) {
    material.emissiveNode = (sample as unknown as ShaderColorNode).mul(
      float(surface.emissiveIntensity),
    );
  }
}

export function createPassepartoutPbrMaterial(
  resolvePreset: MaterialPresetResolver,
  surface: ImageSurfaceSettings,
): MeshStandardNodeMaterial | MeshPhysicalNodeMaterial {
  const matPreset = resolvePreset(finishToMaterialId(surface.passepartoutFinish));

  if (!matPreset) {
    return createSolidPbrMaterial({
      id: 'fallback',
      name: 'Fallback',
      source: 'builtin',
      kind: 'solid-pbr',
      color: surface.passepartoutColor,
      roughness: 0.5,
      metalness: 0,
    });
  }

  return solidColorPbrMaterial(matPreset, surface.passepartoutColor);
}

function wallpaperUvNode(
  wallWidthM: number,
  stripWidthM: number,
  stripHeightM: number,
  columnOffsetM: number,
) {
  const halfW = float(wallWidthM * 0.5);
  const stripW = float(stripWidthM);
  const stripH = float(stripHeightM);
  const colOffset = float(columnOffsetM);
  const uAlong = positionLocal.x.add(halfW);
  const column = floor(uAlong.div(stripW));
  const oddColumn = mod(column, float(2));
  const vShift = oddColumn.mul(colOffset);
  const u = mod(uAlong, stripW).div(stripW);
  const v = mod(positionLocal.y.sub(vShift), stripH).div(stripH);
  return vec2(u, v);
}

export function createWallpaperImageMaterial(
  preset: MaterialPreset,
  tex: Texture,
  wallWidthM: number,
  stripWidthM: number,
  stripHeightM: number,
  columnOffsetM: number,
  tint?: Rgb,
  surface?: ImageSurfaceSettings,
  imageName?: string,
): MeshStandardNodeMaterial | MeshPhysicalNodeMaterial {
  tex.wrapS = RepeatWrapping;
  tex.wrapT = RepeatWrapping;

  const material =
    preset.kind === 'textured'
      ? createTexturedMaterial(preset, tint)
      : createSolidPbrMaterial(preset, tint);

  const uvNode = wallpaperUvNode(
    wallWidthM,
    stripWidthM,
    stripHeightM,
    columnOffsetM,
  );
  const sample = texture(tex, uvNode);
  const rgba = asTextureRgba(sample);
  const useAlphaChannel = imageFormatMayHaveAlpha(
    resolveImageFileName(tex, imageName),
  );
  const surfaceSettings = surface ?? {
    finish: 'glossy',
    emissiveEnabled: false,
    emissiveIntensity: 0,
    passepartoutColor: { r: 1, g: 1, b: 1 },
    passepartoutOffsetM: 0,
    passepartoutFinish: 'matt',
  };

  if (useAlphaChannel) {
    material.colorNode = rgba.rgb;
    applyImagePlaneAlpha(material, rgba.a);
    if (surfaceSettings.emissiveEnabled) {
      material.emissiveNode = (rgba.rgb as ShaderColorNode)
        .mul(float(surfaceSettings.emissiveIntensity))
        .mul(rgba.a);
    }
  } else {
    material.colorNode = sample;
    if (surfaceSettings.emissiveEnabled) {
      material.emissiveNode = (sample as unknown as ShaderColorNode).mul(
        float(surfaceSettings.emissiveIntensity),
      );
    }
  }

  material.polygonOffset = true;
  material.polygonOffsetFactor = -1;
  material.polygonOffsetUnits = -1;

  return material;
}

/** Mantle band color: print over underlay where the band is covered (PNG alpha included). */
function bandPrintColorNode(
  tex: Texture,
  fit: RotationalPrintFit,
  underlayRgb: Rgb,
): ShaderColorNode {
  const { sampleUv, inBandMask } = rotationalPrintNodes(fit, uv());
  const texColor = asTextureRgba(texture(tex, sampleUv));
  return mix(rgbColorNode(underlayRgb), texColor.rgb, inBandMask.mul(texColor.a));
}

/**
 * Pen body image on lathe: opaque blend with plastic underlay (PNG holes show body color).
 */
export function createPenBodyWrapMaterial(
  resolvePreset: MaterialPresetResolver,
  surface: ImageSurfaceSettings,
  tex: Texture,
  planeW: number,
  planeH: number,
  imageW?: number,
  imageH?: number,
  underlayRgb?: Rgb,
): MeshStandardNodeMaterial | MeshPhysicalNodeMaterial {
  const imagePreset = resolvePreset(finishToMaterialId(surface.finish));
  const roughness = imagePreset?.roughness ?? 0.35;
  const plasticPreset = resolvePreset(MATERIAL_PLASTIC_MATTE_ID);
  const underlay =
    underlayRgb ?? plasticPreset?.color ?? { r: 0.72, g: 0.72, b: 0.72 };

  const material = new MeshStandardNodeMaterial({ metalness: 0 });
  material.roughnessNode = float(roughness);
  material.metalnessNode = float(0);

  const hasImageSize =
    imageW !== undefined &&
    imageH !== undefined &&
    planeW > 0 &&
    planeH > 0 &&
    imageW > 0 &&
    imageH > 0;

  const colorNode: ShaderColorNode = hasImageSize
    ? bandPrintColorNode(
        tex,
        rotationalPrintFit('wrap-height', planeW, planeH, imageW, imageH),
        underlay,
      )
    : (texture(tex));
  material.colorNode = colorNode;

  if (surface.emissiveEnabled) {
    material.emissiveNode = colorNode.mul(float(surface.emissiveIntensity));
  }

  return material;
}

/**
 * Beverage-can label: height-fit on printable band (v = full band height).
 * Narrow images: metal on sides; wide images: horizontal crop. No 2D cover.
 */
export function createCanLabelMaterial(
  resolvePreset: MaterialPresetResolver,
  surface: ImageSurfaceSettings,
  tex: Texture,
  planeW: number,
  planeH: number,
  imageW?: number,
  imageH?: number,
  underlayRgb?: Rgb,
): MeshStandardNodeMaterial | MeshPhysicalNodeMaterial {
  const imagePreset = resolvePreset(finishToMaterialId(surface.finish));
  const roughness = imagePreset?.roughness ?? 0.35;
  const metalPreset = resolvePreset(MATERIAL_ALUMINUM_BRUSHED_ID);
  const underlay =
    underlayRgb ?? metalPreset?.color ?? { r: 0.75, g: 0.76, b: 0.78 };

  const material = new MeshStandardNodeMaterial({ metalness: 0 });
  material.roughnessNode = float(roughness);
  material.metalnessNode = float(0);

  const hasImageSize =
    imageW !== undefined &&
    imageH !== undefined &&
    planeW > 0 &&
    planeH > 0 &&
    imageW > 0 &&
    imageH > 0;

  const colorNode: ShaderColorNode = hasImageSize
    ? bandPrintColorNode(
        tex,
        rotationalPrintFit('wrap-width', planeW, planeH, imageW, imageH),
        underlay,
      )
    : (texture(tex));
  material.colorNode = colorNode;

  if (surface.emissiveEnabled) {
    material.emissiveNode = colorNode.mul(float(surface.emissiveIntensity));
  }

  return material;
}

/** Image albedo on a single plane. Ignores `passepartoutOffsetM` — use `createPassepartoutDisplayMeshes` for inset. */
export function createImagePbrMaterial(
  resolvePreset: MaterialPresetResolver,
  surface: ImageSurfaceSettings,
  tex: Texture | null,
  planeW: number,
  planeH: number,
  imageW?: number,
  imageH?: number,
  tint?: Rgb,
  imageName?: string,
): MeshStandardNodeMaterial | MeshPhysicalNodeMaterial {
  const imagePreset = resolvePreset(finishToMaterialId(surface.finish));

  if (!imagePreset) {
    return createPassepartoutPbrMaterial(resolvePreset, surface);
  }

  if (!tex) {
    return createPassepartoutPbrMaterial(resolvePreset, surface);
  }

  const material =
    imagePreset.kind === 'textured'
      ? createTexturedMaterial(imagePreset, tint)
      : createSolidPbrMaterial(imagePreset, tint);

  const hasImageSize =
    imageW !== undefined &&
    imageH !== undefined &&
    planeW > 0 &&
    planeH > 0 &&
    imageW > 0 &&
    imageH > 0;

  const nodes = hasImageSize
    ? buildImagePlaneTextureNodes(
        tex,
        planeW,
        planeH,
        imageW,
        imageH,
        imageName,
      )
    : {
        sample: texture(tex),
        useAlphaChannel: imageFormatMayHaveAlpha(
          resolveImageFileName(tex, imageName),
        ),
      };

  bindImagePlaneTexture(material, surface, nodes);

  return material;
}

const FABRIC_PLACEHOLDER_SURFACE: ImageSurfaceSettings = {
  finish: 'matt',
  emissiveEnabled: false,
  emissiveIntensity: 0,
  passepartoutColor: { r: 0.85, g: 0.85, b: 0.85 },
  passepartoutOffsetM: 0,
  passepartoutFinish: 'matt',
};

function createStructureBaseMaterial(
  preset: MaterialPreset,
  surfaceRole: ProceduralSurfaceRole = 'default',
): MeshStandardNodeMaterial | MeshPhysicalNodeMaterial {
  if (preset.kind === 'textured') {
    return createTexturedMaterial(preset, TINT_NEUTRAL, { surfaceRole });
  }

  if ((preset.clearcoat ?? 0) > 0) {
    return new MeshPhysicalNodeMaterial({
      color: new Color(1, 1, 1),
      roughness: preset.roughness ?? 0.5,
      metalness: preset.metalness ?? 0,
      clearcoat: preset.clearcoat,
      clearcoatRoughness: preset.clearcoatRoughness ?? 0.1,
    });
  }

  return new MeshStandardNodeMaterial({
    color: new Color(1, 1, 1),
    roughness: preset.roughness ?? 0.5,
    metalness: preset.metalness ?? 0,
  });
}

/** Image albedo × material preset structure (no preset product color). */
export interface CreateImageOnPresetMaterialOptions {
  /** PNG/WebP alpha: cutout keeps `depthWrite` (fabric cloth). Default: alpha blend, no depth write. */
  imageAlphaMode?: ImagePlaneAlphaMode;
}

export function createImageOnPresetMaterial(
  resolvePreset: MaterialPresetResolver,
  materialId: string,
  tex: Texture | null,
  planeW: number,
  planeH: number,
  imageW?: number,
  imageH?: number,
  imageName?: string,
  options: CreateImageOnPresetMaterialOptions = {},
): MeshStandardNodeMaterial | MeshPhysicalNodeMaterial {
  const resolvedId = migrateMaterialId(materialId);
  const preset = resolvePreset(resolvedId);

  if (!preset || preset.kind === 'transmission') {
    return createPassepartoutPbrMaterial(resolvePreset, FABRIC_PLACEHOLDER_SURFACE);
  }

  if (!tex) {
    const material = createStructureBaseMaterial(preset, 'default');
    material.side = DoubleSide;
    return material;
  }

  const material = createStructureBaseMaterial(preset, 'default');
  material.side = DoubleSide;

  const hasImageSize =
    imageW !== undefined &&
    imageH !== undefined &&
    planeW > 0 &&
    planeH > 0 &&
    imageW > 0 &&
    imageH > 0;

  const nodes = hasImageSize
    ? buildImagePlaneTextureNodes(tex, planeW, planeH, imageW, imageH, imageName)
    : {
        sample: texture(tex),
        useAlphaChannel: imageFormatMayHaveAlpha(
          resolveImageFileName(tex, imageName),
        ),
      };

  bindImagePlaneTexture(
    material,
    FABRIC_PLACEHOLDER_SURFACE,
    nodes,
    options.imageAlphaMode ?? 'blend',
  );

  return material;
}

function bindBookImageOverCoverTint(
  material: MeshStandardNodeMaterial | MeshPhysicalNodeMaterial,
  tintedBase: MeshStandardNodeMaterial | MeshPhysicalNodeMaterial,
  nodes: ImagePlaneTextureNodes,
): void {
  const { sample, useAlphaChannel } = nodes;
  const baseColor = (tintedBase.colorNode ??
    vec3(float(1), float(1), float(1))) as Node<'vec3'>;

  if (useAlphaChannel) {
    const rgba = asTextureRgba(sample);
    material.colorNode = mix(
      baseColor,
      rgba.rgb,
      rgba.a,
    );
  } else {
    material.colorNode = sample as unknown as ShaderColorNode;
  }

  material.transparent = false;
  material.opacityNode = null;
  if (tintedBase.roughnessNode) {
    material.roughnessNode = tintedBase.roughnessNode;
  }
  if (tintedBase.metalnessNode) {
    material.metalnessNode = tintedBase.metalnessNode;
  }
}

export function createBookImageOnPresetMaterialFromNodes(
  resolver: MaterialResolver,
  resolvePreset: MaterialPresetResolver,
  materialId: string,
  coverTint: Rgb,
  nodes: ImagePlaneTextureNodes,
): MeshStandardNodeMaterial | MeshPhysicalNodeMaterial {
  const resolvedId = migrateMaterialId(materialId);
  const preset = resolvePreset(resolvedId);

  if (!preset || preset.kind === 'transmission') {
    return (resolver.create(MATERIAL_PLASTIC_MATTE_ID, {
      tint: coverTint,
    }) ?? createSolidPbrMaterial({
      id: 'fallback',
      name: 'Fallback',
      source: 'builtin',
      kind: 'solid-pbr',
      color: coverTint,
      roughness: 0.5,
      metalness: 0,
    }));
  }

  const tintedBase = (resolver.create(materialId, { tint: coverTint }) ??
    resolver.create(MATERIAL_PLASTIC_MATTE_ID, { tint: coverTint }) ??
    createSolidPbrMaterial({
      id: 'fallback',
      name: 'Fallback',
      source: 'builtin',
      kind: 'solid-pbr',
      color: coverTint,
      roughness: 0.5,
      metalness: 0,
    }));

  const material = createStructureBaseMaterial(preset, 'ground');
  bindBookImageOverCoverTint(material, tintedBase, nodes);
  return material;
}

/** Cover image on preset structure; PNG alpha composites over tinted cover (opaque). */
export function createBookImageOnPresetMaterial(
  resolver: MaterialResolver,
  resolvePreset: MaterialPresetResolver,
  materialId: string,
  coverTint: Rgb,
  tex: Texture,
  planeW: number,
  planeH: number,
  imageW?: number,
  imageH?: number,
  imageName?: string,
): MeshStandardNodeMaterial | MeshPhysicalNodeMaterial {
  const hasImageSize =
    imageW !== undefined &&
    imageH !== undefined &&
    planeW > 0 &&
    planeH > 0 &&
    imageW > 0 &&
    imageH > 0;

  const nodes = hasImageSize
    ? buildImagePlaneTextureNodes(tex, planeW, planeH, imageW, imageH, imageName)
    : {
        sample: texture(tex),
        useAlphaChannel: imageFormatMayHaveAlpha(
          resolveImageFileName(tex, imageName),
        ),
      };

  return createBookImageOnPresetMaterialFromNodes(
    resolver,
    resolvePreset,
    materialId,
    coverTint,
    nodes,
  );
}

function isDisposableMaterial(
  material: Material,
): material is MeshStandardNodeMaterial | MeshPhysicalNodeMaterial {
  return (
    material instanceof MeshStandardNodeMaterial ||
    material instanceof MeshPhysicalNodeMaterial
  );
}

export function disposeEngineMaterial(material: Material): void {
  if (isDisposableMaterial(material)) {
    material.dispose();
  }
}

export class MaterialResolver {
  private presetResolver: MaterialPresetResolver | null = null;
  private readonly baseCache = new Map<
    string,
    MeshStandardNodeMaterial | MeshPhysicalNodeMaterial
  >();

  setPresetResolver(resolver: MaterialPresetResolver | null): void {
    this.presetResolver = resolver;
    this.invalidate();
  }

  invalidate(materialId?: string): void {
    if (materialId) {
      const cached = this.baseCache.get(materialId);
      if (cached) {
        cached.dispose();
        this.baseCache.delete(materialId);
      }
      return;
    }

    for (const cached of this.baseCache.values()) {
      cached.dispose();
    }
    this.baseCache.clear();
  }

  resolvePreset(materialId: string): MaterialPreset | null {
    return this.presetResolver?.(materialId) ?? null;
  }

  create(
    materialId: string,
    options: MaterialResolveOptions = {},
  ): MeshStandardNodeMaterial | MeshPhysicalNodeMaterial | null {
    const resolvedId = migrateMaterialId(materialId);
    const preset = this.resolvePreset(resolvedId);
    if (!preset) {return null;}

    const hasTint = options.tint !== undefined;
    const hasDepth = options.meshDepthM !== undefined;
    const hasGrainAxis = options.grainAlongU !== undefined;
    const hasSurfaceRole = options.surfaceRole !== undefined;

    if (!hasTint && !hasDepth && !hasGrainAxis && !hasSurfaceRole) {
      const cached = this.baseCache.get(resolvedId);
      if (cached) {return cached;}

      const created = createMaterialFromPreset(preset);
      this.baseCache.set(resolvedId, created);
      return created;
    }

    return createMaterialFromPreset(preset, options);
  }
}
