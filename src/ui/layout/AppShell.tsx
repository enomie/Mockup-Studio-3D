import { useState } from 'react';
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

  return (
    <div className="app-shell">
      <TopMainBar />
      <TopSubBar />

      <div
        className="app-shell__middle"
        data-left-main-collapsed={leftMainCollapsed ? '' : undefined}
        data-right-main-collapsed={rightMainCollapsed ? '' : undefined}
      >
        <LeftMainPanel
          selectedId={leftSelected}
          collapsed={leftMainCollapsed}
          onSelect={setLeftSelected}
          onToggleCollapse={() => setLeftMainCollapsed((value) => !value)}
        />
        <LeftSubPanel selectedId={leftSelected} />
        <ViewportFrame />
        <RightSubPanel selectedId={rightSelected} />
        <RightMainPanel
          selectedId={rightSelected}
          collapsed={rightMainCollapsed}
          onSelect={setRightSelected}
          onToggleCollapse={() => setRightMainCollapsed((value) => !value)}
        />
      </div>

      <StatusBar />
    </div>
  );
}
