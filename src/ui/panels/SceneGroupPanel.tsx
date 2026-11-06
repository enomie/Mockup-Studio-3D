import { Eye, EyeOff, Trash2 } from 'lucide-react';
import { Icon } from '@/ui/components/Icon';
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
import { GroupTransformFields } from './GroupTransformFields';

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
          <GroupTransformFields
            center={group.center}
            rotation={group.rotation}
            scale={group.scale}
            onCenterChange={setSelectionGroupCenter}
            onRotationChange={setSelectionGroupRotation}
            onScaleChange={setSelectionGroupScale}
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
