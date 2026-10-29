import { useState } from 'react';
import { parseHexColor, rgbToHex } from '@/colors/color-format';
import { defaultBlockParams } from '@/scene/asset-block';
import {
  defaultFabricClothParams,
  isFabricClothAssetKind,
  isFabricClothBakedAssetKind,
} from '@/scene/asset-fabric-cloth';
import { formatFabricClothBakedMeshSubtitle } from '@/scene/user-baked-asset';
import {
  computeFaceSize,
  resolveAssetAspectRatio,
  resolveEntityImagePixels,
} from '@/scene/asset-ui-helpers';
import { defaultWallParams } from '@/scene/asset-wall';
import { formatMmAsMeters, LENGTH_DECIMALS, mmToM, mToMm } from '@/units/length';
import { PanelAxisField } from '@/ui/components/PanelAxisField/PanelAxisField';
import { MATERIAL_FABRIC_ID } from '@/scene/material-ids';
import { ColorPicker } from '@/ui/components/ColorPicker';
import { PanelCheckbox } from '@/ui/components/PanelCheckbox';
import { RangeSlider } from '@/ui/components/RangeSlider';
import { SubPanelSection } from '@/ui/components/SubPanelSection';
import {
  FABRIC_CLOTH_PHYSICS_TUNING,
  FABRIC_PHYSICS_PRESET_KEYS,
  FABRIC_PHYSICS_PRESETS,
  fabricClothPhysicsParamsFromPresetKey,
  fabricClothPhysicsPresetDisplayName,
  fabricClothPhysicsWithCustomScalar,
} from '@/config/fabric-physics-presets';
import { ImageSelect } from '@/ui/panels/ImageSurfaceFields';
import { MaterialSelect } from '@/ui/panels/MaterialSelect';
import { EntityDimensionsSection } from '@/ui/panels/entity-fields/EntityDimensionsSection';
import { parseMmInput } from '@/ui/panels/entity-fields/field-input-helpers';
import {
  setAssetScreenImage,
  setFabricClothActivePinCorner,
  setFabricClothParams,
} from '@/ui/store/app-store';
import { useAppStore } from '@/ui/store/use-app-store';
import type { PictureFieldsProps } from './entity-fields-types';

