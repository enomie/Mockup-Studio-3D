import { SubPanelCollapseBar } from '@/ui/components/SubPanelCollapseBar';
import { useShellSubPanel } from '@/ui/components/shell-sub-panel-context';

interface SubPanelCollapseRowProps {
  side: 'left' | 'right';
}

export function SubPanelCollapseRow({ side }: SubPanelCollapseRowProps) {
  const shell = useShellSubPanel();
  if (!shell) {
    return null;
  }

  return (
    <div className="sub-panel__collapse-row">
      <SubPanelCollapseBar
        side={side}
        ariaLabel="Hide panel"
        onClick={shell.onToggleShellCollapse}
      />
    </div>
  );
}
