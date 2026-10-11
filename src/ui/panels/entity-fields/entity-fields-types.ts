import type { ImageAsset } from '@/data/image-assets';
import type { AssetEntity } from '@/scene/entity-types';

export type EntityImageFieldsProps = {
  entity: AssetEntity;
  images: ImageAsset[];
  screenImageFieldId?: string;
};

export type PrintFieldsProps = {
  entity: AssetEntity;
  images: ImageAsset[];
  fieldIdPrefix?: string;
};

export type PictureFieldsProps = EntityImageFieldsProps;

export type WallFieldsProps = EntityImageFieldsProps;

export type BlockFieldsProps = {
  entity: AssetEntity;
};

export type HandheldFieldsProps = EntityImageFieldsProps;

export type MonitorFieldsProps = EntityImageFieldsProps;
