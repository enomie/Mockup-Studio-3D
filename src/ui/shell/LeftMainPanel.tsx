import { MainNavPanel } from '@/ui/components/MainNavPanel';
import { LEFT_SHELL_NAV } from './shell-nav';

interface LeftMainPanelProps {
  selectedId: string;
  collapsed: boolean;
  onSelect: (id: string) => void;
  onToggleCollapse: () => void;
}

export function LeftMainPanel({
  selectedId,
  collapsed,
  onSelect,
  onToggleCollapse,
}: LeftMainPanelProps) {
  return (
    <MainNavPanel
      side="left"
      items={LEFT_SHELL_NAV}
      selectedId={selectedId}
      collapsed={collapsed}
      onSelect={onSelect}
      onToggleCollapse={onToggleCollapse}
    />
  );
}
