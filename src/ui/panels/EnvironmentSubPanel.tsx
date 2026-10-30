import { useState } from 'react';
import { GroundSettingsSection } from './GroundSettingsSection';
import { SceneEntityBlock } from './SceneEntityBlock';
import { ColorPicker } from '@/ui/components/ColorPicker';
import { DualRangeSlider, RangeSlider } from '@/ui/components/RangeSlider';
import { PanelCheckbox } from '@/ui/components/PanelCheckbox';
import { PanelSelect } from '@/ui/components/PanelSelect';
import type { ReflectionSource } from '@/scene/scene-api';
import { SubPanel } from '@/ui/components/SubPanel';
import { LENGTH_DECIMALS, LENGTH_STEP_M } from '@/units/length';
import { NORMALIZED_DECIMALS, NORMALIZED_STEP } from '@/units/normalized';
import {
  setGroundVisible,
  setViewportHelperFloorGrid,
  setViewportHelperCompassArrows,
  setViewportHelperQuadrantGrid,
  setViewportHelperLightHandles,
  setViewportHelperWorldOrigin,
  isAnyViewportHelperEnabled,
  toggleViewportHelpersAll,
  setEnvironment,
} from '@/ui/store/app-store';
import { useAppStore } from '@/ui/store/use-app-store';

const ENV_BLOCK_IDS = {
  sky: 'env-sky',
  reflections: 'env-reflections',
  fog: 'env-fog',
  ground: 'env-ground',
  viewportHelpers: 'env-viewport-helpers',
} as const;

export function EnvironmentSubPanel() {
  const skyEnabled = useAppStore((s) => s.skyEnabled);
  const skyHorizonColor = useAppStore((s) => s.skyHorizonColor);
  const skyZenithColor = useAppStore((s) => s.skyZenithColor);
  const skyGradientFade = useAppStore((s) => s.skyGradientFade);
  const fogEnabled = useAppStore((s) => s.fogEnabled);
  const fogColor = useAppStore((s) => s.fogColor);
  const fogNear = useAppStore((s) => s.fogNear);
  const fogFar = useAppStore((s) => s.fogFar);
  const reflectionEnabled = useAppStore((s) => s.reflectionEnabled);
  const reflectionIntensity = useAppStore((s) => s.reflectionIntensity);
  const reflectionSource = useAppStore((s) => s.reflectionSource);
  const groundVisible = useAppStore((s) => s.ground.visible);
  const viewportHelpers = useAppStore((s) => s.viewportHelpers);

  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(() => new Set());

  const toggleCollapsed = (id: string) => {
    setCollapsedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  return (
    <SubPanel title="Environment" side="right">
      <div className="panel-stack">
        <SceneEntityBlock
          title="Sky"
          enabled={skyEnabled}
          collapsed={collapsedIds.has(ENV_BLOCK_IDS.sky)}
          onToggleCollapse={() => { toggleCollapsed(ENV_BLOCK_IDS.sky); }}
          onToggleEnabled={() => { setEnvironment({ skyEnabled: !skyEnabled }); }}
        >
          <ColorPicker
            label="Horizon color"
            value={skyHorizonColor}
            disabled={!skyEnabled}
            onChange={(value) => { setEnvironment({ skyHorizonColor: value }); }}
          />
          <ColorPicker
            label="Zenith color"
            value={skyZenithColor}
            disabled={!skyEnabled}
            onChange={(value) => { setEnvironment({ skyZenithColor: value }); }}
          />
          <RangeSlider
            label="Horizon fade"
            min={0}
            max={1}
            step={0.01}
            value={skyGradientFade}
            valueInputLabel="Fade"
            valueInputDecimals={0}
            valueUnit="%"
            valueDisplayScale={100}
            disabled={!skyEnabled}
            onChange={(value) => { setEnvironment({ skyGradientFade: value }); }}
          />
        </SceneEntityBlock>

        <SceneEntityBlock
          title="Reflections"
          enabled={reflectionEnabled}
          collapsed={collapsedIds.has(ENV_BLOCK_IDS.reflections)}
          onToggleCollapse={() => { toggleCollapsed(ENV_BLOCK_IDS.reflections); }}
          onToggleEnabled={() => { setEnvironment({ reflectionEnabled: !reflectionEnabled }); }}
        >
          <PanelSelect
            label="Source"
            id="env-reflection-source"
            value={reflectionSource}
            disabled={!reflectionEnabled}
            options={[
              { value: 'studio', label: 'Studio' },
              { value: 'sky', label: 'Sky' },
            ]}
            onChange={(next) => { setEnvironment({ reflectionSource: next as ReflectionSource }); }}
          />
          <RangeSlider
            label="Reflection intensity"
            min={0}
            max={2}
            step={NORMALIZED_STEP}
            value={reflectionIntensity}
            valueInputLabel="Intensity"
            valueInputDecimals={NORMALIZED_DECIMALS}
            disabled={!reflectionEnabled}
            onChange={(value) => { setEnvironment({ reflectionIntensity: value }); }}
          />
        </SceneEntityBlock>

        <SceneEntityBlock
          title="Fog"
          enabled={fogEnabled}
          collapsed={collapsedIds.has(ENV_BLOCK_IDS.fog)}
          onToggleCollapse={() => { toggleCollapsed(ENV_BLOCK_IDS.fog); }}
          onToggleEnabled={() => { setEnvironment({ fogEnabled: !fogEnabled }); }}
        >
          <ColorPicker
            label="Fog color"
            value={fogColor}
            disabled={!fogEnabled}
            onChange={(value) => { setEnvironment({ fogColor: value }); }}
          />
          <DualRangeSlider
            min={LENGTH_STEP_M}
            max={100}
            step={LENGTH_STEP_M}
            valueLow={fogNear}
            valueHigh={fogFar}
            lowLabel="Near"
            highLabel="Far"
            valueInputDecimals={LENGTH_DECIMALS}
            valueUnit="m"
            disabled={!fogEnabled}
            onChange={({ low, high }) => { setEnvironment({ fogNear: low, fogFar: high }); }}
          />
        </SceneEntityBlock>

        <SceneEntityBlock
          title="Ground"
          enabled={groundVisible}
          collapsed={collapsedIds.has(ENV_BLOCK_IDS.ground)}
          onToggleCollapse={() => { toggleCollapsed(ENV_BLOCK_IDS.ground); }}
          onToggleEnabled={() => { setGroundVisible(!groundVisible); }}
        >
          <GroundSettingsSection disabled={!groundVisible} />
        </SceneEntityBlock>

        <SceneEntityBlock
          title="Viewport helpers"
          enabled={isAnyViewportHelperEnabled(viewportHelpers)}
          collapsed={collapsedIds.has(ENV_BLOCK_IDS.viewportHelpers)}
          onToggleCollapse={() => { toggleCollapsed(ENV_BLOCK_IDS.viewportHelpers); }}
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
      </div>
    </SubPanel>
  );
}
