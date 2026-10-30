import { PanelLeftClose, PanelRightClose } from 'lucide-react';
import { Icon } from '@/ui/components/Icon';

interface SubPanelCollapseBarProps {
  side: 'left' | 'right';
  onClick: () => void;
  ariaLabel: string;
}

function collapseIcon(side: 'left' | 'right') {
  return side === 'left' ? PanelLeftClose : PanelRightClose;
}

export function SubPanelCollapseBar({
  side,
  onClick,
  ariaLabel,
}: SubPanelCollapseBarProps) {
  const CollapseIcon = collapseIcon(side);

  return (
    <button
      type="button"
      className="sub-panel__collapse"
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
