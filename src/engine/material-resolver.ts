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
  clamp,
  float,
  floor,
  mix,
  mod,
  positionLocal,
  step,
  texture,
  uv,
  vec2,
  vec3,
} from 'three/tsl';
import {
  applyImagePlaneAlpha,
  imageFormatMayHaveAlpha,
  resolveImageFileName,
} from './image-surface-alpha';
import { labelImageUSpan } from './beverage-can-label-unfold';
import { finishToMaterialId, type ImageSurfaceSettings } from '@/scene/image-surface';
import { multiplyRgb, type Rgb } from '@/colors/rgb';
import { createTexturedMaterial } from '@/materials/procedural';
import {
  MATERIAL_ALUMINUM_BRUSHED_ID,
  MATERIAL_GLASS_WINE_BOTTLE_ID,
  migrateMaterialId,
} from '@/scene/material-ids';
import type {
  MaterialPreset,
  MaterialPresetResolver,
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

export type MaterialResolveOptions = {
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
};

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

  return new MeshPhysicalNodeMaterial({
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
type ShaderOpacityNode = NonNullable<MeshStandardNodeMaterial['opacityNode']>;

type ImagePlaneTextureNodes = {
  sample: ReturnType<typeof texture>;
  useAlphaChannel: boolean;
};

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

function bindImagePlaneTexture(
  material: MeshStandardNodeMaterial | MeshPhysicalNodeMaterial,
  surface: ImageSurfaceSettings,
  nodes: ImagePlaneTextureNodes,
): void {
  const { sample, useAlphaChannel } = nodes;

  if (useAlphaChannel) {
    const rgba = asTextureRgba(sample);
    material.colorNode = rgba.rgb as ShaderColorNode;
    applyImagePlaneAlpha(material, rgba.a as ShaderOpacityNode);
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
    material.colorNode = rgba.rgb as ShaderColorNode;
    applyImagePlaneAlpha(material, rgba.a as ShaderOpacityNode);
    if (surfaceSettings.emissiveEnabled) {
      material.emissiveNode = (rgba.rgb as ShaderColorNode)
        .mul(float(surfaceSettings.emissiveIntensity))
        .mul(rgba.a);
    }
  } else {
    material.colorNode = sample as unknown as ShaderColorNode;
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

function fitHeightLabelColorNode(
  tex: Texture,
  planeW: number,
  planeH: number,
  imageW: number,
  imageH: number,
  underlayRgb: Rgb,
): ShaderColorNode {
  const uSpan = labelImageUSpan(planeW, planeH, imageW, imageH);
  const bandU = uv().x;
  const bandV = uv().y;
  const half = float(0.5);
  const uSpanNode = float(uSpan);

  const sNarrow = bandU.sub(half).div(uSpanNode).add(half);
  const sWide = bandU.sub(half).mul(uSpanNode).add(half);
  const useWide = step(float(1), uSpanNode);
  const s = mix(sNarrow, sWide, useWide);
  const t = bandV;

  const sClamped = clamp(s, float(0), float(1));
  const texColor = asTextureRgba(texture(tex, vec2(sClamped, t)));

  const inTextureS = step(float(0), s).mul(step(s, float(1)));
  const inTextureT = step(float(0), t).mul(step(t, float(1)));
  const isNarrow = step(uSpanNode, float(1));
  const showTexture = mix(inTextureT, inTextureS.mul(inTextureT), isNarrow);
  const underlay = rgbColorNode(underlayRgb);
  const blend = showTexture.mul(texColor.a);

  return mix(underlay, texColor.rgb, blend) as ShaderColorNode;
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
    ? fitHeightLabelColorNode(tex, planeW, planeH, imageW, imageH, underlay)
    : (texture(tex) as ShaderColorNode);
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
    if (!preset) return null;

    const hasTint = options.tint !== undefined;
    const hasDepth = options.meshDepthM !== undefined;
    const hasGrainAxis = options.grainAlongU !== undefined;
    const hasSurfaceRole = options.surfaceRole !== undefined;

    if (!hasTint && !hasDepth && !hasGrainAxis && !hasSurfaceRole) {
      const cached = this.baseCache.get(resolvedId);
      if (cached) return cached;

      const created = createMaterialFromPreset(preset);
      this.baseCache.set(resolvedId, created);
      return created;
    }

    return createMaterialFromPreset(preset, options);
  }
}
