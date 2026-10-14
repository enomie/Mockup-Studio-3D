import { MainNavPanel } from '@/ui/components/MainNavPanel';
import { RIGHT_SHELL_NAV } from './shell-nav';

interface RightMainPanelProps {
  selectedId: string;
  collapsed: boolean;
  onSelect: (id: string) => void;
  onToggleCollapse: () => void;
}

export function RightMainPanel({
  selectedId,
  collapsed,
  onSelect,
  onToggleCollapse,
}: RightMainPanelProps) {
  return (
    <MainNavPanel
      side="right"
      items={RIGHT_SHELL_NAV}
      selectedId={selectedId}
      collapsed={collapsed}
      onSelect={onSelect}
      onToggleCollapse={onToggleCollapse}
    />
  );
}
