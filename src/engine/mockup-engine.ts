import {
  Color,
  type Mesh,
  Scene,
  type WebGPURenderer,
} from 'three/webgpu';
import type { Rgb } from '@/colors/rgb';
import { SCENE_DEFAULTS } from '@/config/scene-defaults';
import { DEBUG_PHYSICS_CUBE, EXPORT_JPEG_QUALITY, GROUND_PLANE_SIZE } from '@/constants';
import { CameraController } from './camera-controller';
import {
  disposeDebugPhysicsCubeMesh,
  setupDebugPhysicsCube,
} from './debug-physics-cube';
import { EnvironmentSystem } from './environment-system';
import { createWebGpuRenderer } from '@/render/renderer-setup';
import { ViewportRenderPipeline } from '@/render/viewport-render-pipeline';
import { syncPhysicsBindings, type PhysicsBinding } from './physics-sync';
import { PhysicsWorld } from '@/physics/physics-world';
import { createGroundPlane } from '@/render/ground-plane';
import type { GroundMaterial } from '@/materials/groundMaterial';
import { Skybox } from '@/render/skybox';
import { getBuiltinCameraView } from '@/data/camera-views';
import type {
  AppMode,
  AssetKind,
  BuiltinCameraViewId,
  CameraProjection,
  CameraReadout,
  CameraSettings,
  CameraSlot,
  CameraSlotIndex,
  CameraViewState,
  DeepPartial,
  EnvironmentState,
  GroundSettings,
  ImageResolver,
  LightingSettings,
  SceneApi,
  SceneApiListener,
} from '@/scene/scene-api';
import type {
  AssetEntity,
  AssetFaceContent,
  AssetFaceId,
  AssetGeometryPart,
  EntityTransform,
  HandheldDeviceParams,
  MonitorDeviceParams,
  MaterialEntitySlot,
  PrintDeviceParams,
  BeverageCanParams,
  TinCanParams,
  WineBottleParams,
  BlockParams,
  WallParams,
  WallpaperPattern,
  Vec3,
} from '@/scene/entity-types';
import { isWallAssetKind } from '@/scene/asset-wall';
import type {
  AssetImageSurfaceId,
  ImageSurfaceSettings,
} from '@/scene/image-surface';
import { resolveBuiltinMaterialPreset } from '@/data/material-presets';
import type { MaterialPresetResolver } from '@/scene/material-types';
import { applyAtmosphereSnapshot as applyAtmosphereSnapshotToApi } from '@/scene/atmosphere-snapshot';
import type { CaptureViewportImageOptions } from '@/scene/export-image';
import type { AtmosphereSnapshot } from '@/scene/environment-preset-types';
import { clampSizeScale } from '@/scene/asset-sizing';
import { EntityRegistry } from './entity-registry';
import { AssetSystem } from './asset-system';
import { ImageTextureLoader } from './image-texture-loader';
import { GizmoController } from './gizmo-controller';
import { SelectionController } from './selection-controller';
import { SelectionHighlight } from './selection-highlight';
import { ViewportInputController } from './viewport-input-controller';
import { isStudioLightId } from '@/scene/light-ids';
import { LightingSystem } from './lighting/lighting-system';
import { ViewportInvalidation } from './viewport-invalidation';

const GROUND_PHYSICS_ID = 'ground';

export class MockupEngine implements SceneApi {
  private readonly container: HTMLElement;
  private readonly renderer: WebGPURenderer;
  private readonly cameras: CameraController;
  private readonly scene: Scene;
  private readonly skybox: Skybox;
  private readonly environment: EnvironmentSystem;
  private readonly lighting: LightingSystem;
  private readonly physics: PhysicsWorld;
  private readonly physicsBindings: PhysicsBinding[];
  private readonly ground: Mesh;
  private readonly groundMaterial: GroundMaterial;
  private readonly resizeObserver: ResizeObserver;
  private readonly registry: EntityRegistry;
  private readonly textureLoader: ImageTextureLoader;
  private readonly assets: AssetSystem;
  private readonly gizmo: GizmoController;
  private readonly selection: SelectionController;
  private readonly selectionHighlight: SelectionHighlight;
  private readonly viewportInput: ViewportInputController;
  private readonly viewportPipeline: ViewportRenderPipeline;
  private readonly viewportInvalidation: ViewportInvalidation;
  private readonly listeners = new Set<SceneApiListener>();

