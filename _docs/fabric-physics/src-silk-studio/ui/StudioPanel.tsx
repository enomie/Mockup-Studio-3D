import { APP_NAME, APP_VERSION } from '../app/version.ts';
import {
  getPresetLabel,
  useStudioStore,
} from '../state/studioStore.ts';
import { CLOTH_SIZE_MAX_M, CLOTH_SIZE_MIN_M } from '../config/clothSizeLimits.ts';
import {
  FABRIC_PRESET_KEYS,
  FABRIC_PRESETS,
} from '../config/fabricPresets.ts';
import {
  VIEWPORT_ASPECT_PRESETS,
  type ViewportAspectPresetId,
} from '../config/viewportAspect.ts';
import { RangeRow } from './RangeRow.tsx';
import { LayerListSection } from './LayerListSection.tsx';
import { ResetSection } from './ResetSection.tsx';
import { SimulationSection } from './SimulationSection.tsx';
import { ScenePropsSection } from './ScenePropsSection.tsx';
import { StudioLightsSection } from './StudioLightsSection.tsx';

export function StudioPanel(): React.ReactElement {
  const clothConfig = useStudioStore((s) => s.clothConfig);
  const fabricPhysics = useStudioStore((s) => s.fabricPhysics);
  const silkOptics = useStudioStore((s) => s.silkOptics);
  const pinnedCornersCount = useStudioStore((s) => s.pinnedCornersCount);
  const activeCornerGizmo = useStudioStore((s) => s.activeCornerGizmo);
  const showGrid = useStudioStore((s) => s.showGrid);
  const textureLoading = useStudioStore((s) => s.textureLoading);
  const textureError = useStudioStore((s) => s.textureError);
  const renderBackend = useStudioStore((s) => s.renderBackend);
  const viewportAspectPreset = useStudioStore((s) => s.viewportAspectPreset);

  const actions = useStudioStore();
  const enginePending = renderBackend === 'pending';

  return (
    <div className="flex flex-col gap-4 p-4 text-xs">
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <span className="status status-success status-xs animate-pulse" />
          <span className="text-sm font-bold tracking-tight">
            {APP_NAME} v{APP_VERSION}
          </span>
        </div>
      </div>

      <ResetSection />

      <SimulationSection />

      <div className="divider my-0" />
      <LayerListSection />

      <div className="divider my-0" />
      <ScenePropsSection />

      <div className="divider my-0" />
      <div className="space-y-2">
        <span className="text-[10px] font-semibold tracking-wider uppercase">Canvas format</span>
        <select
          className="select select-bordered select-xs w-full"
          value={viewportAspectPreset}
          onChange={(e) => {
            actions.setViewportAspectPreset(e.target.value as ViewportAspectPresetId);
          }}
        >
          {VIEWPORT_ASPECT_PRESETS.map((p) => (
            <option key={p.id} value={p.id}>
              {p.label}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-semibold tracking-wider uppercase">Choose image</span>
          {textureLoading ? (
            <span className="loading loading-spinner loading-xs text-primary" />
          ) : null}
        </div>
        <input
          type="file"
          accept="image/*"
          disabled={textureLoading || enginePending}
          className="file-input file-input-bordered file-input-xs w-full"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            actions.clearTextureError();
            actions.uploadTexture(file);
            e.target.value = '';
          }}
        />
        {textureError ? (
          <p className="text-[10px] text-error">{textureError}</p>
        ) : null}
      </div>

      <div className="divider my-0" />
      <div className="space-y-2">
        <span className="text-[10px] font-semibold tracking-wider uppercase">Cloth size</span>
        <div className="grid grid-cols-2 gap-2">
          <label className="form-control w-full">
            <span className="label py-0">
              <span className="label-text text-[10px]">Width (m)</span>
            </span>
            <input
              type="number"
              className="input input-bordered input-xs w-full font-mono"
              min={CLOTH_SIZE_MIN_M}
              max={CLOTH_SIZE_MAX_M}
              step={0.01}
              value={clothConfig.width}
              disabled={textureLoading || enginePending}
              onChange={(e) => {
                const v = parseFloat(e.target.value);
                if (Number.isFinite(v)) actions.setClothWidthMeters(v);
              }}
            />
          </label>
          <label className="form-control w-full">
            <span className="label py-0">
              <span className="label-text text-[10px]">Height (m)</span>
            </span>
            <input
              type="number"
              className="input input-bordered input-xs w-full font-mono"
              min={CLOTH_SIZE_MIN_M}
              max={CLOTH_SIZE_MAX_M}
              step={0.01}
              value={clothConfig.height}
              disabled={textureLoading || enginePending}
              onChange={(e) => {
                const v = parseFloat(e.target.value);
                if (Number.isFinite(v)) actions.setClothHeightMeters(v);
              }}
            />
          </label>
        </div>
      </div>

      <div className="divider my-0" />
      <div className="space-y-2">
        <div className="flex justify-between">
          <span className="text-[10px] font-semibold tracking-wider uppercase">Border / hem</span>
          <span className="font-mono text-[11px] text-primary">
            {clothConfig.borderThicknessMm} mm
          </span>
        </div>
        <div className="flex items-center gap-3">
          <input
            type="color"
            className="input input-bordered input-xs h-7 w-7 shrink-0 cursor-pointer p-0.5"
            value={clothConfig.borderColor}
            onChange={(e) => {
              actions.setBorderColor(e.target.value);
            }}
          />
          <input
            type="range"
            className="range range-primary range-xs flex-1"
            min={0}
            max={30}
            step={1}
            value={clothConfig.borderThicknessMm}
            onChange={(e) => {
              actions.setBorderMm(parseInt(e.target.value, 10));
            }}
          />
        </div>
      </div>

      <div className="divider my-0" />
      <div className="space-y-2">
        <span className="text-[10px] font-semibold tracking-wider uppercase">Pin corners</span>
        <select
          className="select select-bordered select-xs w-full"
          value={pinnedCornersCount}
          onChange={(e) => {
            actions.setPinnedCornersCount(parseInt(e.target.value, 10));
          }}
        >
          <option value={0}>0 corners (free fall / tablecloth)</option>
          <option value={1}>1 corner pinned</option>
          <option value={2}>2 corners pinned (hanging)</option>
          <option value={3}>3 corners pinned</option>
          <option value={4}>4 corners pinned</option>
        </select>
        <div className="grid grid-cols-4 gap-1">
          {[0, 1, 2, 3].map((idx) => {
            const active = idx === activeCornerGizmo && idx < pinnedCornersCount;
            const enabled = idx < pinnedCornersCount;
            return (
              <button
                key={idx}
                type="button"
                className={`btn btn-xs ${active ? 'btn-primary' : enabled ? 'btn-outline btn-primary' : 'btn-ghost opacity-60'}`}
                disabled={!enabled}
                onClick={() => {
                  actions.setActiveCorner(idx);
                }}
              >
                Corner {idx + 1}
              </button>
            );
          })}
        </div>
      </div>

      <div className="divider my-0" />
      <div className="space-y-2">
        <div className="flex justify-between">
          <span className="text-[10px] font-semibold tracking-wider uppercase">Fabric behavior</span>
          <span className="font-mono text-[10px] text-primary">
            {getPresetLabel(fabricPhysics.activePreset)}
          </span>
        </div>
        <div className="grid grid-cols-4 gap-1">
          {FABRIC_PRESET_KEYS.map((key) => (
            <button
              key={key}
              type="button"
              className={`btn btn-xs ${fabricPhysics.activePreset === key ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => {
                actions.applyPreset(key);
              }}
            >
              {FABRIC_PRESETS[key].name}
            </button>
          ))}
        </div>
        <RangeRow
          label="Bending stiffness"
          value={fabricPhysics.bendingStiffness}
          min={0}
          max={1}
          step={0.02}
          format={(v) => v.toFixed(2)}
          onChange={actions.setFabricBending}
        />
        <RangeRow
          label="Weight / gravity"
          value={fabricPhysics.gravityMagnitude}
          min={1}
          max={12}
          step={0.2}
          format={(v) => v.toFixed(1)}
          onChange={actions.setFabricGravity}
        />
        <RangeRow
          label="Air drag / damping"
          value={fabricPhysics.damping}
          min={0.92}
          max={0.995}
          step={0.002}
          format={(v) => v.toFixed(3)}
          onChange={actions.setFabricDamping}
        />
        <RangeRow
          label="Surface friction"
          value={fabricPhysics.friction}
          min={0.1}
          max={0.98}
          step={0.02}
          format={(v) => v.toFixed(2)}
          onChange={actions.setFabricFriction}
        />
      </div>

      <div className="divider my-0" />
      <div className="space-y-2">
        <div className="flex justify-between">
          <span className="text-[10px] font-semibold tracking-wider uppercase">Silk optics (PBR+)</span>
          <span className="text-[10px] font-semibold text-success">Anisotropy & sheen</span>
        </div>
        <RangeRow
          label="Fiber anisotropy"
          value={silkOptics.anisotropy}
          min={0}
          max={1}
          step={0.05}
          format={(v) => v.toFixed(2)}
          onChange={actions.setAnisotropy}
        />
        <RangeRow
          label="Weave angle (warp / weft)"
          value={(silkOptics.anisotropyRotation * 180) / Math.PI}
          min={0}
          max={180}
          step={5}
          format={(v) => `${String(Math.round(v))}°`}
          onChange={actions.setAnisotropyRotationDeg}
        />
        <RangeRow
          label="Edge sheen"
          value={silkOptics.sheen}
          min={0}
          max={1.5}
          step={0.05}
          format={(v) => v.toFixed(2)}
          onChange={actions.setSheen}
        />
        <RangeRow
          label="Iridescence"
          value={silkOptics.iridescence}
          min={0}
          max={1}
          step={0.05}
          format={(v) => v.toFixed(2)}
          onChange={actions.setIridescence}
        />
        <RangeRow
          label="Weave micro-detail"
          value={silkOptics.weaveDepth}
          min={0}
          max={1.5}
          step={0.05}
          format={(v) => v.toFixed(2)}
          onChange={actions.setWeaveDepth}
        />
      </div>

      <div className="divider my-0" />
      <div className="space-y-2">
        <span className="text-[10px] font-semibold tracking-wider uppercase">View & overlays</span>
        <label className="flex justify-between">
          <span>Floor grid</span>
          <input
            type="checkbox"
            className="toggle toggle-primary toggle-sm"
            checked={showGrid}
            onChange={(e) => {
              actions.setShowGrid(e.target.checked);
            }}
          />
        </label>
      </div>

      <div className="divider my-0" />
      <StudioLightsSection />
    </div>
  );
}
