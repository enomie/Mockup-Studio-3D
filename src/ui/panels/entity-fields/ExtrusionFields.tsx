import {
  defaultExtrusionParams,
  EXTRUSION_DEPTH_MAX_M,
  EXTRUSION_DEPTH_MIN_M,
  resolveExtrusionProfile,
} from '@/scene/asset-extrusion';
import { getGeometryPartsForKind } from '@/scene/asset-kind-registry';
import type { AssetEntity } from '@/scene/entity-types';
import { PanelAxisField } from '@/ui/components/PanelAxisField/PanelAxisField';
import { PanelSelect } from '@/ui/components/PanelSelect';
import { sampleProfilePathMm } from '@/engine/extrusion-geometry';
import { classifyExtrusionPaths } from '@/scene/profile-holes';
import { SubPanelSection } from '@/ui/components/SubPanelSection';
import { GeometryPartsSection } from '@/ui/panels/GeometryPartsSection';
import { ProfilePickerSection } from '@/ui/panels/ProfilePickerSection';
import { setKindParams } from '@/ui/store/app-store';
import { useAppStore } from '@/ui/store/use-app-store';
import { formatLengthMeters, parseLengthMetersInput } from '@/units/length';

function parseDepthMeters(raw: string): number | null {
  const meters = parseLengthMetersInput(raw);
  if (meters === null) {return null;}
  return meters >= EXTRUSION_DEPTH_MIN_M && meters <= EXTRUSION_DEPTH_MAX_M ? meters : null;
}

export function ExtrusionFields({ entity }: { entity: AssetEntity }) {
  const materials = useAppStore((s) => s.materials);
  // Re-render on profile edits; the registry is kept in sync by the store.
  useAppStore((s) => s.userProfiles);
  const params = { ...defaultExtrusionParams(), ...entity.extrusionParams };
  const { entry } = resolveExtrusionProfile(params.profileId);
  const roles = classifyExtrusionPaths(entry.paths, sampleProfilePathMm);
  const holes = entry.paths.filter((path) => roles.get(path.id)?.kind === 'hole');
  // Holes are no parts of their own: their wall material is chosen below.
  const slots = new Set(
    entry.paths.filter((path) => roles.get(path.id)?.kind !== 'hole').map((path) => path.slot),
  );
  const parts = getGeometryPartsForKind(entity.assetKind).filter(
    (part) => part.profileSlot !== undefined && slots.has(part.profileSlot),
  );

  return (
    <>
      <ProfilePickerSection
        title="Profile"
        profileId={params.profileId}
        resolve={resolveExtrusionProfile}
        missingHint="Profile missing – using Rounded rectangle."
        onChange={(profileId) => { setKindParams('extrusion', entity.id, { profileId }); }}
      />

      <SubPanelSection title="Extrusion">
        <PanelAxisField
          label="Depth"
          unit="m"
          value={params.depthM}
          format={(meters) => formatLengthMeters(meters)}
          parse={parseDepthMeters}
          onChange={(depthM) => { setKindParams('extrusion', entity.id, { depthM }); }}
        />
      </SubPanelSection>

      <SubPanelSection title="Geometries">
        <GeometryPartsSection
          entity={entity}
          materials={materials}
          parts={parts}
          profilePathName={(slot) => entry.paths.find((path) => path.slot === slot)?.name}
        />
      </SubPanelSection>

      {holes.length > 0 ? (
        <SubPanelSection title="Hole walls">
          {holes.map((hole) => {
            const role = roles.get(hole.id);
            const parent = role?.kind === 'hole'
              ? entry.paths.find((path) => path.id === role.parentId)
              : undefined;
            const value = params.holeWallMaterialIds?.[String(hole.slot)] ?? '';
            return (
              <PanelSelect
                key={hole.id}
                label={`${hole.name} wall`}
                value={value}
                options={[
                  { value: '', label: `Same as ${parent?.name ?? 'body'}` },
                  ...materials.map((material) => ({ value: material.id, label: material.name })),
                ]}
                onChange={(materialId) => {
                  setKindParams('extrusion', entity.id, {
                    holeWallMaterialIds: {
                      ...params.holeWallMaterialIds,
                      [String(hole.slot)]: materialId,
                    },
                  });
                }}
              />
            );
          })}
        </SubPanelSection>
      ) : null}
    </>
  );
}