  private appMode: AppMode = 'select';
  private cameraSlots: [CameraSlot, CameraSlot, CameraSlot] = [null, null, null];
  private disposed = false;
  private lastTime = performance.now();
  private scaleDragBase = 1;
  private scaleCommitPending = false;

  private constructor(
    container: HTMLElement,
    renderer: WebGPURenderer,
    cameras: CameraController,
    scene: Scene,
    skybox: Skybox,
    environment: EnvironmentSystem,
    lighting: LightingSystem,
    physics: PhysicsWorld,
    physicsBindings: PhysicsBinding[],
    ground: Mesh,
    groundMaterial: GroundMaterial,
    registry: EntityRegistry,
    textureLoader: ImageTextureLoader,
    assets: AssetSystem,
    gizmo: GizmoController,
    selection: SelectionController,
    selectionHighlight: SelectionHighlight,
    viewportInput: ViewportInputController,
    viewportPipeline: ViewportRenderPipeline,
  ) {
    this.container = container;
    this.renderer = renderer;
    this.cameras = cameras;
    this.scene = scene;
    this.skybox = skybox;
    this.environment = environment;
    this.lighting = lighting;
    this.physics = physics;
    this.physicsBindings = physicsBindings;
    this.ground = ground;
    this.groundMaterial = groundMaterial;
    this.registry = registry;
    this.textureLoader = textureLoader;
    this.assets = assets;
    this.gizmo = gizmo;
    this.selection = selection;
    this.selectionHighlight = selectionHighlight;
    this.viewportInput = viewportInput;
    this.viewportPipeline = viewportPipeline;
    this.viewportInvalidation = new ViewportInvalidation(renderer, (time) =>
      this.onFrame(time),
    );
    this.assets.setViewportInvalidation(this.viewportInvalidation);
    this.environment.setViewportInvalidation(this.viewportInvalidation);

    this.gizmo.setCallbacks({
      onTransform: () => {
        const selectedLightId = this.lighting.getSelectedLightId();
        if (selectedLightId) {
          this.lighting.syncOffsetFromHelper(selectedLightId);
          this.lighting.updateFrame();
          this.emit();
          return;
        }

        const selected = this.registry.getSelectedRuntime();
        if (!selected) return;

        if (this.appMode === 'scale') {
          this.gizmo.enforceUniformScale();
          this.scaleCommitPending = true;
          return;
        }

        this.registry.syncTransformFromObject(selected.entity.id);
        this.emit();
      },
      onDraggingChanged: (dragging) => {
        this.cameras.setOrbitEnabled(!dragging);
        this.viewportInvalidation.setContinuous(
          dragging || this.cameras.isInteracting(),
        );

        if (this.appMode !== 'scale') return;

        const selected = this.registry.getSelectedRuntime();
        if (!selected) return;

        if (dragging) {
          this.scaleDragBase = selected.entity.sizeScale;
          selected.object.scale.set(1, 1, 1);
          this.scaleCommitPending = false;
          return;
        }

        if (!this.scaleCommitPending) return;

        const uniform =
          (selected.object.scale.x + selected.object.scale.y + selected.object.scale.z) / 3;
        selected.object.scale.set(1, 1, 1);
        const nextScale = clampSizeScale(this.scaleDragBase * uniform);
        this.applyAssetMutation(() =>
          this.assets.setAssetSizeScale(selected.entity.id, nextScale),
        );
        this.scaleCommitPending = false;
      },
    });

    scene.add(gizmo.getHelper());
    this.applyGizmoMode(this.appMode);

    registry.subscribeEntities(() => this.notifySceneApiListeners());
    registry.subscribeSelection(() => this.notifySceneApiListeners());
    lighting.subscribeSelection(() => this.notifySceneApiListeners());
    this.cameras.setChangeListener(() => this.emit());
    this.cameras.setViewportActivityListener(() => {
      this.invalidateViewport();
    });

    this.cameras.attach(renderer.domElement);

    this.resizeObserver = new ResizeObserver(() => this.handleResize());
    this.resizeObserver.observe(container);
    this.handleResize();
  }

