import { useCallback, useState } from 'react';
import { ViewportFrame } from '@/ui/components/ViewportFrame';
import { useCameraViewShortcuts } from '@/ui/hooks/useCameraViewShortcuts';
import { useViewportToolShortcuts } from '@/ui/hooks/useViewportToolShortcuts';
import { usePatchPointClipboardShortcuts } from '@/ui/hooks/usePatchPointClipboardShortcuts';
import { useUndoRedoShortcuts } from '@/ui/hooks/useUndoRedoShortcuts';
import { LeftDetailPanel } from '@/ui/shell/LeftDetailPanel';
import { LeftMainPanel } from '@/ui/shell/LeftMainPanel';
import { LeftSubPanel } from '@/ui/shell/LeftSubPanel';
import { RightMainPanel } from '@/ui/shell/RightMainPanel';
import { RightDetailPanel } from '@/ui/shell/RightDetailPanel';
import { RightSubPanel } from '@/ui/shell/RightSubPanel';
import { StatusBar } from '@/ui/shell/StatusBar';
import { TopMainBar } from '@/ui/shell/TopMainBar';
import { TopSubBar } from '@/ui/shell/TopSubBar';

export function AppShell() {
  useViewportToolShortcuts();
  usePatchPointClipboardShortcuts();
  useUndoRedoShortcuts();
  useCameraViewShortcuts();

  const [leftSelected, setLeftSelected] = useState('assets');
  const [rightSelected, setRightSelected] = useState('scene');
  const [leftMainCollapsed, setLeftMainCollapsed] = useState(false);
  const [rightMainCollapsed, setRightMainCollapsed] = useState(false);
  const [leftSubCollapsed, setLeftSubCollapsed] = useState(false);
  const [rightSubCollapsed, setRightSubCollapsed] = useState(false);

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

      <div className="app-shell__middle">
        <ViewportFrame />

        {/* Panels float over the viewport; only the collapsed icon rails reserve space. */}
        <div className="app-shell__overlay app-shell__overlay--left">
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
          <div className="app-shell__sub-slot">
            {!leftSubCollapsed ? (
              <LeftSubPanel
                selectedId={leftSelected}
                onToggleShellCollapse={() => { setLeftSubCollapsed(true); }}
              />
            ) : null}
          </div>
          <div className="app-shell__sub-slot">
            {!leftSubCollapsed ? <LeftDetailPanel selectedId={leftSelected} /> : null}
          </div>
        </div>

        <div className="app-shell__overlay app-shell__overlay--right">
          <div className="app-shell__sub-slot">
            {!rightSubCollapsed ? <RightDetailPanel selectedId={rightSelected} /> : null}
          </div>
          <div className="app-shell__sub-slot">
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
      </div>

      <StatusBar />
    </div>
  );
}
