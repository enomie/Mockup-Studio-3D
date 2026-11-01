import { ArrangementsPanel } from '@/ui/panels/ArrangementsPanel';
import { AssetsPanel } from '@/ui/panels/AssetsPanel';
import { ColorsPanel } from '@/ui/panels/ColorsPanel';
import { EnvironmentsPanel } from '@/ui/panels/EnvironmentsPanel';
import { LightRigsPanel } from '@/ui/panels/LightRigsPanel';
import { ImagesPanel } from '@/ui/panels/ImagesPanel';
import { MaterialsPanel } from '@/ui/panels/MaterialsPanel';
import { ShellSubPanelProvider } from '@/ui/components/shell-sub-panel-context';

interface LeftSubPanelProps {
  selectedId: string;
  onToggleShellCollapse: () => void;
}

export function LeftSubPanel({
  selectedId,
  onToggleShellCollapse,
}: LeftSubPanelProps) {
  let content = null;

  if (selectedId === 'environments') {
    content = <EnvironmentsPanel />;
  } else if (selectedId === 'light-rigs') {
    content = <LightRigsPanel />;
  } else if (selectedId === 'arrangements') {
    content = <ArrangementsPanel />;
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
    <ShellSubPanelProvider side="left" onToggleShellCollapse={onToggleShellCollapse}>
      {content}
    </ShellSubPanelProvider>
  );
}
