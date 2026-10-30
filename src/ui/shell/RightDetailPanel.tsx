import { useCallback } from 'react';
import { ShellSubPanelProvider } from '@/ui/components/shell-sub-panel-context';
import { SceneDetailPanel } from '@/ui/panels/SceneDetailPanel';
import { setSelectedEntity } from '@/ui/store/app-store';

interface RightDetailPanelProps {
  selectedId: string;
}

/** Optional detail column that opens to the left of the right sub panel. */
export function RightDetailPanel({ selectedId }: RightDetailPanelProps) {
  const handleClose = useCallback(() => { setSelectedEntity(null); }, []);

  if (selectedId !== 'scene') {
    return null;
  }

  return (
    <ShellSubPanelProvider side="right" onToggleShellCollapse={handleClose}>
      <SceneDetailPanel />
    </ShellSubPanelProvider>
  );
}
