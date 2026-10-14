import {
  clampPhysicsDensityKgPerM3,
  resolvePhysicsBodyMode,
  resolvePhysicsDensityKgPerM3,
  rigidMassKgFromEntity,
} from '@/scene/physics-rigid-body';
import type { AssetEntity } from '@/scene/entity-types';
import { noop } from '@/utils/noop';
import { PanelAxisField } from '@/ui/components/PanelAxisField/PanelAxisField';
import { PanelSelect } from '@/ui/components/PanelSelect';
import { SubPanelSection } from '@/ui/components/SubPanelSection';
import {
  setPhysicsBodyMode,
  setPhysicsDensityKgPerM3,
} from '@/ui/store/app-store';

function formatMassKg(value: number): string {
  if (value >= 100) {return value.toFixed(1);}
  if (value >= 10) {return value.toFixed(2);}
  return value.toFixed(3);
}

function parseDensityInput(raw: string): number | null {
  const trimmed = raw.trim();
  if (!trimmed) {return null;}
  const value = Number(trimmed);
  if (!Number.isFinite(value)) {return null;}
  return clampPhysicsDensityKgPerM3(value);
}

export interface RigidBodyPhysicsFieldsProps {
  entity: AssetEntity;
}

export function RigidBodyPhysicsFields({ entity }: RigidBodyPhysicsFieldsProps) {
  const bodyMode = resolvePhysicsBodyMode(entity);
  const densityKgPerM3 = resolvePhysicsDensityKgPerM3(entity);
  const massKg = rigidMassKgFromEntity(entity);

  return (
    <SubPanelSection title="Physics">
      <PanelSelect
        label="Body mode"
        value={bodyMode}
        options={[
          { value: 'dynamic', label: 'Dynamic' },
          { value: 'fixed', label: 'Fixed' },
        ]}
        onChange={(value) => {
          if (value === 'fixed' || value === 'dynamic') {
            setPhysicsBodyMode(entity.id, value);
          }
        }}
      />
      <PanelAxisField
        label="Density"
        unit="kg/m³"
        value={densityKgPerM3}
        format={(value) => String(Math.round(value))}
        parse={parseDensityInput}
        onChange={(value) => {
          setPhysicsDensityKgPerM3(entity.id, clampPhysicsDensityKgPerM3(value));
        }}
      />
      <PanelAxisField
        label="Weight"
        unit="kg"
        value={massKg}
        format={formatMassKg}
        parse={() => null}
        disabled
        onChange={noop}
      />
    </SubPanelSection>
  );
}
