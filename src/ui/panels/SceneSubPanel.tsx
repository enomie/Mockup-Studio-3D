import { Eye, EyeOff, Trash2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Icon } from '@/ui/components/Icon';
import { SubPanel } from '@/ui/components/SubPanel';
import { EntityPropertyFields } from './EntityPropertyFields';
import { removeEntity, setEntityVisible, setSelectedEntity } from '@/ui/store/app-store';
import { useAppStore } from '@/ui/store/use-app-store';

export function SceneSubPanel() {
  const entities = useAppStore((s) => s.entities);
  const selectedEntityId = useAppStore((s) => s.selectedEntityId);
  const images = useAppStore((s) => s.images);
  const rowRefs = useRef(new Map<string, HTMLElement>());
  const selected = entities.find((entity) => entity.id === selectedEntityId) ?? null;
  const [detailCollapsed, setDetailCollapsed] = useState(false);
  const [prevSelectedEntityId, setPrevSelectedEntityId] = useState(selectedEntityId);

  // A new selection (list or viewport) always reopens the detail column.
  if (selectedEntityId !== prevSelectedEntityId) {
    setPrevSelectedEntityId(selectedEntityId);
    if (selectedEntityId) {setDetailCollapsed(false);}
  }

  useEffect(() => {
    if (!selectedEntityId) {return;}
    rowRefs.current.get(selectedEntityId)?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [selectedEntityId]);

  const handleSelect = (entityId: string): void => {
    if (entityId === selectedEntityId && !detailCollapsed) {
      setSelectedEntity(null);
      return;
    }
    setDetailCollapsed(false);
    setSelectedEntity(entityId);
  };

  return (
    <SubPanel
      layout="split"
      title="Scene"
      side="right"
      detailCollapsed={detailCollapsed}
      onCollapseDetail={() => { setDetailCollapsed(true); }}
      detailTitle={selected?.name ?? ''}
      primary={
        entities.length === 0 ? (
          <p className="placeholder">No items — add from Assets.</p>
        ) : (
          <ul className="scene-entity-list scene-entity-list--rows">
            {entities.map((entity) => {
              const isSelected = entity.id === selectedEntityId;
              return (
                <li
                  key={entity.id}
                  ref={(node) => {
                    if (node) {
                      rowRefs.current.set(entity.id, node);
                    } else {
                      rowRefs.current.delete(entity.id);
                    }
                  }}
                  className={`scene-entity-block${isSelected ? ' scene-entity-block--selected' : ''}${entity.visible ? '' : ' scene-entity-block--hidden'}`}
                >
                  <div className="scene-entity-block__header">
                    <button
                      type="button"
                      className="scene-entity-block__title"
                      aria-current={isSelected ? 'true' : undefined}
                      onClick={() => { handleSelect(entity.id); }}
                    >
                      {entity.name}
                    </button>
                    <button
                      type="button"
                      className="scene-entity-block__visibility"
                      aria-label={entity.visible ? `Hide ${entity.name}` : `Show ${entity.name}`}
                      aria-pressed={entity.visible}
                      title={entity.visible ? 'Hide' : 'Show'}
                      onClick={() => { setEntityVisible(entity.id, !entity.visible); }}
                    >
                      <Icon icon={entity.visible ? Eye : EyeOff} />
                    </button>
                    <button
                      type="button"
                      className="scene-entity-block__remove"
                      aria-label={`Remove ${entity.name}`}
                      title="Remove"
                      onClick={() => { removeEntity(entity.id); }}
                    >
                      <Icon icon={Trash2} />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )
      }
      detail={
        selected ? (
          <EntityPropertyFields
            entity={selected}
            images={images}
            screenImageFieldId={`scene-entity-image-${selected.id}`}
          />
        ) : null
      }
    />
  );
}
