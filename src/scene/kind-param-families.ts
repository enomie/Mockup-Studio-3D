import type { AssetKind } from './asset-kind';
import { isBeverageCanAssetKind, type BeverageCanParams } from './asset-beverage-can';
import { isBlockAssetKind, type BlockParams } from './asset-block';
import { isBookAssetKind, type BookParams } from './asset-book';
import { isCylinderAssetKind, type CylinderParams } from './asset-cylinder';
import { isPrintAssetKind } from './asset-faces';
import { isFabricClothFamilyAssetKind, type FabricClothParams } from './asset-fabric-cloth';
import { isHandheldAssetKind, type HandheldDeviceParams } from './asset-handheld';
import { isMonitorAssetKind, type MonitorDeviceParams } from './asset-monitor';
import { isPenAssetKind, type PenParams } from './asset-pen';
import type { PrintDeviceParams } from './asset-print';
import { isSphereAssetKind, type SphereParams } from './asset-sphere';
import { isTinCanAssetKind, type TinCanParams } from './asset-tin-can';
import { isPatchAssetKind, type PatchParams } from './asset-triangle-patch';
import { isWallAssetKind, type WallParams } from './asset-wall';
import { isWheelCarAssetKind, type WheelCarParams } from './asset-wheel-car';
import { isWineBottleAssetKind, type WineBottleParams } from './asset-wine-bottle';

/** Param type for each family of asset kinds that shares one params shape. */
export interface KindParamsByFamily {
  print: PrintDeviceParams;
  handheld: HandheldDeviceParams;
  monitor: MonitorDeviceParams;
  wall: WallParams;
  block: BlockParams;
  cylinder: CylinderParams;
  sphere: SphereParams;
  wheelCar: WheelCarParams;
  fabricCloth: FabricClothParams;
  book: BookParams;
  beverageCan: BeverageCanParams;
  tinCan: TinCanParams;
  wineBottle: WineBottleParams;
  pen: PenParams;
  patch: PatchParams;
}

export type KindParamFamily = keyof KindParamsByFamily;

/** Families whose param patches only need a merge plus a rebuild. */
export type RebuildOnlyKindParamFamily = Exclude<KindParamFamily, 'print' | 'fabricCloth'>;

/** Asset kinds that accept param patches of the given family. */
export const KIND_PARAM_FAMILY_GUARDS: Record<KindParamFamily, (kind: AssetKind) => boolean> = {
  print: isPrintAssetKind,
  handheld: isHandheldAssetKind,
  monitor: isMonitorAssetKind,
  wall: isWallAssetKind,
  block: isBlockAssetKind,
  cylinder: isCylinderAssetKind,
  sphere: isSphereAssetKind,
  wheelCar: isWheelCarAssetKind,
  fabricCloth: isFabricClothFamilyAssetKind,
  book: isBookAssetKind,
  beverageCan: isBeverageCanAssetKind,
  tinCan: isTinCanAssetKind,
  wineBottle: isWineBottleAssetKind,
  pen: isPenAssetKind,
  patch: isPatchAssetKind,
};

export function kindAcceptsParamFamily(kind: AssetKind, family: KindParamFamily): boolean {
  return KIND_PARAM_FAMILY_GUARDS[family](kind);
}