  static async create(container: HTMLElement): Promise<MockupEngine> {
    if (!navigator.gpu) {
      throw new Error('WebGPU is required.');
    }

    const physics = await PhysicsWorld.create();
    physics.createStaticGround(GROUND_PHYSICS_ID, GROUND_PLANE_SIZE / 2);

    const cameras = new CameraController();
    cameras.resetToNormal(SCENE_DEFAULTS.camera.normalView);

    const renderer = await createWebGpuRenderer(container);
    const viewportPipeline = new ViewportRenderPipeline(renderer);

    const scene = new Scene();
    const { environment } = SCENE_DEFAULTS;

    const groundPlane = createGroundPlane();
    const ground = groundPlane.mesh;
    const groundMaterial = groundPlane.material;
    scene.add(ground);
    if (groundMaterial.isMirrorEnabled()) {
      groundMaterial.getPlanarReflection().updateResolution(renderer);
    }

    const physicsBindings: PhysicsBinding[] = [];
    if (DEBUG_PHYSICS_CUBE) {
      physicsBindings.push(setupDebugPhysicsCube(physics, scene));
    }

    const skybox = new Skybox();
    const registry = new EntityRegistry();
    const textureLoader = new ImageTextureLoader();
    textureLoader.setMaxAnisotropy(renderer.getMaxAnisotropy());
    const assets = new AssetSystem(scene, registry, textureLoader);
    assets
      .getMaterialResolver()
      .setPresetResolver((materialId) => resolveBuiltinMaterialPreset(materialId));

    const environmentSystem = new EnvironmentSystem(
      scene,
      renderer,
      skybox,
      ground,
      groundMaterial,
      environment,
      SCENE_DEFAULTS.ground,
    );
    environmentSystem.setMaterialResolver(assets.getMaterialResolver());
    environmentSystem.applyGround(SCENE_DEFAULTS.ground);

    const lightingSystem = new LightingSystem(scene, registry, SCENE_DEFAULTS.lighting);
    const gizmo = new GizmoController(cameras.camera, renderer.domElement);
    const selection = new SelectionController(renderer.domElement, registry);
    const selectionHighlight = new SelectionHighlight(registry, lightingSystem);
    const gizmoForInput = gizmo;

    const engine = new MockupEngine(
      container,
      renderer,
      cameras,
      scene,
      skybox,
      environmentSystem,
      lightingSystem,
      physics,
      physicsBindings,
      ground,
      groundMaterial,
      registry,
      textureLoader,
      assets,
      gizmo,
      selection,
      selectionHighlight,
      new ViewportInputController(
        renderer.domElement,
        cameras,
        selection,
        gizmoForInput,
      ),
      viewportPipeline,
    );

    selection.setCameraProvider(() => cameras.camera);
    selection.setLightPickablesProvider(() => lightingSystem.getPickables());
    selection.setSelectHandler((entityId) => engine.handleSelect(entityId));
    selection.setDeleteHandler(() => {
      const selectedAssetId = registry.getSelectedEntityId();
      if (!selectedAssetId) return;
      engine.removeEntity(selectedAssetId);
    });

    // Default portfolio scene: picture, print (A5), smartphone, tablet, monitor.
    engine.assets.seedDefaultScene();
    engine.invalidateViewport();

    return engine;
  }

