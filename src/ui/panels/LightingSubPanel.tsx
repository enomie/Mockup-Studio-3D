import { useState } from 'react';
import { LIGHT_AMBIENT_ID, LIGHT_FILL_ID, LIGHT_KEY_ID } from '@/scene/light-ids';
import {
  LIGHT_ANGLE_STEP,
  LIGHT_AZIMUTH_MAX,
  LIGHT_AZIMUTH_MIN,
  LIGHT_ELEVATION_MAX,
  LIGHT_ELEVATION_MIN,
  LIGHT_INTENSITY_MAX,
  LIGHT_INTENSITY_MIN,
  SHADOW_SOFTNESS_MAX,
  SHADOW_SOFTNESS_MIN,
  SHADOW_SOFTNESS_STEP,
} from '@/constants';
import { NORMALIZED_DECIMALS, NORMALIZED_STEP } from '@/units/normalized';
import { ColorPicker } from '@/ui/components/ColorPicker';
import { PanelCheckbox } from '@/ui/components/PanelCheckbox';
import { RangeSlider } from '@/ui/components/RangeSlider';
import { SubPanel } from '@/ui/components/SubPanel';
import { SubPanelSection } from '@/ui/components/SubPanelSection';
import { SceneEntityBlock } from './SceneEntityBlock';
import {
  setAmbientColor,
  setAmbientEnabled,
  setAmbientIntensity,
  setFillCastShadow,
  setFillColor,
  setFillDistance,
  setFillEnabled,
  setFillAzimuth,
  setFillElevation,
  setFillIntensity,
  setFillShadowSoftness,
  setKeyCastShadow,
  setKeyColor,
  setKeyEnabled,
  setKeyIntensity,
  setKeyShadowSoftness,
  setKeyAzimuth,
  setKeyElevation,
  setFixturesReflectInMirror,
  setSelectedEntity,
  setShowLightFixtures,
} from '@/ui/store/app-store';
import { useAppStore } from '@/ui/store/use-app-store';

const LIGHT_BLOCK_IDS = new Set<string>([LIGHT_AMBIENT_ID, LIGHT_KEY_ID, LIGHT_FILL_ID]);

