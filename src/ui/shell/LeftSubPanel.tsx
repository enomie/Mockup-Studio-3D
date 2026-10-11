import { AssetsPanel } from '@/ui/panels/AssetsPanel';
import { ColorsPanel } from '@/ui/panels/ColorsPanel';
import { EnvironmentsPanel } from '@/ui/panels/EnvironmentsPanel';
import { LightRigsPanel } from '@/ui/panels/LightRigsPanel';
import { ImagesPanel } from '@/ui/panels/ImagesPanel';
import { MaterialsPanel } from '@/ui/panels/MaterialsPanel';

type LeftSubPanelProps = {
  selectedId: string;
};

export function LeftSubPanel({ selectedId }: LeftSubPanelProps) {
  if (selectedId === 'environments') {
    return <EnvironmentsPanel />;
  }

  if (selectedId === 'light-rigs') {
    return <LightRigsPanel />;
  }

  if (selectedId === 'assets') {
    return <AssetsPanel />;
  }

  if (selectedId === 'images') {
    return <ImagesPanel />;
  }

  if (selectedId === 'colors') {
    return <ColorsPanel />;
  }

  if (selectedId === 'materials') {
    return <MaterialsPanel />;
  }

  return null;
}