export function FabricClothFields({
  entity,
  images,
  screenImageFieldId,
  dimensionsReadOnly = false,
}: PictureFieldsProps & { dimensionsReadOnly?: boolean }) {
  const materials = useAppStore((s) => s.materials);
  const worldPhysicsPhase = useAppStore((s) => s.physics.worldPhysicsPhase);
  const bakedMeshSubtitle = useAppStore((s) => {
    if (!isFabricClothBakedAssetKind(entity.assetKind) || !entity.userBakedAssetId) {
      return null;
    }
    const userAsset = s.userBakedAssets.find((a) => a.id === entity.userBakedAssetId);
    return userAsset ? formatFabricClothBakedMeshSubtitle(userAsset.mesh) : null;
  });
  const slots = entity.materials;
  const fabricClothParams = {
    ...defaultFabricClothParams(),
    ...entity.fabricClothParams,
  };
  const physics = fabricClothParams.physics;
  const pinnedCornersCount = fabricClothParams.sim.pinnedCornersCount;
  const [pinSelection, setPinSelection] = useState({ entityId: entity.id, corner: 0 });
  const showPins = isFabricClothAssetKind(entity.assetKind);
  const activePinCorner =
    pinSelection.entityId === entity.id
      ? Math.min(pinSelection.corner, Math.max(0, pinnedCornersCount - 1))
      : 0;

  const borderRgb =
    parseHexColor(fabricClothParams.borderColor) ?? { r: 0.23, g: 0.23, b: 0.23 };
  const imagePixels = resolveEntityImagePixels(entity, images);
  const aspect = resolveAssetAspectRatio(
    entity.assetKind,
    imagePixels.width,
    imagePixels.height,
    entity,
  );
  const faceSize = computeFaceSize(
    entity.assetKind,
    imagePixels.width,
    imagePixels.height,
    entity.sizeScale,
    entity.wallParams ?? defaultWallParams(),
    entity.blockParams ?? defaultBlockParams(),
    entity,
  );

  return (
    <>
      <SubPanelSection title="Image">
        <ImageSelect
          id={screenImageFieldId}
          label="Image"
          value={entity.screenImageId}
          images={images}
          onChange={(imageId) => { setAssetScreenImage(entity.id, imageId); }}
        />
      </SubPanelSection>

      <SubPanelSection title="Material">
        <MaterialSelect
          entityId={entity.id}
          slot="fabricClothMaterialId"
          label="Fabric material"
          value={slots?.fabricClothMaterialId ?? MATERIAL_FABRIC_ID}
          materials={materials}
          excludeKinds={['transmission']}
        />
      </SubPanelSection>

      {showPins ? (
        <SubPanelSection title="Fabric simulation">
          <label className="panel-field">
            <span className="panel-field-label">Pinned corners</span>
            <select
              className="panel-select"
              value={pinnedCornersCount}
              onChange={(event) => {
                const count = Number.parseInt(event.target.value, 10);
                setPinSelection((prev) => ({
                  entityId: entity.id,
                  corner: Math.min(prev.corner, Math.max(0, count - 1)),
                }));
                setFabricClothParams(entity.id, {
                  sim: { ...fabricClothParams.sim, pinnedCornersCount: count },
                });
              }}
            >
              <option value={0}>0 — free fall / tablecloth</option>
              <option value={1}>1 corner pinned</option>
              <option value={2}>2 corners pinned (hanging)</option>
              <option value={3}>3 corners pinned</option>
              <option value={4}>4 corners pinned</option>
            </select>
          </label>
          <div className="grid grid-cols-4 gap-1">
            {[0, 1, 2, 3].map((idx) => {
              const enabled = idx < pinnedCornersCount;
              const active = idx === activePinCorner && enabled;
              return (
                <button
                  key={idx}
                  type="button"
                  className={`btn btn-xs ${active ? 'btn-primary' : enabled ? 'btn-outline btn-primary' : 'btn-ghost opacity-60'}`}
                  disabled={!enabled}
                  onClick={() => {
                    setPinSelection({ entityId: entity.id, corner: idx });
                    setFabricClothActivePinCorner(entity.id, idx);
                  }}
                >
                  {idx + 1}
                </button>
              );
            })}
          </div>
          {worldPhysicsPhase !== 'idle' ? (
            <p className="panel-hint">
              During world physics, move pins with Translate — entity transform stays locked.
            </p>
          ) : null}

          <div className="panel-field">
            <span className="panel-field-label">Fabric behavior</span>
            <p className="panel-hint mb-1">
              Preset: {fabricClothPhysicsPresetDisplayName(physics.activePreset)}
            </p>
            <div className="grid grid-cols-2 gap-1">
              {FABRIC_PHYSICS_PRESET_KEYS.map((key) => {
                const active = physics.activePreset === key;
                return (
                  <button
                    key={key}
                    type="button"
                    className={`btn btn-xs ${active ? 'btn-primary' : 'btn-outline btn-primary'}`}
                    onClick={() => {
                      setFabricClothParams(entity.id, {
                        physics: fabricClothPhysicsParamsFromPresetKey(key),
                      });
                    }}
                  >
                    {FABRIC_PHYSICS_PRESETS[key].name}
                  </button>
                );
              })}
            </div>
          </div>

          <RangeSlider
            label="Bending stiffness"
            min={FABRIC_CLOTH_PHYSICS_TUNING.bendingStiffness.min}
            max={FABRIC_CLOTH_PHYSICS_TUNING.bendingStiffness.max}
            step={FABRIC_CLOTH_PHYSICS_TUNING.bendingStiffness.step}
            value={physics.bendingStiffness}
            valueInputDecimals={FABRIC_CLOTH_PHYSICS_TUNING.bendingStiffness.decimals}
            onChange={(value) => {
              setFabricClothParams(entity.id, {
                physics: fabricClothPhysicsWithCustomScalar(physics, 'bendingStiffness', value),
              });
            }}
          />
          <RangeSlider
            label="Gravity"
            min={FABRIC_CLOTH_PHYSICS_TUNING.gravityMagnitude.min}
            max={FABRIC_CLOTH_PHYSICS_TUNING.gravityMagnitude.max}
            step={FABRIC_CLOTH_PHYSICS_TUNING.gravityMagnitude.step}
            value={physics.gravityMagnitude}
            valueInputDecimals={FABRIC_CLOTH_PHYSICS_TUNING.gravityMagnitude.decimals}
            onChange={(value) => {
              setFabricClothParams(entity.id, {
                physics: fabricClothPhysicsWithCustomScalar(physics, 'gravityMagnitude', value),
              });
            }}
          />
          <RangeSlider
            label="Damping"
            min={FABRIC_CLOTH_PHYSICS_TUNING.damping.min}
            max={FABRIC_CLOTH_PHYSICS_TUNING.damping.max}
            step={FABRIC_CLOTH_PHYSICS_TUNING.damping.step}
            value={physics.damping}
            valueInputDecimals={FABRIC_CLOTH_PHYSICS_TUNING.damping.decimals}
            onChange={(value) => {
              setFabricClothParams(entity.id, {
                physics: fabricClothPhysicsWithCustomScalar(physics, 'damping', value),
              });
            }}
          />
          <RangeSlider
            label="Friction"
            min={FABRIC_CLOTH_PHYSICS_TUNING.friction.min}
            max={FABRIC_CLOTH_PHYSICS_TUNING.friction.max}
            step={FABRIC_CLOTH_PHYSICS_TUNING.friction.step}
            value={physics.friction}
            valueInputDecimals={FABRIC_CLOTH_PHYSICS_TUNING.friction.decimals}
            onChange={(value) => {
              setFabricClothParams(entity.id, {
                physics: fabricClothPhysicsWithCustomScalar(physics, 'friction', value),
              });
            }}
          />
          {worldPhysicsPhase !== 'idle' ? (
            <p className="panel-hint">
              Presets and sliders apply live during world physics.
            </p>
          ) : null}
        </SubPanelSection>
      ) : null}

      <SubPanelSection title="Border">
        <PanelCheckbox
          label="Enable"
          checked={fabricClothParams.borderEnabled}
          onChange={(checked) => {
            setFabricClothParams(entity.id, { borderEnabled: checked });
          }}
        />
        {fabricClothParams.borderEnabled ? (
          <>
            <PanelAxisField
              label="Width"
              unit="m"
              value={mToMm(fabricClothParams.borderWidthM)}
              format={(mm) => formatMmAsMeters(mm, LENGTH_DECIMALS)}
              parse={parseMmInput}
              onChange={(mm) => {
                setFabricClothParams(entity.id, { borderWidthM: mmToM(mm) });
              }}
            />
            <ColorPicker
              label="Color"
              value={borderRgb}
              onChange={(color) => {
                setFabricClothParams(entity.id, { borderColor: rgbToHex(color) });
              }}
            />
          </>
        ) : null}
      </SubPanelSection>

      <EntityDimensionsSection
        entity={entity}
        faceSize={faceSize}
        aspect={aspect}
        mode="faceOnly"
        dimensionsReadOnly={dimensionsReadOnly}
      />
      {bakedMeshSubtitle ? (
        <p className="panel-hint">Mesh: {bakedMeshSubtitle}</p>
      ) : null}
    </>
  );
}
