import { Trash2 } from 'lucide-react';
import type { ProfileEntry } from '@/scene/profile-library';
import {
  deleteNodeGroup,
  groupBounds,
  groupNodes,
  moveNodeGroup,
  nodeSnapshots,
  nodeStarts,
  rotateAbout,
  scaleAbout,
  transformNodeGroup,
} from '@/scene/profile-node-group';
import { Icon } from '@/ui/components/Icon';
import { PanelAxisField } from '@/ui/components/PanelAxisField/PanelAxisField';
import { SubPanelSection } from '@/ui/components/SubPanelSection';
import { addProfileGroupRotation, editProfilePaths, selectProfilePath } from '@/ui/store/app-store';
import { useAppStore } from '@/ui/store/use-app-store';
import { formatMmAsMeters, parseMmFromMetersInput } from '@/units/length';

const formatDeg = (value: number): string => String(Math.round(value * 10) / 10);

function parseNumber(raw: string): number | null {
  const value = Number(raw.trim().replace(',', '.'));
  return raw.trim() !== '' && Number.isFinite(value) ? value : null;
}

function parsePositiveMm(raw: string): number | null {
  const mm = parseMmFromMetersInput(raw);
  return mm !== null && mm > 0 ? mm : null;
}

/** Inspector fields while several points are selected: centre, size and relative rotation. */
export function ProfileGroupFields({ profile }: { profile: ProfileEntry }) {
  const selection = useAppStore((s) => s.profileNodeSelection);
  const extras = useAppStore((s) => s.profileExtraNodes);
  const rotationDeg = useAppStore((s) => s.profileGroupRotationDeg);
  const points = groupNodes({
    active: selection?.index != null ? { pathId: selection.pathId, index: selection.index } : null,
    extras,
  });
  const bounds = groupBounds(profile.paths, points);
  if (!bounds) {return null;}
  const center = { x: (bounds.minX + bounds.maxX) / 2, y: (bounds.minY + bounds.maxY) / 2 };
  const width = bounds.maxX - bounds.minX;
  const height = bounds.maxY - bounds.minY;

  const move = (dx: number, dy: number) => {
    editProfilePaths(profile.id, (paths) => moveNodeGroup(paths, nodeStarts(paths, points), { x: dx, y: dy }));
  };
  const scale = (sx: number, sy: number) => {
    editProfilePaths(profile.id, (paths) =>
      transformNodeGroup(paths, nodeSnapshots(paths, points), scaleAbout(center, sx, sy)));
  };
  const rotate = (targetDeg: number) => {
    const delta = targetDeg - rotationDeg;
    if (delta === 0) {return;}
    editProfilePaths(profile.id, (paths) =>
      transformNodeGroup(paths, nodeSnapshots(paths, points), rotateAbout(center, (delta * Math.PI) / 180)));
    addProfileGroupRotation(delta);
  };

  return (
    <SubPanelSection title={`${points.length} points selected`}>
      <div className="panel-stack">
        <PanelAxisField label="Centre X" unit="m" value={center.x} format={formatMmAsMeters} parse={parseMmFromMetersInput}
          onChange={(x) => { move(x - center.x, 0); }} />
        <PanelAxisField label="Centre Y" unit="m" value={center.y} format={formatMmAsMeters} parse={parseMmFromMetersInput}
          onChange={(y) => { move(0, y - center.y); }} />
        <PanelAxisField label="Width" unit="m" value={width} format={formatMmAsMeters} parse={parsePositiveMm}
          disabled={width <= 0} onChange={(w) => { scale(w / width, 1); }} />
        <PanelAxisField label="Height" unit="m" value={height} format={formatMmAsMeters} parse={parsePositiveMm}
          disabled={height <= 0} onChange={(h) => { scale(1, h / height); }} />
        <PanelAxisField label="Rotation" unit="°" value={rotationDeg} format={formatDeg} parse={parseNumber}
          onChange={rotate} />
        <p className="profile-hint">Centre and size of the selected points; rotation counts from when the selection was made.</p>
        <div className="material-editor-actions">
          <button
            type="button"
            className="btn btn--danger"
            onClick={() => {
              editProfilePaths(profile.id, (paths) => deleteNodeGroup(paths, points));
              selectProfilePath(selection?.pathId ?? null);
            }}
          >
            <Icon icon={Trash2} size={16} strokeWidth={1.75} />
            Delete points
          </button>
        </div>
      </div>
    </SubPanelSection>
  );
}
