import {
  Box,
  Cylinder,
  BrickWall,
  DoorOpen,
  FileImage,
  Image,
  Monitor,
  Smartphone,
  Tablet,
  Wine,
  type LucideIcon,
} from 'lucide-react';
import type { AssetKind } from '@/scene/entity-types';

export type AssetCatalogCategory = 'print' | 'objects' | 'devices' | 'architecture';

export type AssetCatalogEntry = {
  kind: AssetKind;
  label: string;
  category: AssetCatalogCategory;
  icon: LucideIcon;
};

export const ASSET_CATALOG: AssetCatalogEntry[] = [
  { kind: 'print', label: 'Print', category: 'print', icon: FileImage },
  { kind: 'picture', label: 'Picture framed', category: 'objects', icon: Image },
  { kind: 'block', label: 'Block', category: 'objects', icon: Box },
  {
    kind: 'beverage-can',
    label: 'Beverage can',
    category: 'objects',
    icon: Cylinder,
  },
  {
    kind: 'tin-can',
    label: 'Tin can',
    category: 'objects',
    icon: Cylinder,
  },
  {
    kind: 'wine-bottle',
    label: 'Wine bottle',
    category: 'objects',
    icon: Wine,
  },
  { kind: 'smartphone', label: 'Smartphone', category: 'devices', icon: Smartphone },
  { kind: 'tablet', label: 'Tablet', category: 'devices', icon: Tablet },
  { kind: 'monitor', label: 'Monitor', category: 'devices', icon: Monitor },
  { kind: 'wall', label: 'Wall', category: 'architecture', icon: BrickWall },
  {
    kind: 'wall-door',
    label: 'Wall with Door',
    category: 'architecture',
    icon: DoorOpen,
  },
];

export function assetKindLabel(kind: AssetKind): string {
  return ASSET_CATALOG.find((entry) => entry.kind === kind)?.label ?? kind;
}