  subscribe(listener: SceneApiListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  setImageResolver(resolver: ImageResolver | null): void {
    this.assets.setImageResolver(resolver);
    if (resolver && this.registry.getEntities().length > 0) {
      this.assets.rebuildAllEntities();
      this.emit();
    }
  }

  setMaterialPresetResolver(resolver: MaterialPresetResolver | null): void {
    this.assets.getMaterialResolver().setPresetResolver(resolver);
    this.environment.reapplyGroundSurface();
    if (resolver && this.registry.getEntities().length > 0) {
      this.assets.rebuildAllEntities();
      this.emit();
    }
  }

  invalidateMaterial(materialId: string): void {
    this.assets.invalidateMaterial(materialId);
    this.environment.refreshGroundMaterialIfMatches(materialId);
    this.emit();
  }

  getMode(): AppMode {
    return this.appMode;
  }

  setMode(mode: AppMode): void {
    this.commitVisualState(() => {
      this.appMode = mode;
      this.applyGizmoMode(mode);
    });
  }

  addAsset(assetKind: AssetKind): string {
    const entityId = this.assets.addAsset(assetKind);
    this.selectEntity(entityId);
    return entityId;
  }

  removeEntity(entityId: string): void {
    this.assets.removeAsset(entityId);
    this.applyGizmoMode(this.appMode);
    this.emit();
  }

  selectEntity(entityId: string | null): void {
    this.handleSelect(entityId);
  }

  getSelectedEntityId(): string | null {
    return this.registry.getSelectedEntityId() ?? this.lighting.getSelectedLightId();
  }

  getEntities(): readonly AssetEntity[] {
    return this.registry.getEntities();
  }

  setEntityTransform(entityId: string, partial: Partial<EntityTransform>): void {
    this.registry.updateTransform(entityId, partial);
    this.invalidateViewport();
    this.notifySceneApiListeners();
  }

  setAssetImage(entityId: string, imageId: string | null): void {
    this.applyAssetMutation(
      () => this.assets.setAssetImage(entityId, imageId),
      { refreshGizmo: true },
    );
  }

  setAssetFace(entityId: string, faceId: AssetFaceId, content: AssetFaceContent): void {
    this.applyAssetMutation(() => this.assets.setAssetFace(entityId, faceId, content));
  }

  setAssetDepth(entityId: string, depthM: number): void {
    this.applyAssetMutation(() => this.assets.setAssetDepth(entityId, depthM));
  }

  setAssetSizeScale(entityId: string, sizeScale: number): void {
    this.applyAssetMutation(
      () => this.assets.setAssetSizeScale(entityId, sizeScale),
      { refreshGizmo: true },
    );
  }

  setEntityVisible(entityId: string, visible: boolean): void {
    this.registry.setEntityVisible(entityId, visible);
    this.applyGizmoMode(this.appMode);
    this.emit();
  }

  setEntityMaterial(
    entityId: string,
    slot: MaterialEntitySlot,
    materialId: string,
  ): void {
    this.applyAssetMutation(() =>
      this.assets.setEntityMaterial(entityId, slot, materialId),
    );
  }

  setFaceTint(entityId: string, faceId: AssetFaceId, tint: Rgb): void {
    this.applyAssetMutation(() => this.assets.setFaceTint(entityId, faceId, tint));
  }

  setImageSurface(
    entityId: string,
    faceId: AssetImageSurfaceId,
    partial: Partial<ImageSurfaceSettings>,
  ): void {
    this.applyAssetMutation(() =>
      this.assets.setImageSurface(entityId, faceId, partial),
    );
  }

  setGeometryVisible(
    entityId: string,
    part: AssetGeometryPart,
    visible: boolean,
  ): void {
    this.applyAssetMutation(() =>
      this.assets.setGeometryVisible(entityId, part, visible),
    );
  }

  setHandheldParams(
    entityId: string,
    partial: Partial<HandheldDeviceParams>,
  ): void {
    this.applyAssetMutation(() => this.assets.setHandheldParams(entityId, partial));
  }

  setMonitorParams(
    entityId: string,
    partial: Partial<MonitorDeviceParams>,
  ): void {
    this.applyAssetMutation(() => this.assets.setMonitorParams(entityId, partial));
  }

  setPrintParams(
    entityId: string,
    partial: Partial<PrintDeviceParams>,
  ): void {
    this.applyAssetMutation(() => this.assets.setPrintParams(entityId, partial));
  }

  setWallParams(entityId: string, partial: Partial<WallParams>): void {
    this.applyAssetMutation(() => this.assets.setWallParams(entityId, partial));
  }

  setBlockParams(entityId: string, partial: Partial<BlockParams>): void {
    this.applyAssetMutation(() => this.assets.setBlockParams(entityId, partial));
  }

  setBeverageCanParams(
    entityId: string,
    partial: Partial<BeverageCanParams>,
  ): void {
    this.applyAssetMutation(() =>
      this.assets.setBeverageCanParams(entityId, partial),
    );
  }

  setTinCanParams(entityId: string, partial: Partial<TinCanParams>): void {
    this.applyAssetMutation(() => this.assets.setTinCanParams(entityId, partial));
  }

  setWineBottleParams(
    entityId: string,
    partial: Partial<WineBottleParams>,
  ): void {
    this.applyAssetMutation(() =>
      this.assets.setWineBottleParams(entityId, partial),
    );
  }

  setWallpaperPattern(entityId: string, partial: Partial<WallpaperPattern>): void {
    this.applyAssetMutation(() =>
      this.assets.setWallpaperPattern(entityId, partial),
    );
  }

  applyLighting(state: LightingSettings): void {
    this.lighting.apply(state);
    this.invalidateViewport();
  }

  setLighting(partial: DeepPartial<LightingSettings>): void {
    this.lighting.setLighting(partial);
    this.invalidateViewport();
  }

  getLighting(): LightingSettings {
    return this.lighting.getLighting();
  }

  applyEnvironment(state: EnvironmentState): void {
    this.environment.apply(state);
    this.invalidateViewport();
  }

  applyAtmosphereSnapshot(snapshot: AtmosphereSnapshot): void {
    this.commitVisualState(() => {
      applyAtmosphereSnapshotToApi(this, snapshot);
    });
  }

  setSkyEnabled(enabled: boolean): void {
    this.environment.setSkyEnabled(enabled);
    this.invalidateViewport();
  }

  setSkyHorizonColor(rgb: Rgb): void {
    this.environment.setSkyHorizonColor(rgb);
    this.invalidateViewport();
  }

  setSkyZenithColor(rgb: Rgb): void {
    this.environment.setSkyZenithColor(rgb);
    this.invalidateViewport();
  }

  setSkyGradientFade(fade: number): void {
    this.environment.setSkyGradientFade(fade);
    this.invalidateViewport();
  }

  applyGround(state: GroundSettings): void {
    this.environment.applyGround(state);
    this.invalidateViewport();
  }

  setGround(partial: Partial<GroundSettings>): void {
    this.environment.setGround(partial);
    if (partial.mirrorEnabled === true) {
      this.groundMaterial.getPlanarReflection().updateResolution(this.renderer);
    }
    this.invalidateViewport();
  }

  setFogEnabled(enabled: boolean): void {
    this.environment.setFogEnabled(enabled);
    this.invalidateViewport();
  }

  setFogColor(rgb: Rgb): void {
    this.environment.setFogColor(rgb);
    this.invalidateViewport();
  }

  setFogDistances(near: number, far: number): void {
    this.environment.setFogDistances(near, far);
    this.invalidateViewport();
  }

  setReflectionEnabled(enabled: boolean): void {
    this.environment.setReflectionEnabled(enabled);
    this.invalidateViewport();
  }

  setReflectionIntensity(intensity: number): void {
    this.environment.setReflectionIntensity(intensity);
    this.invalidateViewport();
  }

  loadBuiltinView(id: BuiltinCameraViewId): void {
    if (id === 'normal') {
      this.cameras.resetToNormal(SCENE_DEFAULTS.camera.normalView);
      this.emit();
      return;
    }

    const definition = getBuiltinCameraView(id);
    if (!definition) return;

    this.cameras.loadBuiltinView(definition);
    this.emit();
  }

  captureSlot(index: CameraSlotIndex): void {
    const slotIndex = index - 1;
    const viewState = this.cameras.getViewState();
    this.cameraSlots[slotIndex] = {
      ...viewState,
      position: { ...viewState.position },
      target: { ...viewState.target },
      name: this.cameraSlots[slotIndex]?.name?.trim() || `Slot ${index}`,
    };
    this.emit();
  }

  loadSlot(index: CameraSlotIndex): void {
    const slot = this.cameraSlots[index - 1];
    if (!slot) return;

    this.cameras.applyFramingState(slot);
    this.emit();
  }

  clearSlot(index: CameraSlotIndex): void {
    this.cameraSlots[index - 1] = null;
    this.emit();
  }

  renameSlot(index: CameraSlotIndex, name: string): void {
    const slotIndex = index - 1;
    const slot = this.cameraSlots[slotIndex];
    if (!slot) return;

    this.cameraSlots[slotIndex] = { ...slot, name };
    this.emit();
  }

  setCameraProjection(projection: CameraProjection): void {
    this.cameras.setProjection(projection);
    this.emit();
  }

  setCameraFov(fov: number): void {
    this.cameras.setFov(fov);
    this.emit();
  }

  setCameraOrthoZoom(zoom: number): void {
    this.cameras.setOrthoZoom(zoom);
    this.emit();
  }

  getCameraSettings(): CameraSettings {
    const viewState = this.cameras.getViewState();
    return {
      projection: viewState.projection,
      fov: viewState.fov,
      orthoZoom: viewState.orthoZoom,
      slots: this.cameraSlots.map((slot) =>
        slot
          ? {
              ...slot,
              position: { ...slot.position },
              target: { ...slot.target },
            }
          : null,
      ) as [CameraSlot, CameraSlot, CameraSlot],
    };
  }

  getCameraViewState(): CameraViewState {
    const viewState = this.cameras.getViewState();
    return {
      ...viewState,
      position: { ...viewState.position },
      target: { ...viewState.target },
    };
  }

  getCameraReadout(): CameraReadout {
    const readout = this.cameras.getReadout();
    return {
      position: { ...readout.position },
      target: { ...readout.target },
      distance: readout.distance,
      azimuthDeg: readout.azimuthDeg,
      elevationDeg: readout.elevationDeg,
    };
  }

  setCameraPosition(partial: Partial<Vec3>): void {
    this.cameras.setPosition(partial);
  }

  setCameraTarget(partial: Partial<Vec3>): void {
    this.cameras.setTarget(partial);
  }

  setCameraDistance(distanceM: number): void {
    this.cameras.setOrbitDistance(distanceM);
  }

  setCameraAzimuthDeg(degrees: number): void {
    this.cameras.setAzimuthDeg(degrees);
  }

  setCameraElevationDeg(degrees: number): void {
    this.cameras.setElevationDeg(degrees);
  }

  resetCameraAzimuth(): void {
    this.cameras.resetAzimuth();
  }

  resetCameraElevation(): void {
    this.cameras.resetElevation();
  }

  async captureViewportImage(options: CaptureViewportImageOptions): Promise<Blob> {
    const includeSky = options.format === 'jpeg';
    const transparentBackground = options.format === 'png-transparent';
    const groundSurface = options.groundSurface ?? 'viewport';
    const useShadowCatcher =
      transparentBackground && groundSurface === 'contact-shadows-only';
    const hideLightFixtures = options.hideLightFixtures === true;
    const camera = this.cameras.camera;
    this.gizmo.updateCamera(camera);
    this.environment.updateFrame(camera);
    this.lighting.updateFrame();

    const prevClearColor = this.renderer.getClearColor(new Color());
    const prevClearAlpha = this.renderer.getClearAlpha();
    const prevAlpha = this.renderer.alpha;

    if (transparentBackground) {
      this.renderer.alpha = true;
      this.renderer.setClearColor(0x000000, 0);
    }

    if (useShadowCatcher) {
      this.environment.pushGroundExportCaptureMode('contact-shadows-only');
    }
    if (hideLightFixtures) {
      this.lighting.pushExportHideFixtures();
    }

    try {
      this.renderViewportFrame({ skyEnabled: includeSky, transparentBackground });

      const canvas = this.renderer.domElement;
      const mimeType = options.format === 'jpeg' ? 'image/jpeg' : 'image/png';
      const quality =
        options.format === 'jpeg'
          ? (options.jpegQuality ?? EXPORT_JPEG_QUALITY)
          : undefined;

      return await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
              return;
            }
            reject(new Error(`Failed to capture viewport as ${mimeType}.`));
          },
          mimeType,
          quality,
        );
      });
    } finally {
      if (hideLightFixtures) {
        this.lighting.popExportHideFixtures();
      }
      if (useShadowCatcher) {
        this.environment.popGroundExportCaptureMode();
      }
      this.renderer.setClearColor(prevClearColor, prevClearAlpha);
      this.renderer.alpha = prevAlpha;
      this.renderViewportFrame();
    }
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;

    this.viewportInput.dispose();
    this.selectionHighlight.dispose();
    this.selection.dispose();
    this.gizmo.dispose();
    this.assets.dispose();
    this.lighting.dispose();
    this.textureLoader.dispose();
    this.cameras.setChangeListener(null);
    this.cameras.setViewportActivityListener(null);
    this.cameras.detach();
    this.resizeObserver.disconnect();
    this.viewportInvalidation.dispose();
    this.viewportPipeline.dispose();
    this.renderer.dispose();

    for (const binding of this.physicsBindings) {
      disposeDebugPhysicsCubeMesh(binding);
    }
    this.physics.dispose();
    this.environment.dispose();

    this.ground.geometry.dispose();
    this.groundMaterial.disposeMirror();
    this.groundMaterial.dispose();

    this.renderer.domElement.remove();
  }

  private handleSelect(entityId: string | null): void {
    this.commitVisualState(() => {
      if (entityId && isStudioLightId(entityId)) {
        this.registry.setSelectedEntityId(null);
        this.lighting.setSelectedLightId(entityId);
      } else {
        this.lighting.setSelectedLightId(null);
        this.registry.setSelectedEntityId(entityId);
      }
      this.applyGizmoMode(this.appMode);
    });
  }

  private applyGizmoMode(mode: AppMode): void {
    const selectedLightId = this.lighting.getSelectedLightId();
    const selectedAsset = this.registry.getSelectedRuntime();
    const selectedAssetObject =
      selectedAsset?.entity.visible !== false ? selectedAsset?.object ?? null : null;
    const gizmoTarget =
      (selectedLightId ? this.lighting.getHelperObject(selectedLightId) : null) ??
      selectedAssetObject;

    if (mode === 'translate') {
      this.gizmo.setTransformMode('translate');
      this.gizmo.attach(gizmoTarget);
      this.gizmo.setEnabled(Boolean(gizmoTarget));
      return;
    }

    if (mode === 'rotate') {
      if (selectedLightId) {
        this.gizmo.setEnabled(false);
        return;
      }
      this.gizmo.setTransformMode('rotate');
      this.gizmo.attach(gizmoTarget);
      this.gizmo.setEnabled(Boolean(gizmoTarget));
      return;
    }

    if (mode === 'scale') {
      if (
        selectedLightId ||
        !selectedAsset ||
        isWallAssetKind(selectedAsset.entity.assetKind)
      ) {
        this.gizmo.setEnabled(false);
        return;
      }
      selectedAsset.object.scale.set(1, 1, 1);
      this.gizmo.setTransformMode('scale');
      this.gizmo.attach(gizmoTarget);
      this.gizmo.setEnabled(true);
      return;
    }

    this.gizmo.setEnabled(false);
  }

  private applyAssetMutation(
    mutation: () => Promise<void>,
    options?: { refreshGizmo?: boolean },
  ): void {
    void (async () => {
      await mutation();
      if (options?.refreshGizmo) {
        this.applyGizmoMode(this.appMode);
      }
      this.emit();
    })();
  }

  private notifySceneApiListeners(): void {
    this.listeners.forEach((listener) => listener());
  }

  private invalidateViewport(): void {
    this.viewportInvalidation.invalidate();
  }

  private emit(): void {
    this.invalidateViewport();
    this.notifySceneApiListeners();
  }

  private commitVisualState(update: () => void): void {
    update();
    this.invalidateViewport();
    this.notifySceneApiListeners();
  }

  private onFrame(time: number): void {
    if (this.disposed) return;

    const needsPhysics =
      DEBUG_PHYSICS_CUBE || this.physics.hasDynamicBodies();
    const continuous =
      this.cameras.isInteracting() ||
      this.gizmo.isDragging() ||
      needsPhysics;
    this.viewportInvalidation.setContinuous(continuous);

    const deltaSeconds = Math.min((time - this.lastTime) / 1000, 0.1);
    this.lastTime = time;

    if (needsPhysics) {
      this.physics.step(deltaSeconds);
      syncPhysicsBindings(this.physicsBindings);
    }

    const camera = this.cameras.camera;
    this.gizmo.updateCamera(camera);
    this.environment.updateFrame(camera);
    this.lighting.updateFrame();

    this.renderViewportFrame();

    if (needsPhysics) {
      this.invalidateViewport();
    }
  }

  private renderViewportFrame(overrides?: {
    skyEnabled?: boolean;
    transparentBackground?: boolean;
  }): void {
    const camera = this.cameras.camera;
    this.viewportPipeline.renderFrame({
      skyScene: this.skybox.getScene(),
      mainScene: this.scene,
      camera,
      skyEnabled: overrides?.skyEnabled ?? this.environment.getSkyEnabled(),
      transparentBackground: overrides?.transparentBackground ?? false,
    });
  }

  private handleResize(): void {
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    if (w === 0 || h === 0) return;

    this.cameras.handleResize(w, h);
    this.renderer.setSize(w, h);
    this.viewportPipeline.setSize(w, h);
    if (this.groundMaterial.isMirrorEnabled()) {
      this.groundMaterial.getPlanarReflection().updateResolution(this.renderer);
    }
    this.invalidateViewport();
  }
}
