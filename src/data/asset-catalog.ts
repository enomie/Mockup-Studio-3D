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
  Triangle,
  Square,
  type LucideIcon,
} from 'lucide-react';
import type { AssetKind } from '@/scene/entity-types';

type AssetCatalogCategory = 'print' | 'objects' | 'devices' | 'architecture';

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
    label: 'Book Softcover',
    category: 'print',
    icon: Book,
  },
  {
    kind: 'book-hardcover',
    label: 'Book Hardcover',
    category: 'print',
    icon: Book,
  },
  { kind: 'picture', label: 'Picture Frame', category: 'print', icon: Image },
  { kind: 'block', label: 'Object Block', category: 'objects', icon: Box },
  { kind: 'triangle-patch', label: 'Patch Triangle', category: 'objects', icon: Triangle },
  { kind: 'quad-patch', label: 'Patch Quad', category: 'objects', icon: Square },
  { kind: 'cylinder', label: 'Object Cylinder', category: 'objects', icon: Database },
  { kind: 'sphere', label: 'Object Sphere', category: 'objects', icon: Circle },
  { kind: 'wheel-car', label: 'Wheel Car', category: 'objects', icon: CircleDot },
  {
    kind: 'fabric-cloth',
    label: 'Fabric cloth',
    category: 'objects',
    icon: Layers,
  },
  {
    kind: 'beverage-can',
    label: 'Can Beverage',
    category: 'objects',
    icon: Cylinder,
  },
  {
    kind: 'tin-can',
    label: 'Can Tin',
    category: 'objects',
    icon: Cylinder,
  },
  {
    kind: 'wine-bottle',
    label: 'Bottle Wine',
    category: 'objects',
    icon: Wine,
  },
  { kind: 'pen', label: 'Pen', category: 'objects', icon: Pen },
  { kind: 'smartphone', label: 'Device Smartphone', category: 'devices', icon: Smartphone },
  { kind: 'tablet', label: 'Device Tablet', category: 'devices', icon: Tablet },
  { kind: 'monitor', label: 'Device Desktop', category: 'devices', icon: Monitor },
  { kind: 'wall', label: 'Wall', category: 'architecture', icon: BrickWall },
  {
    kind: 'wall-door',
    label: 'Wall Doorway',
    category: 'architecture',
    icon: DoorOpen,
  },
];

export function assetKindLabel(kind: AssetKind): string {
  return ASSET_CATALOG.find((entry) => entry.kind === kind)?.label ?? kind;
}
