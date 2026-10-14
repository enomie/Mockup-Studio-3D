import {
  Book,
  Box,
  Circle,
  CircleDot,
  Cylinder,
  Database,
  Layers,
  BrickWall,
  DoorOpen,
  FileImage,
  Image,
  Monitor,
  Smartphone,
  Tablet,
  Wine,
  Pen,
  type LucideIcon,
} from 'lucide-react';
import type { AssetKind } from '@/scene/entity-types';

export type AssetCatalogCategory = 'print' | 'objects' | 'devices' | 'architecture';

export interface AssetCatalogEntry {
  kind: AssetKind;
  label: string;
  category: AssetCatalogCategory;
  icon: LucideIcon;
}

export const ASSET_CATALOG: AssetCatalogEntry[] = [
  { kind: 'print', label: 'Print', category: 'print', icon: FileImage },
  {
    kind: 'book-softcover',
    label: 'Book (softcover)',
    category: 'print',
    icon: Book,
  },
  {
    kind: 'book-hardcover',
    label: 'Book (hardcover)',
    category: 'print',
    icon: Book,
  },
  { kind: 'picture', label: 'Picture framed', category: 'objects', icon: Image },
  { kind: 'block', label: 'Block', category: 'objects', icon: Box },
  { kind: 'cylinder', label: 'Cylinder', category: 'objects', icon: Database },
  { kind: 'sphere', label: 'Sphere', category: 'objects', icon: Circle },
  { kind: 'wheel-car', label: 'Wheel Car', category: 'objects', icon: CircleDot },
  {
    kind: 'fabric-cloth',
    label: 'Fabric cloth',
    category: 'objects',
    icon: Layers,
  },
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
  { kind: 'pen', label: 'Pen', category: 'objects', icon: Pen },
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
