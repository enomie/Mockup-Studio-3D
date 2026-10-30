import { useCallback } from 'react';
import { ShellSubPanelProvider } from '@/ui/components/shell-sub-panel-context';
import { MaterialDetailPanel } from '@/ui/panels/MaterialsPanel';
import { selectMaterial } from '@/ui/store/app-store';

interface LeftDetailPanelProps {
  selectedId: string;
}

/** Optional detail column that opens to the right of the left sub panel. */
export function LeftDetailPanel({ selectedId }: LeftDetailPanelProps) {
  const handleClose = useCallback(() => { selectMaterial(null); }, []);

  if (selectedId !== 'materials') {
    return null;
  }

  return (
    <ShellSubPanelProvider side="left" onToggleShellCollapse={handleClose}>
      <MaterialDetailPanel />
    </ShellSubPanelProvider>
  );
}
