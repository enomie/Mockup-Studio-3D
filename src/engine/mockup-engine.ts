import { type Mesh, type Object3D, Scene, type WebGPURenderer } from 'three/webgpu';
import type { Rgb } from '@/colors/rgb';
import { SCENE_DEFAULTS } from '@/config/scene-defaults';
import { FIXTURE_DISC_LAYER, GROUND_PLANE_SIZE } from '@/constants';
import { CameraController } from './camera-controller';
import { PhysicsRigidTestController } from './physics-rigid-test';
import { WorldPhysicsSessionController } from './world-physics-session';
import { EnvironmentSystem } from './environment-system';
import { createWebGpuRenderer } from '@/render/renderer-setup';
import { ViewportRenderPipeline } from '@/render/viewport-render-pipeline';
import { syncPhysicsBindings } from './physics-sync';
import { RigidPrimitivePhysicsColliders } from './rigid-primitive-physics-colliders';
import { FabricClothSimulationParticipant } from './fabric-cloth-simulation-participant';
import { PhysicsWorld } from '@/physics/physics-world';
import { readFabricClothPlaneSegments } from './fabric-cloth-geometry';
import {
  resolvePhysicsBodyMode,
  type PhysicsBodyMode,
} from '@/scene/physics-rigid-body';
import { isRigidPrimitiveAssetKind } from '@/scene/rigid-primitive-asset';
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
  ViewportHelpersState,
} from '@/scene/scene-api';
import type {
  AssetEntity,
  AssetFaceContent,
  AssetFaceId,
  AssetGeometryPart,
  EntityTransform,
  MaterialEntitySlot,
  PatchHandleTarget,
  WallpaperPattern,
  Vec3,
} from '@/scene/entity-types';
import { isWallAssetKind } from '@/scene/asset-wall';
import {
  cloneFabricClothParams,
  defaultFabricClothParams,
  isFabricClothAssetKind,
} from '@/scene/asset-fabric-cloth';
import { canBakeEntity } from '@/scene/bake-registry';
import { bakeFabricClothMeshFromVerletBinding } from './fabric-cloth-bake';
import {
  fabricClothPinCornerIndex,
  fabricClothPinEntityId,
} from './fabric-cloth-pins';
import { getAssetKindDefinition } from '@/scene/asset-kind-registry';
import type {
  BakeFabricClothDraft,
  UserBakedAsset,
  UserBakedAssetResolver,
} from '@/scene/user-baked-asset';
import type { BookMaterialTintPart } from '@/scene/book-material-tints';
import type {
  AssetImageSurfaceId,
  ImageSurfaceSettings,
} from '@/scene/image-surface';
import { resolveBuiltinMaterialPreset } from '@/data/material-presets';
import { cloneAssetMaterials, type MaterialPresetResolver } from '@/scene/material-types';
import { applyAtmosphereSnapshot as applyAtmosphereSnapshotToApi } from '@/scene/atmosphere-snapshot';
import type { CaptureViewportImageOptions } from '@/scene/export-image';
import type { AtmosphereSnapshot } from '@/scene/environment-preset-types';
import { clampSizeScale } from '@/scene/asset-sizing';
import {
  clonePhysicsSettings,
  defaultPhysicsSettings,
  mergePhysicsSettings,
  type PhysicsSettings,
} from '@/scene/physics-settings';
import type {
  KindParamFamily,
  KindParamsByFamily,
} from '@/scene/kind-param-families';
import { EntityRegistry } from './entity-registry';
import { AssetSystem } from './asset-system';
import { ImageTextureLoader } from './image-texture-loader';
import { GizmoController } from './gizmo-controller';
import {
  TrianglePatchGizmoController,
} from './triangle-patch-gizmo-controller';
import { SelectionController } from './selection-controller';
import { SelectionHighlight } from './selection-highlight';
import { ViewportInputController } from './viewport-input-controller';
import { isStudioLightId } from '@/scene/light-ids';
import { LightingSystem } from './lighting/lighting-system';
import { ViewportInvalidation } from './viewport-invalidation';
import { captureViewportImageFromEngine } from './mockup-engine-capture';
import { ViewportHelpersSystem } from './viewport-helpers/viewport-helpers-system';

