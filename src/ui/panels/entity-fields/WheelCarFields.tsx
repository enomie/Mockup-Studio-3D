import { wheelCarDimensionsM } from '@/scene/asset-wheel-car';
import {
  MATERIAL_CHROME_ID,
  MATERIAL_PLASTIC_MATTE_ID,
} from '@/scene/material-ids';
import { SubPanelSection } from '@/ui/components/SubPanelSection';
import { useAppStore } from '@/ui/store/use-app-store';
import { MaterialSelect } from '@/ui/panels/MaterialSelect';
import { AssetDimensionsFields } from './EntityDimensionsSection';
import { RigidBodyPhysicsFields } from './RigidBodyPhysicsFields';
import type { WheelCarFieldsProps } from './entity-fields-types';

export function WheelCarFields({ entity }: WheelCarFieldsProps) {
  const materials = useAppStore((s) => s.materials);
  const slots = entity.materials;
  // Wheel size comes from the profile SVG × sizeScale (same as the other lathe assets).
  const diameterM = wheelCarDimensionsM(entity.sizeScale).outerRadiusM * 2;
  const faceSize = { width: diameterM, height: diameterM };
  return (
    <>
      <SubPanelSection title="Materials">
        <MaterialSelect
          entityId={entity.id}
          slot="tireMaterialId"
          label="Tire"
          materials={materials}
          value={slots?.tireMaterialId ?? MATERIAL_PLASTIC_MATTE_ID}
        />
        <MaterialSelect
          entityId={entity.id}
          slot="rimMaterialId"
          label="Rim"
          materials={materials}
          value={slots?.rimMaterialId ?? MATERIAL_CHROME_ID}
        />
      </SubPanelSection>

      <RigidBodyPhysicsFields entity={entity} />

      <SubPanelSection title="Dimensions">
        <AssetDimensionsFields entity={entity} faceSize={faceSize} aspect={1} />
      </SubPanelSection>
    </>
  );
}
