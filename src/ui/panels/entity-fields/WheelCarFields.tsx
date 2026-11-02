import {
  defaultWheelCarParams,
  resolveWheelCarProfile,
  wheelCarDimensionsM,
} from '@/scene/asset-wheel-car';
import { ProfilePickerSection } from '@/ui/panels/ProfilePickerSection';
import { setKindParams } from '@/ui/store/app-store';
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
  // Re-render on profile edits; the registry is kept in sync by the store.
  useAppStore((s) => s.userProfiles);
  const params = { ...defaultWheelCarParams(), ...entity.wheelCarParams };
  const profile = resolveWheelCarProfile(params.profileId).entry;
  const pathName = (slot: number, fallback: string) =>
    profile.paths.find((path) => path.slot === slot)?.name ?? fallback;
  // Wheel size comes from the profile × sizeScale (same as the other lathe assets).
  const diameterM = wheelCarDimensionsM(entity.sizeScale, params.profileId).outerRadiusM * 2;
  const faceSize = { width: diameterM, height: diameterM };
  return (
    <>
      <ProfilePickerSection
        title="Profile"
        profileId={params.profileId}
        resolve={resolveWheelCarProfile}
        missingHint="Profile missing or without a tire path – using Car wheel."
        onChange={(profileId) => { setKindParams('wheelCar', entity.id, { profileId }); }}
      />

      <SubPanelSection title="Materials">
        <MaterialSelect
          entityId={entity.id}
          slot="tireMaterialId"
          label={pathName(0, 'Tire')}
          materials={materials}
          value={slots?.tireMaterialId ?? MATERIAL_PLASTIC_MATTE_ID}
        />
        <MaterialSelect
          entityId={entity.id}
          slot="rimMaterialId"
          label={pathName(1, 'Rim')}
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
