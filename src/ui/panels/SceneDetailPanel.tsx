import { SubPanel } from '@/ui/components/SubPanel';
import { EntityPropertyFields } from './EntityPropertyFields';
import { useAppStore } from '@/ui/store/use-app-store';

/** Settings of the entity selected in the Scene list; hidden when nothing is selected. */
export function SceneDetailPanel() {
  const entities = useAppStore((s) => s.entities);
  const selectedEntityId = useAppStore((s) => s.selectedEntityId);
  const selectedCount = useAppStore((s) => s.selectedEntityIds.length);
  const images = useAppStore((s) => s.images);
  const selected = entities.find((entity) => entity.id === selectedEntityId);

  if (!selected) {
    return null;
  }

  return (
    <SubPanel title={selected.name} side="right">
      <div className="scene-detail__title">{selected.name}</div>
      {selectedCount > 1 ? (
        <p className="placeholder">{`${selectedCount} objects selected (Shift-click to add or remove). Settings below: last clicked object.`}</p>
      ) : null}
      <EntityPropertyFields
        key={selected.id}
        entity={selected}
        images={images}
        screenImageFieldId={`scene-entity-image-${selected.id}`}
      />
    </SubPanel>
  );
}
