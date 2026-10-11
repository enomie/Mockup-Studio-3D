import { CameraSubPanel } from '@/ui/panels/CameraSubPanel';
import { EnvironmentSubPanel } from '@/ui/panels/EnvironmentSubPanel';
import { ExportSubPanel } from '@/ui/panels/ExportSubPanel';
import { LightingSubPanel } from '@/ui/panels/LightingSubPanel';
import { SceneSubPanel } from '@/ui/panels/SceneSubPanel';

type RightSubPanelProps = {
  selectedId: string;
};

export function RightSubPanel({ selectedId }: RightSubPanelProps) {
  if (selectedId === 'scene') {
    return <SceneSubPanel />;
  }

  if (selectedId === 'environment') {
    return <EnvironmentSubPanel />;
  }

  if (selectedId === 'lighting') {
    return <LightingSubPanel />;
  }

  if (selectedId === 'camera') {
    return <CameraSubPanel />;
  }

  if (selectedId === 'export') {
    return <ExportSubPanel />;
  }

  return null;
}
