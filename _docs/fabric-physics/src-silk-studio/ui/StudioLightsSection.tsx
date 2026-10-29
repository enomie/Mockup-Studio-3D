import type { Vec3 } from '../config/studioLighting.ts';
import { useStudioStore } from '../state/studioStore.ts';
import { AxisTripleInputs } from './AxisTripleInputs.tsx';
import { RangeRow } from './RangeRow.tsx';

function LightCard({
  title,
  color,
  intensity,
  intensityMax = 4,
  onColor,
  onIntensity,
  position,
  onPosition,
  shadowBlur,
  onShadowBlur,
}: {
  title: string;
  color: string;
  intensity: number;
  intensityMax?: number;
  onColor: (hex: string) => void;
  onIntensity: (v: number) => void;
  position?: Vec3;
  onPosition?: (axis: 'x' | 'y' | 'z', value: number) => void;
  shadowBlur?: number;
  onShadowBlur?: (v: number) => void;
}): React.ReactElement {
  return (
    <div className="space-y-2 rounded-lg bg-base-300/30 p-2">
      <div className="flex items-center justify-between font-medium">
        <span>{title}</span>
        <input
          type="color"
          className="input input-bordered input-xs h-7 w-7 shrink-0 cursor-pointer p-0.5"
          value={color}
          onChange={(e) => {
            onColor(e.target.value);
          }}
        />
      </div>
      <RangeRow
        label="Intensity"
        value={intensity}
        min={0}
        max={intensityMax}
        step={0.1}
        format={(v) => v.toFixed(1)}
        onChange={onIntensity}
      />
      {position && onPosition ? (
        <AxisTripleInputs
          step={0.1}
          values={position}
          onChange={onPosition}
        />
      ) : null}
      {shadowBlur !== undefined && onShadowBlur ? (
        <RangeRow
          label="Blur (soft)"
          value={shadowBlur}
          min={0}
          max={15}
          step={0.5}
          format={(v) => (v <= 0.5 ? '0 (hard)' : v.toFixed(1))}
          onChange={onShadowBlur}
        />
      ) : null}
    </div>
  );
}

export function StudioLightsSection(): React.ReactElement {
  const lighting = useStudioStore((s) => s.studioLighting);
  const patch = useStudioStore((s) => s.patchStudioLighting);

  return (
    <div className="space-y-3">
      <span className="text-[10px] font-semibold tracking-wider uppercase">Studio lighting</span>

      <LightCard
        title="Ambient"
        color={lighting.ambient.color}
        intensity={lighting.ambient.intensity}
        intensityMax={3}
        onColor={(color) => {
          patch({ ambient: { color } });
        }}
        onIntensity={(intensity) => {
          patch({ ambient: { intensity } });
        }}
      />

      <LightCard
        title="Key light"
        color={lighting.key.color}
        intensity={lighting.key.intensity}
        onColor={(color) => {
          patch({ key: { color } });
        }}
        onIntensity={(intensity) => {
          patch({ key: { intensity } });
        }}
        position={lighting.key.position}
        onPosition={(axis, value) => {
          const position = { ...lighting.key.position, [axis]: value };
          patch({ key: { position } });
        }}
        shadowBlur={lighting.key.shadowBlur}
        onShadowBlur={(shadowBlur) => {
          patch({ key: { shadowBlur } });
        }}
      />

      <LightCard
        title="Fill light"
        color={lighting.fill.color}
        intensity={lighting.fill.intensity}
        onColor={(color) => {
          patch({ fill: { color } });
        }}
        onIntensity={(intensity) => {
          patch({ fill: { intensity } });
        }}
        position={lighting.fill.position}
        onPosition={(axis, value) => {
          const position = { ...lighting.fill.position, [axis]: value };
          patch({ fill: { position } });
        }}
        shadowBlur={lighting.fill.shadowBlur}
        onShadowBlur={(shadowBlur) => {
          patch({ fill: { shadowBlur } });
        }}
      />

      <LightCard
        title="Top light"
        color={lighting.top.color}
        intensity={lighting.top.intensity}
        onColor={(color) => {
          patch({ top: { color } });
        }}
        onIntensity={(intensity) => {
          patch({ top: { intensity } });
        }}
        position={lighting.top.position}
        onPosition={(axis, value) => {
          const position = { ...lighting.top.position, [axis]: value };
          patch({ top: { position } });
        }}
      />

      <div className="space-y-2 rounded-lg bg-base-300/30 p-2">
        <div className="font-medium">Environment (IBL)</div>
        <RangeRow
          label="Env intensity"
          value={lighting.environment.environmentIntensity}
          min={0}
          max={3}
          step={0.05}
          format={(v) => v.toFixed(2)}
          onChange={(environmentIntensity) => {
            patch({ environment: { environmentIntensity } });
          }}
        />
        <RangeRow
          label="Background intensity"
          value={lighting.environment.backgroundIntensity}
          min={0}
          max={3}
          step={0.05}
          format={(v) => v.toFixed(2)}
          onChange={(backgroundIntensity) => {
            patch({ environment: { backgroundIntensity } });
          }}
        />
        <RangeRow
          label="Rotation Y"
          value={lighting.environment.rotationYDeg}
          min={-180}
          max={180}
          step={1}
          format={(v) => `${String(Math.round(v))}°`}
          onChange={(rotationYDeg) => {
            patch({ environment: { rotationYDeg } });
          }}
        />
        <div className="flex flex-wrap items-center gap-2 text-[10px]">
          <label className="flex items-center gap-1">
            <span>Background</span>
            <input
              type="color"
              className="input input-bordered input-xs h-7 w-7 shrink-0 cursor-pointer p-0.5"
              value={lighting.environment.backgroundColor}
              onChange={(e) => {
                patch({ environment: { backgroundColor: e.target.value } });
              }}
            />
          </label>
          <label className="flex items-center gap-1">
            <span>Gradient top</span>
            <input
              type="color"
              className="input input-bordered input-xs h-7 w-7 shrink-0 cursor-pointer p-0.5"
              value={lighting.environment.gradientTop}
              onChange={(e) => {
                patch({ environment: { gradientTop: e.target.value } });
              }}
            />
          </label>
          <label className="flex items-center gap-1">
            <span>Gradient bottom</span>
            <input
              type="color"
              className="input input-bordered input-xs h-7 w-7 shrink-0 cursor-pointer p-0.5"
              value={lighting.environment.gradientBottom}
              onChange={(e) => {
                patch({ environment: { gradientBottom: e.target.value } });
              }}
            />
          </label>
        </div>
      </div>
    </div>
  );
}
