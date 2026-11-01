import {
  cloneFabricClothBakedMeshPayload,
  fabricClothBakedMeshTopology,
  type UserBakedAsset,
} from '@/scene/user-baked-asset';
import * as store from './app-store-internals';

function nextBakedClothName(): string {
  const count = store.state.userBakedAssets.length + 1;
  return `Fabric cloth (baked) ${count}`;
}

export function canBakeSelectedEntity(): boolean {
  return store.sceneApi?.canBakeSelectedEntity() ?? false;
}

export function bakeSelectedToUserAsset(): string | null {
  const entityId = store.state.selectedEntityId;
  if (!entityId || !store.sceneApi) {return null;}

  const draft = store.sceneApi.buildBakeFabricClothDraft(entityId);
  if (!draft) {return null;}

  const id = `user-baked-${crypto.randomUUID()}`;
  const entry: UserBakedAsset = {
    id,
    source: 'user',
    name: nextBakedClothName(),
    bakedFromKind: 'fabric-cloth',
    placementKind: 'fabric-cloth-baked',
    defaults: {
      screenImageId: draft.defaults.screenImageId,
      materials: { ...draft.defaults.materials },
      fabricClothParams: { ...draft.defaults.fabricClothParams },
    },
    mesh: cloneFabricClothBakedMeshPayload(draft.mesh),
  };

  const topology = fabricClothBakedMeshTopology(draft.mesh);

  store.setAppState({
    ...store.state,
    userBakedAssets: [...store.state.userBakedAssets, entry],
    physics: {
      ...store.state.physics,
      lastFabricClothBakeSummary: {
        assetName: entry.name,
        sourceSegmentsW: draft.sourceSegmentsW,
        sourceSegmentsH: draft.sourceSegmentsH,
        bakedSegmentsW: topology.segmentsW,
        bakedSegmentsH: topology.segmentsH,
        triangleCount: topology.triangleCount,
      },
    },
  });
  store.emit();
  return id;
}

export function addAssetFromUserBaked(userBakedAssetId: string): void {
  const userAsset = store.state.userBakedAssets.find((a) => a.id === userBakedAssetId);
  if (!userAsset || !store.sceneApi) {return;}
  store.sceneApi.addAssetFromUserBaked(userAsset);
  store.syncEngineStateFromEngine();
}

export function removeUserBakedAsset(userBakedAssetId: string): boolean {
  const exists = store.state.userBakedAssets.some((a) => a.id === userBakedAssetId);
  if (!exists) {return false;}

  const inUse = store.state.entities.some(
    (entity) => entity.userBakedAssetId === userBakedAssetId,
  );
  if (inUse) {return false;}

  store.setAppState({
    ...store.state,
    userBakedAssets: store.state.userBakedAssets.filter((a) => a.id !== userBakedAssetId),
  });
  store.emit();
  return true;
}
