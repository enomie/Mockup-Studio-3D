import { useState } from 'react';
import { SceneEntityBlock } from './SceneEntityBlock';
import { PanelCheckbox } from '@/ui/components/PanelCheckbox';
import {
  isAnyViewportHelperEnabled,
  setViewportHelperCompassArrows,
  setViewportHelperFloorGrid,
  setViewportHelperLightHandles,
  setViewportHelperQuadrantGrid,
  setViewportHelperWorldOrigin,
  toggleViewportHelpersAll,
} from '@/ui/store/app-store';
import { useAppStore } from '@/ui/store/use-app-store';

/** Viewport-only aids (grids, origin, compass, spot beams); not part of environments or exports. */
export function ViewportHelpersBlock() {
  const viewportHelpers = useAppStore((s) => s.viewportHelpers);
  const [collapsed, setCollapsed] = useState(false);

  return (
    <SceneEntityBlock
      title="Viewport helpers"
      enabled={isAnyViewportHelperEnabled(viewportHelpers)}
      collapsed={collapsed}
      onToggleCollapse={() => { setCollapsed((prev) => !prev); }}
      onToggleEnabled={toggleViewportHelpersAll}
    >
      <PanelCheckbox
        label="Floor grid"
        checked={viewportHelpers.floorGrid}
        onChange={setViewportHelperFloorGrid}
      />
      <PanelCheckbox
        label="Quadrant grid"
        checked={viewportHelpers.quadrantGrid}
        onChange={setViewportHelperQuadrantGrid}
      />
      <PanelCheckbox
        label="World origin"
        checked={viewportHelpers.worldOrigin}
        onChange={setViewportHelperWorldOrigin}
      />
      <PanelCheckbox
        label="Compass arrows"
        checked={viewportHelpers.compassArrows}
        onChange={setViewportHelperCompassArrows}
      />
      <PanelCheckbox
        label="Spot beams"
        checked={viewportHelpers.lightHandles}
        onChange={setViewportHelperLightHandles}
      />
    </SceneEntityBlock>
  );
}
