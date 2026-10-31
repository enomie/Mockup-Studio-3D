import { float, max, mix, renderOutput, texture, uniform, uv, vec2, vec4 } from 'three/tsl';
import {
  Color,
  type Camera,
  DoubleSide,
  LessEqualDepth,
  LinearSRGBColorSpace,
  MeshBasicNodeMaterial,
  type Node,
  RGBAFormat,
  RenderTarget,
  type Scene,
  UnsignedByteType,
  Vector2,
  type WebGPURenderer,
} from 'three/webgpu';
import {
  SELECTION_MASK_LAYER,
  SELECTION_OUTLINE_COLOR,
  SELECTION_OUTLINE_OCCLUDED_FILL_OPACITY,
  SELECTION_OUTLINE_OCCLUDED_OPACITY,
  SELECTION_OUTLINE_WIDTH_PX,
} from '@/constants';

/** Neighbor directions for silhouette dilation (unit circle, 8 taps). */
const DIRECTIONS: readonly [number, number][] = [
  [1, 0], [-1, 0], [0, 1], [0, -1],
  [0.7071, 0.7071], [-0.7071, 0.7071], [0.7071, -0.7071], [-0.7071, -0.7071],
];

const _clearColor = new Color();

/**
 * Screen-space selection outline.
 *
 * Mask channels: R = full silhouette of the selected meshes (ignores depth),
 * G = visible part of the selected meshes (depth-tested against the scene).
 * The composite draws a constant-width outline around R; segments next to hidden
 * parts are dimmed, and hidden parts get a faint fill.
 */
export class SelectionOutlinePass {
  private readonly maskTarget: RenderTarget;
  private readonly silhouetteMaterial: MeshBasicNodeMaterial;
  private readonly depthMaterial: MeshBasicNodeMaterial;
  private readonly visibleMaterial: MeshBasicNodeMaterial;
  private readonly texelSize = uniform(new Vector2(1, 1));
  private readonly radius = uniform(SELECTION_OUTLINE_WIDTH_PX);
  private readonly enabled = uniform(0);

  constructor() {
    this.maskTarget = new RenderTarget(1, 1, {
      format: RGBAFormat,
      type: UnsignedByteType,
      depthBuffer: true,
    });
    this.maskTarget.texture.name = 'viewport.selectionMask';

    this.silhouetteMaterial = new MeshBasicNodeMaterial({
      side: DoubleSide,
      depthTest: false,
      depthWrite: false,
    });
    this.silhouetteMaterial.colorNode = vec4(1, 0, 0, 1);

    this.depthMaterial = new MeshBasicNodeMaterial({ side: DoubleSide, colorWrite: false });

    this.visibleMaterial = new MeshBasicNodeMaterial({
      side: DoubleSide,
      depthTest: true,
      depthWrite: false,
      depthFunc: LessEqualDepth,
    });
    this.visibleMaterial.colorNode = vec4(1, 1, 0, 1);
  }

  /**
   * Wraps a linear scene color node: applies tone mapping / color space, then the outline
   * in display space so the accent color is exact. Pipelines using it must disable
   * `outputColorTransform`.
   */
  createOutputNode(sceneColor: Node<'vec4'>): Node {
    const mask = texture(this.maskTarget.texture);
    const center = mask.sample(uv());
    let silhouetteMax: Node<'float'> = float(0);
    let visibleMax: Node<'float'> = float(0);
    for (const scale of [1, 0.5]) {
      for (const [dx, dy] of DIRECTIONS) {
        const offset = vec2(dx * scale, dy * scale).mul(this.radius).mul(this.texelSize);
        const tap = mask.sample(uv().add(offset));
        silhouetteMax = max(silhouetteMax, tap.r);
        visibleMax = max(visibleMax, tap.g);
      }
    }

    const outerEdge = silhouetteMax.mul(float(1).sub(center.r));
    const edgeStrength = mix(float(SELECTION_OUTLINE_OCCLUDED_OPACITY), float(1), visibleMax);
    const occludedFill = center.r.mul(float(1).sub(center.g)).mul(SELECTION_OUTLINE_OCCLUDED_FILL_OPACITY);
    const alpha = max(outerEdge.mul(edgeStrength), occludedFill).mul(this.enabled);

    const outlineColor = new Color().setHex(SELECTION_OUTLINE_COLOR, LinearSRGBColorSpace);
    const display = renderOutput(sceneColor);
    return vec4(mix(display.rgb, uniform(outlineColor), alpha), display.a);
  }

  /** Renders the mask; with `active` false the outline is disabled and nothing is drawn. */
  render(renderer: WebGPURenderer, scene: Scene, camera: Camera, active: boolean): void {
    this.enabled.value = active ? 1 : 0;
    if (!active) {return;}

    const prevLayers = camera.layers.mask;
    const prevOverride = scene.overrideMaterial;
    const prevAutoClear = renderer.autoClear;
    const prevClearAlpha = renderer.getClearAlpha();
    renderer.getClearColor(_clearColor);

    renderer.setRenderTarget(this.maskTarget);
    renderer.setClearColor(0x000000, 0);

    // 1) Full silhouette of the selection.
    camera.layers.set(SELECTION_MASK_LAYER);
    scene.overrideMaterial = this.silhouetteMaterial;
    renderer.autoClear = true;
    renderer.render(scene, camera);

    // 2) Depth of everything (no color writes).
    renderer.autoClear = false;
    camera.layers.mask = prevLayers;
    scene.overrideMaterial = this.depthMaterial;
    renderer.render(scene, camera);

    // 3) Visible part of the selection.
    camera.layers.set(SELECTION_MASK_LAYER);
    scene.overrideMaterial = this.visibleMaterial;
    renderer.render(scene, camera);

    camera.layers.mask = prevLayers;
    scene.overrideMaterial = prevOverride;
    renderer.autoClear = prevAutoClear;
    renderer.setClearColor(_clearColor, prevClearAlpha);
    renderer.setRenderTarget(null);
  }

  setSize(width: number, height: number, pixelRatio: number): void {
    this.maskTarget.setSize(width, height);
    this.texelSize.value.set(1 / width, 1 / height);
    this.radius.value = SELECTION_OUTLINE_WIDTH_PX * pixelRatio;
  }

  dispose(): void {
    this.maskTarget.dispose();
    this.silhouetteMaterial.dispose();
    this.depthMaterial.dispose();
    this.visibleMaterial.dispose();
  }
}
