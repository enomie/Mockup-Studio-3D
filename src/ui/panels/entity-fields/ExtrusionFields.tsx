import {
  defaultExtrusionParams,
  EXTRUSION_DEPTH_MAX_M,
  EXTRUSION_DEPTH_MIN_M,
  resolveExtrusionProfile,
} from '@/scene/asset-extrusion';
import { getGeometryPartsForKind } from '@/scene/asset-kind-registry';
import type { AssetEntity } from '@/scene/entity-types';
import { PanelAxisField } from '@/ui/components/PanelAxisField/PanelAxisField';
import { SubPanelSection } from '@/ui/components/SubPanelSection';
import { GeometryPartsSection } from '@/ui/panels/GeometryPartsSection';
import { ProfilePickerSection } from '@/ui/panels/ProfilePickerSection';
import { setKindParams } from '@/ui/store/app-store';
import { useAppStore } from '@/ui/store/use-app-store';

const formatMm = (meters: number): string => String(Math.round(meters * 10000) / 10);

function parseDepthMm(raw: string): number | null {
  const mm = Number(raw.trim().replace(',', '.'));
  if (raw.trim() === '' || !Number.isFinite(mm)) {return null;}
  const meters = mm / 1000;
  return meters >= EXTRUSION_DEPTH_MIN_M && meters <= EXTRUSION_DEPTH_MAX_M ? meters : null;
}

export function ExtrusionFields({ entity }: { entity: AssetEntity }) {
  const materials = useAppStore((s) => s.materials);
  // Re-render on profile edits; the registry is kept in sync by the store.
  useAppStore((s) => s.userProfiles);
  const params = { ...defaultExtrusionParams(), ...entity.extrusionParams };
  const { entry } = resolveExtrusionProfile(params.profileId);
  const slots = new Set(entry.paths.map((path) => path.slot));
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
          unit="mm"
          value={params.depthM}
          format={formatMm}
          parse={parseDepthMm}
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
    </>
  );
}
