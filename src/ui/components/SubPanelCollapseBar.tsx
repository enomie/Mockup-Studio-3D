import { PanelLeftClose, PanelRightClose } from 'lucide-react';
import { Icon } from '@/ui/components/Icon';

interface SubPanelCollapseBarProps {
  side: 'left' | 'right';
  onClick: () => void;
  /** Shell = hide entire sub column; detail = hide detail split column only */
  variant: 'shell' | 'detail';
  ariaLabel: string;
}

function collapseIcon(side: 'left' | 'right', variant: 'shell' | 'detail') {
  if (variant === 'detail') {
    return side === 'left' ? PanelRightClose : PanelLeftClose;
  }
  return side === 'left' ? PanelLeftClose : PanelRightClose;
}

export function SubPanelCollapseBar({
  side,
  onClick,
  variant,
  ariaLabel,
}: SubPanelCollapseBarProps) {
  const CollapseIcon = collapseIcon(side, variant);

  return (
    <button
      type="button"
      className={`sub-panel__collapse sub-panel__collapse--${variant}`}
      aria-label={ariaLabel}
      title={ariaLabel}
      onClick={(event) => {
        event.stopPropagation();
        onClick();
      }}
    >
      <Icon icon={CollapseIcon} />
    </button>
  );
}
