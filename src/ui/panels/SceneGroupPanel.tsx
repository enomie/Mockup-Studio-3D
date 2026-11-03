import { Eye, EyeOff, Trash2 } from 'lucide-react';
import { Icon } from '@/ui/components/Icon';
import { PanelAxisField } from '@/ui/components/PanelAxisField/PanelAxisField';
import { SubPanel } from '@/ui/components/SubPanel';
import { SubPanelSection } from '@/ui/components/SubPanelSection';
import {
  removeEntity,
  setEntityVisible,
  setSelectionGroupCenter,
  setSelectionGroupRotation,
  setSelectionGroupScale,
} from '@/ui/store/app-store';
import { useAppStore } from '@/ui/store/use-app-store';
import { formatLengthMeters, LENGTH_DECIMALS, parseLengthMetersInput } from '@/units/length';
import { formatDegrees, parseDegreesInput } from './entity-fields/field-input-helpers';

type Axis = 'x' | 'y' | 'z';
const AXES: readonly Axis[] = ['x', 'y', 'z'];

const formatPercent = (scale: number): string => (scale * 100).toFixed(1);

function parsePercent(raw: string): number | null {
  const value = Number(raw.trim().replace(',', '.').replace('%', ''));
  return raw.trim() !== '' && Number.isFinite(value) && value > 0 ? value / 100 : null;
}

/** Detail panel while two or more assets are selected: group transform and bulk actions. */
export function SceneGroupPanel() {
  const ids = useAppStore((s) => s.selectedEntityIds);
  const entities = useAppStore((s) => s.entities);
  const group = useAppStore((s) => s.selectionGroup);
  const selected = entities.filter((entity) => ids.includes(entity.id));
  const anyVisible = selected.some((entity) => entity.visible);
  const title = `${selected.length} objects selected`;

  return (
    <SubPanel title={title} side="right">
      <div className="scene-detail__title">{title}</div>
      {group ? (
        <SubPanelSection title="Group transform">
          {AXES.map((axis) => (
            <PanelAxisField
              key={`pos-${axis}`}
              label={`Pos ${axis.toUpperCase()}`}
              unit="m"
              value={group.center[axis]}
              format={(value) => formatLengthMeters(value, LENGTH_DECIMALS)}
              parse={parseLengthMetersInput}
              onChange={(value) => { setSelectionGroupCenter({ ...group.center, [axis]: value }); }}
            />
          ))}
          {AXES.map((axis) => (
            <PanelAxisField
              key={`rot-${axis}`}
              label={`Rot ${axis.toUpperCase()}`}
              unit="°"
              value={group.rotation[axis]}
              format={formatDegrees}
              parse={parseDegreesInput}
              onChange={(value) => { setSelectionGroupRotation({ ...group.rotation, [axis]: value }); }}
            />
          ))}
          <PanelAxisField
            label="Scale"
            unit="%"
            value={group.scale}
            format={formatPercent}
            parse={parsePercent}
            onChange={(value) => { setSelectionGroupScale(value); }}
          />
          <p className="placeholder">Position is the group centre; rotation and scale count from when the selection was made. Walls only move.</p>
        </SubPanelSection>
      ) : (
        <p className="placeholder">All selected objects are hidden.</p>
      )}
      <SubPanelSection title="Actions">
        <div className="material-editor-actions">
          <button
            type="button"
            className="btn"
            onClick={() => { for (const entity of selected) {setEntityVisible(entity.id, !anyVisible);} }}
          >
            <Icon icon={anyVisible ? EyeOff : Eye} size={16} strokeWidth={1.75} />
            {anyVisible ? 'Hide all' : 'Show all'}
          </button>
          <button
            type="button"
            className="btn btn--danger"
            onClick={() => { for (const entity of selected) {removeEntity(entity.id);} }}
          >
            <Icon icon={Trash2} size={16} strokeWidth={1.75} />
            Delete all
          </button>
        </div>
      </SubPanelSection>
    </SubPanel>
  );
}