const GROUND_PHYSICS_ID = 'ground';

export class MockupEngine implements SceneApi {
  private readonly resizeObserver: ResizeObserver;
  private readonly patchGizmo: TrianglePatchGizmoController;
  private readonly viewportInvalidation: ViewportInvalidation;
  private readonly listeners = new Set<SceneApiListener>();

  private appMode: AppMode = 'select';
  private cameraSlots: [CameraSlot, CameraSlot, CameraSlot] = [null, null, null];
  private disposed = false;
  private lastTime = performance.now();
  private scaleDragBase = 1;
  private scaleCommitPending = false;
  private physicsSettings: PhysicsSettings = defaultPhysicsSettings();
  private readonly fabricClothActivePinCorner = new Map<string, number>();

  private constructor(
    private readonly container: HTMLElement,
    private readonly renderer: WebGPURenderer,
    private readonly cameras: CameraController,
    private readonly scene: Scene,
    private readonly skybox: Skybox,
    private readonly environment: EnvironmentSystem,
    private readonly lighting: LightingSystem,
    private readonly physics: PhysicsWorld,
    private readonly rigidPrimitivePhysics: RigidPrimitivePhysicsColliders,
    private readonly fabricClothSimulation: FabricClothSimulationParticipant,
    private readonly rigidTest: PhysicsRigidTestController,
    private readonly worldPhysics: WorldPhysicsSessionController,
    private readonly ground: Mesh,
    private readonly groundMaterial: GroundMaterial,
    private readonly registry: EntityRegistry,
    private readonly textureLoader: ImageTextureLoader,
    private readonly assets: AssetSystem,
    private readonly gizmo: GizmoController,
    private readonly selection: SelectionController,
    private readonly selectionHighlight: SelectionHighlight,
    private readonly viewportInput: ViewportInputController,
    private readonly viewportPipeline: ViewportRenderPipeline,
    private readonly viewportHelpers: ViewportHelpersSystem,
  ) {
    this.patchGizmo = new TrianglePatchGizmoController(scene, registry);
    this.viewportInvalidation = new ViewportInvalidation(renderer, (time) => { this.onFrame(time); },
    );
    this.assets.setViewportInvalidation(this.viewportInvalidation);
    this.assets.setRigidPrimitivePhysicsColliders(this.rigidPrimitivePhysics);
    this.assets.setFabricClothSimulationParticipant(this.fabricClothSimulation);
    this.environment.setViewportInvalidation(this.viewportInvalidation);

    this.patchGizmo.setPatchChangeListener((entityId) => {
      void this.assets.rebuildEntity(entityId);
      this.invalidateViewport();
      this.emit();
    });

    this.gizmo.setCallbacks({
      onTransform: () => {
        const selectedLightId = this.lighting.getSelectedLightId();
        if (selectedLightId) {
          this.lighting.syncOffsetFromHelper(selectedLightId);
          this.lighting.updateFrame();
          this.emit();
          return;
        }

        const attached = this.gizmo.getAttachedObject();
        if (attached && this.handleFabricClothPinTransform(attached)) {
          return;
        }

        if (this.patchGizmo.getActiveTarget()) {
          const mode = this.appMode === 'rotate' ? 'rotate' : 'translate';
          const handled = this.patchGizmo.applyHandleTransform(mode);
          if (handled) {
            this.emit();
            this.invalidateViewport();
            return;
          }
        }

        const selected = this.registry.getSelectedRuntime();
        if (!selected) {return;}

        if (this.appMode === 'scale') {
          this.gizmo.enforceUniformScale();
          this.scaleCommitPending = true;
          return;
        }

        this.registry.syncTransformFromObject(selected.entity.id);
        this.syncRigidPrimitivePoseFromRuntimeIfFixed(selected.entity.id);
        this.emit();
      },
      onDraggingChanged: (dragging) => {
        this.cameras.setOrbitEnabled(!dragging);
        this.viewportInvalidation.setContinuous(
          dragging || this.cameras.isInteracting(),
        );

        if (this.appMode !== 'scale') {return;}

        const selected = this.registry.getSelectedRuntime();
        if (!selected) {return;}

        if (dragging) {
          this.scaleDragBase = selected.entity.sizeScale;
          selected.object.scale.set(1, 1, 1);
          this.scaleCommitPending = false;
          return;
        }

        if (!this.scaleCommitPending) {return;}

        const uniform =
          (selected.object.scale.x + selected.object.scale.y + selected.object.scale.z) / 3;
        selected.object.scale.set(1, 1, 1);
        const entityId = selected.entity.id;
        if (isRigidPrimitiveAssetKind(selected.entity.assetKind)) {
          this.applyAssetMutation(
            () => this.assets.applyRigidPrimitiveUniformScale(entityId, uniform),
            { refreshGizmo: true },
          );
        } else {
          const nextScale = clampSizeScale(this.scaleDragBase * uniform);
          this.applyAssetMutation(() =>
            this.assets.setAssetSizeScale(entityId, nextScale),
          );
        }
        this.scaleCommitPending = false;
      },
    });

    scene.add(gizmo.getHelper());
    this.applyGizmoMode(this.appMode);

    registry.subscribeEntities(() => { this.notifySceneApiListeners(); });
    registry.subscribeSelection(() => { this.notifySceneApiListeners(); });
    lighting.subscribeSelection(() => { this.notifySceneApiListeners(); });
    this.cameras.setChangeListener(() => { this.emit(); });
    this.cameras.setViewportActivityListener(() => {
      this.invalidateViewport();
    });

    this.cameras.attach(renderer.domElement);

    this.resizeObserver = new ResizeObserver(() => { this.handleResize(); });
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

    const skybox = new Skybox();
    const registry = new EntityRegistry();
    const rigidPrimitivePhysics = new RigidPrimitivePhysicsColliders(physics, registry);
    const textureLoader = new ImageTextureLoader();
    textureLoader.setMaxAnisotropy(renderer.getMaxAnisotropy());
    const assets = new AssetSystem(scene, registry, textureLoader);
    const fabricClothSimulation = new FabricClothSimulationParticipant(registry, scene);
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

    const rigidTest = new PhysicsRigidTestController(
      scene,
      physics,
      cameras,
      assets.getMaterialResolver(),
    );

    const worldPhysics = new WorldPhysicsSessionController({
      registry,
      rigidPrimitivePhysics,
      dynamicParticipants: [rigidPrimitivePhysics, fabricClothSimulation],
    });

    const lightingSystem = new LightingSystem(scene, registry, SCENE_DEFAULTS.lighting);
    lightingSystem.setPlanarReflection(groundMaterial.getPlanarReflection());
    cameras.camera.layers.enable(FIXTURE_DISC_LAYER);

    const viewportHelpersSystem = new ViewportHelpersSystem(scene);
    viewportHelpersSystem.apply(SCENE_DEFAULTS.viewportHelpers);
    lightingSystem.setLightHandlesVisible(SCENE_DEFAULTS.viewportHelpers.lightHandles);

    const gizmo = new GizmoController(cameras.camera, renderer.domElement);
    const selection = new SelectionController(renderer.domElement, registry);
    const selectionHighlight = new SelectionHighlight(registry, lightingSystem);

    const engine = new MockupEngine(
      container,
      renderer,
      cameras,
      scene,
      skybox,
      environmentSystem,
      lightingSystem,
      physics,
      rigidPrimitivePhysics,
      fabricClothSimulation,
      rigidTest,
      worldPhysics,
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
        gizmo,
      ),
      viewportPipeline,
      viewportHelpersSystem,
    );

