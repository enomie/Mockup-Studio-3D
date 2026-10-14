import { useEffect, type ReactNode } from 'react';
import { SubPanelCollapseRow } from '@/ui/components/SubPanelCollapseRow';
import { SubPanelSplit } from '@/ui/components/SubPanelSplit';
import { useShellSubPanel } from '@/ui/components/shell-sub-panel-context';

interface SubPanelStackProps {
  layout?: 'stack';
  title: string;
  side: 'left' | 'right';
  children: ReactNode;
  footer?: ReactNode;
  headerAction?: ReactNode;
}

interface SubPanelSplitProps {
  layout: 'split';
  title: string;
  side: 'left' | 'right';
  primary: ReactNode;
  primaryFooter?: ReactNode;
  detail: ReactNode | null;
  detailTitle?: string;
  detailCollapsed: boolean;
  onCollapseDetail: () => void;
  headerAction?: ReactNode;
}

export type SubPanelProps = SubPanelStackProps | SubPanelSplitProps;

function isSplitProps(props: SubPanelProps): props is SubPanelSplitProps {
  return props.layout === 'split';
}

export function SubPanel(props: SubPanelProps) {
  const shell = useShellSubPanel();
  const side = props.side;
  const title = props.title;
  const headerAction = props.headerAction;

  const splitMode =
    isSplitProps(props) && props.detail !== null && !props.detailCollapsed;

  useEffect(() => {
    if (!shell) {return;}
    shell.requestSubWidth(splitMode ? 'split' : 'default');
    return () => {
      shell.requestSubWidth('default');
    };
  }, [shell, splitMode]);

  if (isSplitProps(props)) {
    const {
      primary,
      primaryFooter,
      detail,
      detailTitle = 'Editor',
      detailCollapsed,
      onCollapseDetail,
    } = props;

    const detailVisible = detail !== null && !detailCollapsed;

    return (
      <aside className={`sub-panel sub-panel--${side}`} aria-label={title}>
        <div className="sub-panel__header">
          <span className="sub-panel__title">{title}</span>
          {headerAction ? (
            <div className="sub-panel__header-action">{headerAction}</div>
          ) : null}
        </div>
        <div className="sub-panel__body sub-panel__body--split-host">
          <SubPanelSplit
            primary={primary}
            primaryFooter={primaryFooter}
            detail={detail}
            detailTitle={detailTitle}
            detailCollapsed={detailCollapsed}
            showDetailColumn={detail !== null}
          />
        </div>
        <SubPanelCollapseRow
          side={side}
          showDetailCollapse={detailVisible}
          onCollapseDetail={onCollapseDetail}
        />
      </aside>
    );
  }

  const { children, footer } = props;

  return (
    <aside className={`sub-panel sub-panel--${side}`} aria-label={title}>
      <div className="sub-panel__header">
        <span className="sub-panel__title">{title}</span>
        {headerAction ? (
          <div className="sub-panel__header-action">{headerAction}</div>
        ) : null}
      </div>
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