export function LightingSubPanel() {
  const lighting = useAppStore((s) => s.lighting);
  const ground = useAppStore((s) => s.ground);
  const selectedEntityId = useAppStore((s) => s.selectedEntityId);
  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(() => new Set());
  const [prevSelectedEntityId, setPrevSelectedEntityId] = useState(selectedEntityId);

  if (selectedEntityId !== prevSelectedEntityId) {
    setPrevSelectedEntityId(selectedEntityId);
    if (selectedEntityId && LIGHT_BLOCK_IDS.has(selectedEntityId)) {
      setCollapsedIds((prev) => {
        if (!prev.has(selectedEntityId)) {return prev;}
        const next = new Set(prev);
        next.delete(selectedEntityId);
        return next;
      });
    }
  }

  const toggleCollapsed = (blockId: string): void => {
    setCollapsedIds((prev) => {
      const next = new Set(prev);
      if (next.has(blockId)) {
        next.delete(blockId);
      } else {
        next.add(blockId);
      }
      return next;
    });
  };

  const handleLightTitleClick = (lightId: string, isSelected: boolean): void => {
    setSelectedEntity(isSelected ? null : lightId);
  };

  return (
    <SubPanel title="Lighting" side="right">
      <SubPanelSection title="Fixtures">
        <PanelCheckbox
          label="Show fixtures"
          checked={lighting.showFixtures}
          onChange={setShowLightFixtures}
        />
        <PanelCheckbox
          label="Reflect in mirror floor"
          checked={lighting.fixturesReflectInMirror}
          disabled={!ground.mirrorEnabled}
          onChange={setFixturesReflectInMirror}
        />
        {!ground.mirrorEnabled ? (
          <p className="panel-hint">
            Turn on mirror floor in Environment → Ground.
          </p>
        ) : null}
      </SubPanelSection>

      <div className="panel-stack">
        <SceneEntityBlock
          title="Ambient Light"
          enabled={lighting.ambient.enabled}
          collapsed={collapsedIds.has(LIGHT_AMBIENT_ID)}
          onToggleCollapse={() => { toggleCollapsed(LIGHT_AMBIENT_ID); }}
          onToggleEnabled={() => { setAmbientEnabled(!lighting.ambient.enabled); }}
        >
          <ColorPicker
            label="Color"
            value={lighting.ambient.color}
            onChange={setAmbientColor}
          />
          <RangeSlider
            label="Intensity"
            min={0}
            max={1}
            step={NORMALIZED_STEP}
            value={lighting.ambient.intensity}
            valueInputLabel="Intensity"
            valueInputDecimals={NORMALIZED_DECIMALS}
            onChange={setAmbientIntensity}
          />
        </SceneEntityBlock>

        <SceneEntityBlock
          title="Key Light"
          enabled={lighting.key.enabled}
          collapsed={collapsedIds.has(LIGHT_KEY_ID)}
          selected={selectedEntityId === LIGHT_KEY_ID}
          selectable
          onToggleCollapse={() => { toggleCollapsed(LIGHT_KEY_ID); }}
          onToggleEnabled={() => { setKeyEnabled(!lighting.key.enabled); }}
          onTitleClick={() => { handleLightTitleClick(LIGHT_KEY_ID, selectedEntityId === LIGHT_KEY_ID); }
          }
        >
          <RangeSlider
            label="Angle"
            min={LIGHT_AZIMUTH_MIN}
            max={LIGHT_AZIMUTH_MAX}
            step={LIGHT_ANGLE_STEP}
            value={lighting.key.azimuthDeg}
            valueInputLabel="Angle (°)"
            valueInputDecimals={0}
            onChange={setKeyAzimuth}
          />
          <RangeSlider
            label="Height"
            min={LIGHT_ELEVATION_MIN}
            max={LIGHT_ELEVATION_MAX}
            step={LIGHT_ANGLE_STEP}
            value={lighting.key.elevationDeg}
            valueInputLabel="Height (°)"
            valueInputDecimals={0}
            onChange={setKeyElevation}
          />
          <PanelCheckbox
            label="Cast shadows"
            checked={lighting.key.castShadow}
            disabled={!lighting.key.enabled}
            onChange={setKeyCastShadow}
          />
          <RangeSlider
            label="Softness"
            min={SHADOW_SOFTNESS_MIN}
            max={SHADOW_SOFTNESS_MAX}
            step={SHADOW_SOFTNESS_STEP}
            value={lighting.key.shadowSoftness}
            valueInputLabel="Softness"
            valueInputDecimals={1}
            disabled={!lighting.key.enabled || !lighting.key.castShadow}
            onChange={setKeyShadowSoftness}
          />
          <ColorPicker label="Color" value={lighting.key.color} onChange={setKeyColor} />
          <RangeSlider
            label="Intensity"
            min={LIGHT_INTENSITY_MIN}
            max={LIGHT_INTENSITY_MAX}
            step={NORMALIZED_STEP}
            value={lighting.key.intensity}
            valueInputLabel="Intensity"
            valueInputDecimals={NORMALIZED_DECIMALS}
            onChange={setKeyIntensity}
          />
        </SceneEntityBlock>

        <SceneEntityBlock
          title="Fill Light"
          enabled={lighting.fill.enabled}
          collapsed={collapsedIds.has(LIGHT_FILL_ID)}
          selected={selectedEntityId === LIGHT_FILL_ID}
          selectable
          onToggleCollapse={() => { toggleCollapsed(LIGHT_FILL_ID); }}
          onToggleEnabled={() => { setFillEnabled(!lighting.fill.enabled); }}
          onTitleClick={() => { handleLightTitleClick(LIGHT_FILL_ID, selectedEntityId === LIGHT_FILL_ID); }
          }
        >
          <RangeSlider
            label="Angle"
            min={LIGHT_AZIMUTH_MIN}
            max={LIGHT_AZIMUTH_MAX}
            step={LIGHT_ANGLE_STEP}
            value={lighting.fill.azimuthDeg}
            valueInputLabel="Angle (°)"
            valueInputDecimals={0}
            onChange={setFillAzimuth}
          />
          <RangeSlider
            label="Height"
            min={LIGHT_ELEVATION_MIN}
            max={LIGHT_ELEVATION_MAX}
            step={LIGHT_ANGLE_STEP}
            value={lighting.fill.elevationDeg}
            valueInputLabel="Height (°)"
            valueInputDecimals={0}
            onChange={setFillElevation}
          />
          <PanelCheckbox
            label="Cast shadows"
            checked={lighting.fill.castShadow}
            disabled={!lighting.fill.enabled}
            onChange={setFillCastShadow}
          />
          <RangeSlider
            label="Softness"
            min={SHADOW_SOFTNESS_MIN}
            max={SHADOW_SOFTNESS_MAX}
            step={SHADOW_SOFTNESS_STEP}
            value={lighting.fill.shadowSoftness}
            valueInputLabel="Softness"
            valueInputDecimals={1}
            disabled={!lighting.fill.enabled || !lighting.fill.castShadow}
            onChange={setFillShadowSoftness}
          />
          <ColorPicker label="Color" value={lighting.fill.color} onChange={setFillColor} />
          <RangeSlider
            label="Intensity"
            min={LIGHT_INTENSITY_MIN}
            max={LIGHT_INTENSITY_MAX}
            step={NORMALIZED_STEP}
            value={lighting.fill.intensity}
            valueInputLabel="Intensity"
            valueInputDecimals={NORMALIZED_DECIMALS}
            onChange={setFillIntensity}
          />
          <RangeSlider
            label="Distance"
            min={0.5}
            max={3}
            step={NORMALIZED_STEP}
            value={lighting.fill.distance}
            valueInputLabel="Distance"
            valueInputDecimals={NORMALIZED_DECIMALS}
            onChange={setFillDistance}
          />
        </SceneEntityBlock>
      </div>
    </SubPanel>
  );
}
