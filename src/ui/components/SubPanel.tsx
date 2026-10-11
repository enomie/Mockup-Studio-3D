import type { ReactNode } from 'react';

type SubPanelProps = {
  title: string;
  side: 'left' | 'right';
  children: ReactNode;
  footer?: ReactNode;
  headerAction?: ReactNode;
};

export function SubPanel({ title, side, children, footer, headerAction }: SubPanelProps) {
  return (
    <aside className={`sub-panel sub-panel--${side}`} aria-label={title}>
      <div className="sub-panel__header">
        <span className="sub-panel__title">{title}</span>
        {headerAction ? <div className="sub-panel__header-action">{headerAction}</div> : null}
      </div>
      <div
        className="sub-panel__body panel-stack"
        onWheel={(event) => event.stopPropagation()}
      >
        {children}
      </div>
      {footer ? <div className="sub-panel__footer">{footer}</div> : null}
    </aside>
  );
}
