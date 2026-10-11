import { useState } from 'react';
import { GroundSettingsSection } from './GroundSettingsSection';
import { SceneEntityBlock } from './SceneEntityBlock';
import { ColorPicker } from '@/ui/components/ColorPicker';
import { DualRangeSlider, RangeSlider } from '@/ui/components/RangeSlider';
import { SubPanel } from '@/ui/components/SubPanel';
import { LENGTH_DECIMALS, LENGTH_STEP_M } from '@/units/length';
import { NORMALIZED_DECIMALS, NORMALIZED_STEP } from '@/units/normalized';
import {
  setFogColor,
  setFogDistances,
  setFogEnabled,
  setReflectionEnabled,
  setReflectionIntensity,
  setSkyEnabled,
  setSkyGradientFade,
  setSkyHorizonColor,
  setSkyZenithColor,
  setGroundVisible,
} from '@/ui/store/app-store';
import { useAppStore } from '@/ui/store/use-app-store';

const ENV_BLOCK_IDS = {
  sky: 'env-sky',
  reflections: 'env-reflections',
  fog: 'env-fog',
  ground: 'env-ground',
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
  const groundVisible = useAppStore((s) => s.ground.visible);

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
          onToggleCollapse={() => toggleCollapsed(ENV_BLOCK_IDS.sky)}
          onToggleEnabled={() => setSkyEnabled(!skyEnabled)}
        >
          <ColorPicker
            label="Horizon color"
            value={skyHorizonColor}
            disabled={!skyEnabled}
            onChange={setSkyHorizonColor}
          />
          <ColorPicker
            label="Zenith color"
            value={skyZenithColor}
            disabled={!skyEnabled}
            onChange={setSkyZenithColor}
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
            onChange={setSkyGradientFade}
          />
        </SceneEntityBlock>

        <SceneEntityBlock
          title="Reflections"
          enabled={reflectionEnabled}
          collapsed={collapsedIds.has(ENV_BLOCK_IDS.reflections)}
          onToggleCollapse={() => toggleCollapsed(ENV_BLOCK_IDS.reflections)}
          onToggleEnabled={() => setReflectionEnabled(!reflectionEnabled)}
        >
          <RangeSlider
            label="Reflection intensity"
            min={0}
            max={2}
            step={NORMALIZED_STEP}
            value={reflectionIntensity}
            valueInputLabel="Intensity"
            valueInputDecimals={NORMALIZED_DECIMALS}
            disabled={!reflectionEnabled}
            onChange={setReflectionIntensity}
          />
        </SceneEntityBlock>

        <SceneEntityBlock
          title="Fog"
          enabled={fogEnabled}
          collapsed={collapsedIds.has(ENV_BLOCK_IDS.fog)}
          onToggleCollapse={() => toggleCollapsed(ENV_BLOCK_IDS.fog)}
          onToggleEnabled={() => setFogEnabled(!fogEnabled)}
        >
          <ColorPicker
            label="Fog color"
            value={fogColor}
            disabled={!fogEnabled}
            onChange={setFogColor}
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
            onChange={({ low, high }) => setFogDistances(low, high)}
          />
        </SceneEntityBlock>

        <SceneEntityBlock
          title="Ground"
          enabled={groundVisible}
          collapsed={collapsedIds.has(ENV_BLOCK_IDS.ground)}
          onToggleCollapse={() => toggleCollapsed(ENV_BLOCK_IDS.ground)}
          onToggleEnabled={() => setGroundVisible(!groundVisible)}
        >
          <GroundSettingsSection disabled={!groundVisible} />
        </SceneEntityBlock>
      </div>
    </SubPanel>
  );
}
