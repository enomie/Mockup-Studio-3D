import { ChevronDown, ChevronRight, Eye, EyeOff } from 'lucide-react';
import type { ReactNode } from 'react';
import { Icon } from '@/ui/components/Icon';

type SceneEntityBlockProps = {
  title: string;
  enabled: boolean;
  collapsed: boolean;
  selected?: boolean;
  selectable?: boolean;
  onToggleCollapse: () => void;
  onToggleEnabled: () => void;
  onTitleClick?: () => void;
  children: ReactNode;
};

export function SceneEntityBlock({
  title,
  enabled,
  collapsed,
  selected = false,
  selectable = false,
  onToggleCollapse,
  onToggleEnabled,
  onTitleClick,
  children,
}: SceneEntityBlockProps) {
  return (
    <section
      className={`scene-entity-block${selected ? ' scene-entity-block--selected' : ''}${collapsed ? ' scene-entity-block--collapsed' : ''}${enabled ? '' : ' scene-entity-block--hidden'}`}
      aria-label={title}
    >
      <div className="scene-entity-block__header">
        <button
          type="button"
          className="scene-entity-block__collapse"
          aria-expanded={!collapsed}
          aria-label={collapsed ? 'Expand properties' : 'Collapse properties'}
          onClick={onToggleCollapse}
        >
          <Icon icon={collapsed ? ChevronRight : ChevronDown} />
        </button>
        {selectable && onTitleClick ? (
          <button
            type="button"
            className="scene-entity-block__title"
            aria-current={selected ? 'true' : undefined}
            onClick={onTitleClick}
          >
            {title}
          </button>
        ) : (
          <span className="scene-entity-block__title scene-entity-block__title--static">{title}</span>
        )}
        <button
          type="button"
          className="scene-entity-block__visibility"
          aria-label={enabled ? `Hide ${title}` : `Show ${title}`}
          aria-pressed={enabled}
          title={enabled ? 'Hide' : 'Show'}
          onClick={onToggleEnabled}
        >
          <Icon icon={enabled ? Eye : EyeOff} />
        </button>
      </div>
      {!collapsed ? <div className="scene-entity-block__body panel-stack">{children}</div> : null}
    </section>
  );
}