    selection.setCameraProvider(() => cameras.camera);
    selection.setLightPickablesProvider(() => lightingSystem.getPickables());
    selection.setPatchPickablesProvider(
      () => engine.patchGizmo.getPickables(),
      (handleMesh) => {
        const target = engine.patchGizmo.selectHandleByMesh(handleMesh as Mesh);
        if (target) {
          engine.applyGizmoMode(engine.appMode);
          engine.emit();
          return true;
        }
        return false;
      },
    );
    selection.setPatchLengthDragHandlers({
      begin: (ray) => engine.patchGizmo.beginLengthDrag(ray),
      update: (ray) => { engine.patchGizmo.updateLengthDrag(ray); },
      end: () => { engine.patchGizmo.endLengthDrag(); },
    });
    selection.setSelectHandler((entityId) => { engine.handleSelect(entityId); });
    selection.setDeleteHandler(() => {
      const selectedAssetId = registry.getSelectedEntityId();
      if (!selectedAssetId) {return;}
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

  setUserBakedAssetResolver(resolver: UserBakedAssetResolver | null): void {
    this.assets.setUserBakedAssetResolver(resolver);
  }

  canBakeSelectedEntity(): boolean {
    const entityId = this.registry.getSelectedEntityId();
    if (!entityId) {return false;}
    const runtime = this.registry.getRuntime(entityId);
    if (!runtime) {return false;}
    return canBakeEntity(runtime.entity, this.worldPhysics.getPhase(), {
      hasFabricClothSession: this.fabricClothSimulation.hasBinding(entityId),
    });
  }

  buildBakeFabricClothDraft(entityId: string): BakeFabricClothDraft | null {
    const runtime = this.registry.getRuntime(entityId);
    if (
      !runtime ||
      !canBakeEntity(runtime.entity, this.worldPhysics.getPhase(), {
        hasFabricClothSession: this.fabricClothSimulation.hasBinding(entityId),
      })
    ) {
      return null;
    }
    const binding = this.fabricClothSimulation.getBindingForBake(entityId);
    if (!binding) {return null;}
    const clothMesh = binding.clothMesh;

    const definition = getAssetKindDefinition(runtime.entity.assetKind);
    const materials = cloneAssetMaterials(
      runtime.entity.materials ?? definition.getDefaultMaterials(),
    );
    const fabricClothParams = cloneFabricClothParams(
      runtime.entity.fabricClothParams ?? defaultFabricClothParams(),
    );
    const sourceSegments = readFabricClothPlaneSegments(clothMesh);

    return {
      mesh: bakeFabricClothMeshFromVerletBinding(binding, runtime.object),
      sourceSegmentsW: sourceSegments.segmentsW,
      sourceSegmentsH: sourceSegments.segmentsH,
      defaults: {
        screenImageId: runtime.entity.screenImageId,
        materials,
        fabricClothParams,
      },
    };
  }

  addAssetFromUserBaked(
    userAsset: UserBakedAsset,
    spawn?: { x: number; z: number },
  ): string {
    const entityId = this.assets.addAssetFromUserBaked(userAsset, spawn);
    this.selectEntity(entityId);
    this.emit();
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
    this.syncRigidPrimitivePoseFromRuntimeIfFixed(entityId);
    this.invalidateViewport();
    this.notifySceneApiListeners();
  }

  setAssetImage(entityId: string, imageId: string | null): void {
    this.applyAssetMutation(
      () => this.assets.setAssetImage(entityId, imageId),
      { refreshGizmo: true },
    );
  }

  releaseImageTexture(imageId: string): void {
    this.textureLoader.release(imageId);
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

  setKindParams<F extends KindParamFamily>(
    family: F,
    entityId: string,
    partial: Partial<KindParamsByFamily[F]>,
  ): void {
    this.applyAssetMutation(async () => {
      switch (family) {
        case 'print':
          await this.assets.setPrintParams(entityId, partial);
          return;
        case 'fabricCloth':
          await this.assets.setFabricClothParams(entityId, partial);
          return;
        default:
          await this.assets.setKindParams(family, entityId, partial);
          if (family === 'trianglePatch') {
            this.patchGizmo.syncHelpersFromEntity();
          }
      }
    });
  }

  setPhysicsBodyMode(entityId: string, mode: PhysicsBodyMode): void {
    this.applyAssetMutation(() => {
      this.assets.setPhysicsBodyMode(entityId, mode);
    });
  }

  setPhysicsDensityKgPerM3(entityId: string, densityKgPerM3: number): void {
    this.applyAssetMutation(() => {
      this.assets.setPhysicsDensityKgPerM3(entityId, densityKgPerM3);
    });
  }

  setFabricClothActivePinCorner(entityId: string, cornerIndex: number): void {
    const runtime = this.registry.getRuntime(entityId);
    if (!runtime || !isFabricClothAssetKind(runtime.entity.assetKind)) {return;}
    const count =
      runtime.entity.fabricClothParams?.sim.pinnedCornersCount ?? 0;
    if (count <= 0) {return;}
    const clamped = Math.max(0, Math.min(3, Math.floor(cornerIndex)));
    if (clamped >= count) {return;}
    this.fabricClothActivePinCorner.set(entityId, clamped);
    this.applyGizmoMode(this.appMode);
    this.emit();
  }

  getFabricClothActivePinCorner(entityId: string): number {
    return this.fabricClothActivePinCorner.get(entityId) ?? 0;
  }

  setBookBackCoverImageId(entityId: string, imageId: string | null): void {
    this.applyAssetMutation(() =>
      this.assets.setBookBackCoverImageId(entityId, imageId),
    );
  }

  setBookSpineImageId(entityId: string, imageId: string | null): void {
    this.applyAssetMutation(() => this.assets.setBookSpineImageId(entityId, imageId));
  }

  setBookMaterialTint(
    entityId: string,
    part: BookMaterialTintPart,
    tint: Rgb,
  ): void {
    this.applyAssetMutation(() =>
      this.assets.setBookMaterialTint(entityId, part, tint),
    );
  }

  selectPatchHandle(entityId: string, nodeIndex: number, targetKey: PatchHandleTarget): void {
    this.patchGizmo.setActiveEntity(entityId);
    this.patchGizmo.selectTarget({ entityId, nodeIndex, targetKey });
    this.applyGizmoMode(this.appMode);
    this.emit();
    this.invalidateViewport();
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

  getPhysicsSettings(): PhysicsSettings {
    return {
      ...clonePhysicsSettings(this.physicsSettings),
      rigidTestPhase: this.rigidTest.getPhase(),
      worldPhysicsPhase: this.worldPhysics.getPhase(),
      worldPhysicsHasSnapshot: this.worldPhysics.hasSnapshot(),
    };
  }

  setPhysicsSettings(partial: Partial<PhysicsSettings>): void {
    const rest = { ...partial };
    delete rest.rigidTestPhase;
    delete rest.worldPhysicsPhase;
    delete rest.worldPhysicsHasSnapshot;
    delete rest.lastFabricClothBakeSummary;
    this.physicsSettings = mergePhysicsSettings(this.physicsSettings, rest);
    this.physics.setGravityScale(this.physicsSettings.gravityScale);
    this.notifySceneApiListeners();
  }

  startPhysicsRigidTest(): void {
    this.rigidTest.start();
    this.emit();
  }

  stopPhysicsRigidTest(): void {
    this.rigidTest.stop();
    this.emit();
  }

  startWorldPhysics(): void {
    this.worldPhysics.start();
    this.emit();
  }

  toggleWorldPhysicsPause(): void {
    this.worldPhysics.togglePause();
    this.emit();
  }

  resetWorldPhysics(): void {
    this.worldPhysics.reset();
    this.invalidateViewport();
    this.emit();
  }

  applyEnvironment(state: EnvironmentState): void {
    this.environment.apply(state);
    this.invalidateViewport();
  }

  setEnvironment(partial: Partial<EnvironmentState>): void {
    this.environment.setEnvironment(partial);
    this.invalidateViewport();
  }

  applyAtmosphereSnapshot(snapshot: AtmosphereSnapshot): void {
    this.commitVisualState(() => {
      applyAtmosphereSnapshotToApi(this, snapshot);
    });
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
    this.lighting.syncFixtureMirrorReflection();
    this.invalidateViewport();
  }

  applyViewportHelpers(state: ViewportHelpersState): void {
    this.viewportHelpers.apply(state);
    this.lighting.setLightHandlesVisible(state.lightHandles);
    this.invalidateViewport();
  }

  setViewportHelpers(partial: Partial<ViewportHelpersState>): void {
    this.viewportHelpers.setPartial(partial);
    if (partial.lightHandles !== undefined) {
      this.lighting.setLightHandlesVisible(partial.lightHandles);
    }
    this.invalidateViewport();
  }

  getViewportHelpers(): ViewportHelpersState {
    return this.viewportHelpers.getState();
  }

  loadBuiltinView(id: BuiltinCameraViewId): void {
    if (id === 'normal') {
      this.cameras.resetToNormal(SCENE_DEFAULTS.camera.normalView);
      this.emit();
      return;
    }

    const definition = getBuiltinCameraView(id);
    if (!definition) {return;}

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
      name: this.cameraSlots[slotIndex]?.name?.trim() ?? `Slot ${index}`,
    };
    this.emit();
  }

  loadSlot(index: CameraSlotIndex): void {
    const slot = this.cameraSlots[index - 1];
    if (!slot) {return;}

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
    if (!slot) {return;}

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
    return captureViewportImageFromEngine(
      {
        renderer: this.renderer,
        cameras: this.cameras,
        gizmo: this.gizmo,
        environment: this.environment,
        lighting: this.lighting,
        updateViewportHelpersFrame: () => { this.viewportHelpers.updateFrame(this.lighting); },
        pushExportHidePhysicsTest: () => { this.rigidTest.pushExportHide(); },
        popExportHidePhysicsTest: () => { this.rigidTest.popExportHide(); },
        pushExportShadowQuality: () => { this.lighting.pushExportShadowQuality(); },
        popExportShadowQuality: () => { this.lighting.popExportShadowQuality(); },
        renderViewportFrame: (overrides) => { this.renderViewportFrame(overrides); },
      },
      options,
    );
  }

  dispose(): void {
    if (this.disposed) {return;}
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
    void this.renderer.dispose();

    this.rigidTest.dispose();
    this.fabricClothSimulation.dispose();
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
      this.patchGizmo.setActiveEntity(entityId);
      if (entityId) {
        this.clampFabricClothActivePinForEntity(entityId);
      }
      this.applyGizmoMode(this.appMode);
    });
  }

  private clampFabricClothActivePinForEntity(entityId: string): void {
    const runtime = this.registry.getRuntime(entityId);
    if (!runtime || !isFabricClothAssetKind(runtime.entity.assetKind)) {return;}
    const count =
      runtime.entity.fabricClothParams?.sim.pinnedCornersCount ?? 0;
    if (count <= 0) {
      this.fabricClothActivePinCorner.delete(entityId);
      return;
    }
    const current = this.getFabricClothActivePinCorner(entityId);
    this.fabricClothActivePinCorner.set(
      entityId,
      Math.min(current, count - 1),
    );
  }

  private handleFabricClothPinTransform(attached: Object3D): boolean {
    const entityId = fabricClothPinEntityId(attached);
    const cornerIndex = fabricClothPinCornerIndex(attached);
    if (entityId === null || cornerIndex === null) {return false;}

    const phase = this.worldPhysics.getPhase();
    if (phase === 'simulating') {
      this.fabricClothSimulation.applyPinDrag(entityId, cornerIndex, attached);
    } else if (phase === 'paused') {
      this.fabricClothSimulation.previewPinDragWhenPaused(
        entityId,
        cornerIndex,
        attached,
      );
    } else {
      return false;
    }
    this.invalidateViewport();
    return true;
  }

  private applyGizmoMode(mode: AppMode): void {
    const selectedLightId = this.lighting.getSelectedLightId();
    const selectedAsset = this.registry.getSelectedRuntime();
    const selectedAssetObject =
      selectedAsset?.entity.visible !== false ? selectedAsset?.object ?? null : null;
    const activePatchHandle = this.patchGizmo.getActiveHandleMesh();
    const gizmoTarget =
      activePatchHandle ??
      ((selectedLightId ? this.lighting.getHelperObject(selectedLightId) : null) ??
      selectedAssetObject);

    const worldPhase = this.worldPhysics.getPhase();
    const clothSimLocked =
      selectedAsset != null &&
      isFabricClothAssetKind(selectedAsset.entity.assetKind) &&
      (worldPhase === 'simulating' || worldPhase === 'paused');

    if (clothSimLocked) {
      const pinned =
        selectedAsset.entity.fabricClothParams?.sim.pinnedCornersCount ?? 0;
      if (
        mode === 'translate' &&
        pinned > 0 &&
        this.fabricClothSimulation.hasBinding(selectedAsset.entity.id)
      ) {
        const corner = this.getFabricClothActivePinCorner(selectedAsset.entity.id);
        const activeCorner = Math.min(corner, pinned - 1);
        const pinMesh = this.fabricClothSimulation.getPinMesh(
          selectedAsset.entity.id,
          activeCorner,
        );
        if (pinMesh) {
          this.gizmo.setTransformMode('translate');
          this.gizmo.attach(pinMesh);
          this.gizmo.setEnabled(true);
          return;
        }
      }
      this.gizmo.setEnabled(false);
      this.gizmo.attach(null);
      return;
    }

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

  private syncRigidPrimitivePoseFromRuntimeIfFixed(entityId: string): void {
    const runtime = this.registry.getRuntime(entityId);
    if (!runtime || !isRigidPrimitiveAssetKind(runtime.entity.assetKind)) {return;}
    if (resolvePhysicsBodyMode(runtime.entity) !== 'fixed') {return;}
    this.rigidPrimitivePhysics.syncPoseFromRuntime(entityId);
  }

  private applyAssetMutation(
    mutation: () => void | Promise<void>,
    options?: { refreshGizmo?: boolean },
  ): void {
    void (async () => {
      try {
        await mutation();
      } catch (error: unknown) {
        console.error('Asset mutation failed', error);
      }
      if (options?.refreshGizmo) {
        this.applyGizmoMode(this.appMode);
      }
      this.emit();
    })();
  }

  private notifySceneApiListeners(): void {
    this.listeners.forEach((listener) => { listener(); });
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
    if (this.disposed) {return;}

    const needsPhysics = this.physics.needsSimulationStep();
    const worldSimulating = this.worldPhysics.getPhase() === 'simulating';
    const continuous =
      this.cameras.isInteracting() ||
      this.gizmo.isDragging() ||
      needsPhysics ||
      worldSimulating;
    this.viewportInvalidation.setContinuous(continuous);

    const deltaSeconds = Math.min((time - this.lastTime) / 1000, 0.1);
    this.lastTime = time;

    if (needsPhysics) {
      this.physics.step(deltaSeconds);
      const rigidBindings = this.rigidTest.getActiveBindings();
      if (rigidBindings.length > 0) {
        syncPhysicsBindings(rigidBindings);
      }
    }

    if (worldSimulating) {
      this.worldPhysics.tick(deltaSeconds);
    }

    const camera = this.cameras.camera;
    this.gizmo.updateCamera(camera);
    this.environment.updateFrame(camera);
    this.lighting.updateFrame();
    this.viewportHelpers.updateFrame(this.lighting);

    this.renderViewportFrame();

    if (needsPhysics && !continuous) {
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
    if (w === 0 || h === 0) {return;}

    this.cameras.handleResize(w, h);
    this.renderer.setSize(w, h);
    this.viewportPipeline.setSize(w, h);
    if (this.groundMaterial.isMirrorEnabled()) {
      this.groundMaterial.getPlanarReflection().updateResolution(this.renderer);
    }
    this.invalidateViewport();
  }
}
