import { SubPanelCollapseBar } from '@/ui/components/SubPanelCollapseBar';
import { useShellSubPanel } from '@/ui/components/shell-sub-panel-context';

interface SubPanelCollapseRowProps {
  side: 'left' | 'right';
  showDetailCollapse?: boolean;
  onCollapseDetail?: () => void;
}

export function SubPanelCollapseRow({
  side,
  showDetailCollapse = false,
  onCollapseDetail,
}: SubPanelCollapseRowProps) {
  const shell = useShellSubPanel();
  const showShell = shell !== null;

  if (!showShell && !showDetailCollapse) {
    return null;
  }

  const multiple = showShell && showDetailCollapse;

  const handleShellCollapse = (): void => {
    onCollapseDetail?.();
    shell?.onToggleShellCollapse();
  };

  const handleDetailCollapse = (): void => {
    onCollapseDetail?.();
  };

  // Match split columns: shell bar under the list, detail bar under the editor (mirrored on the right side via CSS).
  return (
    <div
      className={`sub-panel__collapse-row${multiple ? ' sub-panel__collapse-row--multiple' : ''}`}
    >
      {showShell ? (
        <SubPanelCollapseBar
          side={side}
          variant="shell"
          ariaLabel="Hide panel"
          onClick={handleShellCollapse}
        />
      ) : null}
      {showDetailCollapse && onCollapseDetail ? (
        <SubPanelCollapseBar
          side={side}
          variant="detail"
          ariaLabel="Hide editor"
          onClick={handleDetailCollapse}
        />
      ) : null}
    </div>
  );
}
