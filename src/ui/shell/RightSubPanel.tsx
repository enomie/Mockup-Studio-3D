import { CameraSubPanel } from '@/ui/panels/CameraSubPanel';
import { EnvironmentSubPanel } from '@/ui/panels/EnvironmentSubPanel';
import { ExportSubPanel } from '@/ui/panels/ExportSubPanel';
import { LightingSubPanel } from '@/ui/panels/LightingSubPanel';
import { PhysicsSubPanel } from '@/ui/panels/PhysicsSubPanel';
import { SettingsSubPanel } from '@/ui/panels/SettingsSubPanel';
import { SceneSubPanel } from '@/ui/panels/SceneSubPanel';
import { ShellSubPanelProvider } from '@/ui/components/shell-sub-panel-context';

interface RightSubPanelProps {
  selectedId: string;
  onToggleShellCollapse: () => void;
}

export function RightSubPanel({ selectedId, onToggleShellCollapse }: RightSubPanelProps) {
  let content = null;

  if (selectedId === 'scene') {
    content = <SceneSubPanel />;
  } else if (selectedId === 'environment') {
    content = <EnvironmentSubPanel />;
  } else if (selectedId === 'lighting') {
    content = <LightingSubPanel />;
  } else if (selectedId === 'camera') {
    content = <CameraSubPanel />;
  } else if (selectedId === 'physics') {
    content = <PhysicsSubPanel />;
  } else if (selectedId === 'export') {
    content = <ExportSubPanel />;
  } else if (selectedId === 'settings') {
    content = <SettingsSubPanel />;
  }

  if (!content) {
    return null;
  }

  return (
    <ShellSubPanelProvider side="right" onToggleShellCollapse={onToggleShellCollapse}>
      {content}
    </ShellSubPanelProvider>
  );
}
