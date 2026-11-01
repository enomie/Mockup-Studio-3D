import type { ReactNode } from 'react';
import { SubPanelCollapseRow } from '@/ui/components/SubPanelCollapseRow';

/** `list`: shrinks to its content (clamped); `form`: fixed width for label + field rows. */
type SubPanelWidth = 'list' | 'form';

interface SubPanelProps {
  title: string;
  side: 'left' | 'right';
  width?: SubPanelWidth;
  children: ReactNode;
  footer?: ReactNode;
}

export function SubPanel({ title, side, width = 'form', children, footer }: SubPanelProps) {
  return (
    <aside
      className={`sub-panel sub-panel--${side} sub-panel--${width}`}
      aria-label={title}
    >
      <div
        className="sub-panel__body panel-stack"
        onWheel={(event) => { event.stopPropagation(); }}
      >
        {children}
      </div>
      {footer ? <div className="sub-panel__footer">{footer}</div> : null}
      <SubPanelCollapseRow side={side} />
    </aside>
  );
}
