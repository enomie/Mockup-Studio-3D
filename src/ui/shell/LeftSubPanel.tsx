import { AssetsPanel } from '@/ui/panels/AssetsPanel';
import { ColorsPanel } from '@/ui/panels/ColorsPanel';
import { EnvironmentsPanel } from '@/ui/panels/EnvironmentsPanel';
import { LightRigsPanel } from '@/ui/panels/LightRigsPanel';
import { ImagesPanel } from '@/ui/panels/ImagesPanel';
import { MaterialsPanel } from '@/ui/panels/MaterialsPanel';
import {
  ShellSubPanelProvider,
  type SubPanelWidthMode,
} from '@/ui/components/shell-sub-panel-context';

interface LeftSubPanelProps {
  selectedId: string;
  onToggleShellCollapse: () => void;
  onSubWidthModeChange: (mode: SubPanelWidthMode) => void;
}

export function LeftSubPanel({
  selectedId,
  onToggleShellCollapse,
  onSubWidthModeChange,
}: LeftSubPanelProps) {
  let content = null;

  if (selectedId === 'environments') {
    content = <EnvironmentsPanel />;
  } else if (selectedId === 'light-rigs') {
    content = <LightRigsPanel />;
  } else if (selectedId === 'assets') {
    content = <AssetsPanel />;
  } else if (selectedId === 'images') {
    content = <ImagesPanel />;
  } else if (selectedId === 'colors') {
    content = <ColorsPanel />;
  } else if (selectedId === 'materials') {
    content = <MaterialsPanel />;
  }

  if (!content) {
    return null;
  }

  return (
    <ShellSubPanelProvider
      side="left"
      onToggleShellCollapse={onToggleShellCollapse}
      onSubWidthModeChange={onSubWidthModeChange}
    >
      {content}
    </ShellSubPanelProvider>
  );
}
