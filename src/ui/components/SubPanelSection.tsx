import type { ReactNode } from 'react';

interface SubPanelSectionProps {
  title: string;
  children: ReactNode;
  headerAction?: ReactNode;
}

export function SubPanelSection({ title, children, headerAction }: SubPanelSectionProps) {
  return (
    <section className="sub-panel-section" aria-label={title}>
      <div className="sub-panel-section__header">
        <h3 className="sub-panel-section__title">{title}</h3>
        {headerAction ? (
          <div className="sub-panel-section__header-action">{headerAction}</div>
        ) : null}
      </div>
      <div className="sub-panel-section__body">{children}</div>
    </section>
  );
}
