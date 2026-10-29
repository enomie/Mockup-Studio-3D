import { isRigidPrimitiveAssetKind } from '@/scene/rigid-primitive-asset';
import { isWallAssetKind } from '@/scene/asset-wall';
import type { AssetEntity } from '@/scene/entity-types';
import {
  formatLengthMeters,
  LENGTH_DECIMALS,
  parseLengthMetersInput,
} from '@/units/length';
import { PanelAxisField } from '@/ui/components/PanelAxisField/PanelAxisField';
import { SubPanelSection } from '@/ui/components/SubPanelSection';
import { setEntityTransform } from '@/ui/store/app-store';
import { AssetDimensionsFields } from './EntityDimensionsSection';
import { formatDegrees, parseDegreesInput } from './field-input-helpers';

export interface EntityTransformSectionProps {
  entity: AssetEntity;
  faceSize: { width: number; height: number };
  aspect: number;
}

export function EntityTransformSection({
  entity,
  faceSize,
  aspect,
}: EntityTransformSectionProps) {
  const updatePosition = (axis: 'x' | 'y' | 'z', value: number): void => {
    setEntityTransform(entity.id, {
      position: { ...entity.transform.position, [axis]: value },
    });
  };

  const updateRotation = (axis: 'x' | 'y' | 'z', value: number): void => {
    setEntityTransform(entity.id, {
      rotation: { ...entity.transform.rotation, [axis]: value },
    });
  };

  return (
    <SubPanelSection title="Transform">
      {!isWallAssetKind(entity.assetKind) && !isRigidPrimitiveAssetKind(entity.assetKind) ? (
        <AssetDimensionsFields entity={entity} faceSize={faceSize} aspect={aspect} />
      ) : null}
      <PanelAxisField
        label="Pos X"
        unit="m"
        value={entity.transform.position.x}
        format={(value) => formatLengthMeters(value, LENGTH_DECIMALS)}
        parse={parseLengthMetersInput}
        onChange={(value) => { updatePosition('x', value); }}
      />
      <PanelAxisField
        label="Pos Y"
        unit="m"
        value={entity.transform.position.y}
        format={(value) => formatLengthMeters(value, LENGTH_DECIMALS)}
        parse={parseLengthMetersInput}
        onChange={(value) => { updatePosition('y', value); }}
      />
      <PanelAxisField
        label="Pos Z"
        unit="m"
        value={entity.transform.position.z}
        format={(value) => formatLengthMeters(value, LENGTH_DECIMALS)}
        parse={parseLengthMetersInput}
        onChange={(value) => { updatePosition('z', value); }}
      />
      <PanelAxisField
        label="Rot X"
        unit="°"
        value={entity.transform.rotation.x}
        format={formatDegrees}
        parse={parseDegreesInput}
        onChange={(value) => { updateRotation('x', value); }}
      />
      <PanelAxisField
        label="Rot Y"
        unit="°"
        value={entity.transform.rotation.y}
        format={formatDegrees}
        parse={parseDegreesInput}
        onChange={(value) => { updateRotation('y', value); }}
      />
      <PanelAxisField
        label="Rot Z"
        unit="°"
        value={entity.transform.rotation.z}
        format={formatDegrees}
        parse={parseDegreesInput}
        onChange={(value) => { updateRotation('z', value); }}
      />
    </SubPanelSection>
  );
}
