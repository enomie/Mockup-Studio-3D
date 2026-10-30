import { Eye, EyeOff, Trash2 } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { Icon } from '@/ui/components/Icon';
import { SubPanel } from '@/ui/components/SubPanel';
import { removeEntity, setEntityVisible, setSelectedEntity } from '@/ui/store/app-store';
import { useAppStore } from '@/ui/store/use-app-store';

/** Entity overview; the selected entity's settings open in `SceneDetailPanel`. */
export function SceneSubPanel() {
  const entities = useAppStore((s) => s.entities);
  const selectedEntityId = useAppStore((s) => s.selectedEntityId);
  const rowRefs = useRef(new Map<string, HTMLElement>());

  useEffect(() => {
    if (!selectedEntityId) {return;}
    rowRefs.current.get(selectedEntityId)?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [selectedEntityId]);

  return (
    <SubPanel title="Scene" side="right" width="list">
      {entities.length === 0 ? (
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
                    onClick={() => { setSelectedEntity(isSelected ? null : entity.id); }}
                  >
                    {entity.name}
                  </button>
                  <button
                    type="button"
                    className="scene-entity-block__action"
                    aria-label={entity.visible ? `Hide ${entity.name}` : `Show ${entity.name}`}
                    aria-pressed={entity.visible}
                    title={entity.visible ? 'Hide' : 'Show'}
                    onClick={() => { setEntityVisible(entity.id, !entity.visible); }}
                  >
                    <Icon icon={entity.visible ? Eye : EyeOff} />
                  </button>
                  <button
                    type="button"
                    className="scene-entity-block__action scene-entity-block__action--danger"
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
      )}
    </SubPanel>
  );
}
