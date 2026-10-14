import type { ImageAsset } from '@/data/image-assets';
import type { AssetEntity } from '@/scene/entity-types';

export interface EntityImageFieldsProps {
  entity: AssetEntity;
  images: ImageAsset[];
  screenImageFieldId?: string;
}

export interface PrintFieldsProps {
  entity: AssetEntity;
  images: ImageAsset[];
  fieldIdPrefix?: string;
}

export type PictureFieldsProps = EntityImageFieldsProps;

export type WallFieldsProps = EntityImageFieldsProps;

export interface BlockFieldsProps {
  entity: AssetEntity;
}

export interface CylinderFieldsProps {
  entity: AssetEntity;
}

export interface SphereFieldsProps {
  entity: AssetEntity;
}

export interface WheelCarFieldsProps {
  entity: AssetEntity;
}

export type HandheldFieldsProps = EntityImageFieldsProps;

export type MonitorFieldsProps = EntityImageFieldsProps;
