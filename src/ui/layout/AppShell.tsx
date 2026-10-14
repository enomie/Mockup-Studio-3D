import { useCallback, useState } from 'react';
import type { SubPanelWidthMode } from '@/ui/components/shell-sub-panel-context';
import { ViewportFrame } from '@/ui/components/ViewportFrame';
import { useCameraViewShortcuts } from '@/ui/hooks/useCameraViewShortcuts';
import { useViewportToolShortcuts } from '@/ui/hooks/useViewportToolShortcuts';
import { LeftMainPanel } from '@/ui/shell/LeftMainPanel';
import { LeftSubPanel } from '@/ui/shell/LeftSubPanel';
import { RightMainPanel } from '@/ui/shell/RightMainPanel';
import { RightSubPanel } from '@/ui/shell/RightSubPanel';
import { StatusBar } from '@/ui/shell/StatusBar';
import { TopMainBar } from '@/ui/shell/TopMainBar';
import { TopSubBar } from '@/ui/shell/TopSubBar';

export function AppShell() {
  useViewportToolShortcuts();
  useCameraViewShortcuts();

  const [leftSelected, setLeftSelected] = useState('assets');
  const [rightSelected, setRightSelected] = useState('scene');
  const [leftMainCollapsed, setLeftMainCollapsed] = useState(false);
  const [rightMainCollapsed, setRightMainCollapsed] = useState(false);
  const [leftSubCollapsed, setLeftSubCollapsed] = useState(false);
  const [rightSubCollapsed, setRightSubCollapsed] = useState(false);
  const [leftSubWidthMode, setLeftSubWidthMode] = useState<SubPanelWidthMode>('default');

  const handleLeftSubWidthMode = useCallback((mode: SubPanelWidthMode) => {
    setLeftSubWidthMode(mode);
  }, []);

  const handleLeftSelect = useCallback((id: string) => {
    setLeftSelected(id);
    setLeftSubCollapsed(false);
  }, []);

  const handleRightSelect = useCallback((id: string) => {
    setRightSelected(id);
    setRightSubCollapsed(false);
  }, []);

  return (
    <div className="app-shell">
      <TopMainBar />
      <TopSubBar />

      <div
        className="app-shell__middle"
        data-left-main-collapsed={leftMainCollapsed ? '' : undefined}
        data-right-main-collapsed={rightMainCollapsed ? '' : undefined}
        data-left-sub-collapsed={leftSubCollapsed ? '' : undefined}
        data-right-sub-collapsed={rightSubCollapsed ? '' : undefined}
        data-left-sub-split={leftSubWidthMode === 'split' ? '' : undefined}
      >
        <LeftMainPanel
          selectedId={leftSelected}
          collapsed={leftMainCollapsed}
          onSelect={handleLeftSelect}
          onToggleCollapse={() => {
            setLeftMainCollapsed((value) => {
              const next = !value;
              if (next) {
                setLeftSubCollapsed(true);
              }
              return next;
            });
          }}
        />
        <div className="app-shell__sub-slot app-shell__sub-slot--left">
          {!leftSubCollapsed ? (
            <LeftSubPanel
              selectedId={leftSelected}
              onToggleShellCollapse={() => { setLeftSubCollapsed(true); }}
              onSubWidthModeChange={handleLeftSubWidthMode}
            />
          ) : null}
        </div>
        <ViewportFrame />
        <div className="app-shell__sub-slot app-shell__sub-slot--right">
          {!rightSubCollapsed ? (
            <RightSubPanel
              selectedId={rightSelected}
              onToggleShellCollapse={() => { setRightSubCollapsed(true); }}
            />
          ) : null}
        </div>
        <RightMainPanel
          selectedId={rightSelected}
          collapsed={rightMainCollapsed}
          onSelect={handleRightSelect}
          onToggleCollapse={() => {
            setRightMainCollapsed((value) => {
              const next = !value;
              if (next) {
                setRightSubCollapsed(true);
              }
              return next;
            });
          }}
        />
      </div>

      <StatusBar />
    </div>
  );
}
