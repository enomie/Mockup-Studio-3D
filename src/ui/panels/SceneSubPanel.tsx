import { ChevronDown, ChevronRight, Eye, EyeOff, Trash2 } from 'lucide-react';
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
  const sectionRefs = useRef(new Map<string, HTMLElement>());
  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(() => new Set());
  const [prevSelectedEntityId, setPrevSelectedEntityId] = useState(selectedEntityId);

  if (selectedEntityId !== prevSelectedEntityId) {
    setPrevSelectedEntityId(selectedEntityId);
    if (selectedEntityId) {
      setCollapsedIds((prev) => {
        if (!prev.has(selectedEntityId)) return prev;
        const next = new Set(prev);
        next.delete(selectedEntityId);
        return next;
      });
    }
  }

  useEffect(() => {
    if (!selectedEntityId) return;
    const section = sectionRefs.current.get(selectedEntityId);
    section?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [selectedEntityId]);

  const toggleCollapsed = (entityId: string): void => {
    setCollapsedIds((prev) => {
      const next = new Set(prev);
      if (next.has(entityId)) {
        next.delete(entityId);
      } else {
        next.add(entityId);
      }
      return next;
    });
  };

  const handleRemove = (entityId: string): void => {
    removeEntity(entityId);
    setCollapsedIds((prev) => {
      if (!prev.has(entityId)) return prev;
      const next = new Set(prev);
      next.delete(entityId);
      return next;
    });
  };

  return (
    <SubPanel title="Szene" side="right">
      {entities.length === 0 ? (
        <p className="placeholder">No items — add from Assets.</p>
      ) : (
        <ul className="scene-entity-list">
          {entities.map((entity) => {
            const isSelected = entity.id === selectedEntityId;
            const isCollapsed = collapsedIds.has(entity.id);
            return (
              <li key={entity.id}>
                <section
                  ref={(node) => {
                    if (node) {
                      sectionRefs.current.set(entity.id, node);
                    } else {
                      sectionRefs.current.delete(entity.id);
                    }
                  }}
                  className={`scene-entity-block${isSelected ? ' scene-entity-block--selected' : ''}${isCollapsed ? ' scene-entity-block--collapsed' : ''}${entity.visible ? '' : ' scene-entity-block--hidden'}`}
                >
                  <div className="scene-entity-block__header">
                    <button
                      type="button"
                      className="scene-entity-block__collapse"
                      aria-expanded={!isCollapsed}
                      aria-label={isCollapsed ? 'Expand properties' : 'Collapse properties'}
                      onClick={() => toggleCollapsed(entity.id)}
                    >
                      <Icon icon={isCollapsed ? ChevronRight : ChevronDown} />
                    </button>
                    <button
                      type="button"
                      className="scene-entity-block__title"
                      aria-current={isSelected ? 'true' : undefined}
                      onClick={() => setSelectedEntity(isSelected ? null : entity.id)}
                    >
                      {entity.name}
                    </button>
                    <button
                      type="button"
                      className="scene-entity-block__visibility"
                      aria-label={entity.visible ? `Hide ${entity.name}` : `Show ${entity.name}`}
                      aria-pressed={entity.visible}
                      title={entity.visible ? 'Hide' : 'Show'}
                      onClick={() => setEntityVisible(entity.id, !entity.visible)}
                    >
                      <Icon icon={entity.visible ? Eye : EyeOff} />
                    </button>
                    <button
                      type="button"
                      className="scene-entity-block__remove"
                      aria-label={`Remove ${entity.name}`}
                      title="Remove"
                      onClick={() => handleRemove(entity.id)}
                    >
                      <Icon icon={Trash2} />
                    </button>
                  </div>
                  {!isCollapsed ? (
                    <EntityPropertyFields
                      entity={entity}
                      images={images}
                      screenImageFieldId={`scene-entity-image-${entity.id}`}
                    />
                  ) : null}
                </section>
              </li>
            );
          })}
        </ul>
      )}
    </SubPanel>
  );
}
