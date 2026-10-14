import type { ReactNode } from 'react';

interface SubPanelSplitProps {
  primary: ReactNode;
  primaryFooter?: ReactNode;
  detail: ReactNode | null;
  detailTitle: string;
  detailCollapsed: boolean;
  showDetailColumn: boolean;
}

export function SubPanelSplit({
  primary,
  primaryFooter,
  detail,
  detailTitle,
  detailCollapsed,
  showDetailColumn,
}: SubPanelSplitProps) {
  const detailVisible = showDetailColumn && detail !== null && !detailCollapsed;

  return (
    <div
      className={`sub-panel-split${detailVisible ? '' : ' sub-panel-split--detail-hidden'}`}
    >
      <div className="sub-panel-split__primary">
        <div
          className="sub-panel-split__scroll"
          onWheel={(event) => { event.stopPropagation(); }}
        >
          {primary}
        </div>
        {primaryFooter ? (
          <div className="sub-panel-split__primary-footer">{primaryFooter}</div>
        ) : null}
      </div>
      {detailVisible ? (
        <div className="sub-panel-split__detail">
          <div className="sub-panel-split__detail-header">
            <span className="sub-panel-split__detail-title">{detailTitle}</span>
          </div>
          <div
            className="sub-panel-split__scroll panel-stack"
            onWheel={(event) => { event.stopPropagation(); }}
          >
            {detail}
          </div>
        </div>
      ) : null}
    </div>
  );
}
