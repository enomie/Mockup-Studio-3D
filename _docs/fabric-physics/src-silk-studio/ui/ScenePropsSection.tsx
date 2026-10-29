import { useStudioStore } from '../state/studioStore.ts';
import { AxisTripleInputs } from './AxisTripleInputs.tsx';
import { RangeRow } from './RangeRow.tsx';

function Vec3Inputs({
  label,
  step,
  values,
  onChange,
}: {
  label: string;
  step: number;
  values: { x: number; y: number; z: number };
  onChange: (axis: 'x' | 'y' | 'z', value: number) => void;
}): React.ReactElement {
  return (
    <div className="space-y-1">
      <span className="text-[10px] text-base-content/70">{label}</span>
      <AxisTripleInputs step={step} values={values} onChange={onChange} />
    </div>
  );
}

export function ScenePropsSection(): React.ReactElement {
  const sceneProps = useStudioStore((s) => s.sceneProps);
  const layers = useStudioStore((s) => s.studioLayers);
  const actions = useStudioStore();

  const { cube, sphere } = sceneProps;
  const cubeVisible = layers.visibility.cube;
  const sphereVisible = layers.visibility.sphere;

  if (!cubeVisible && !sphereVisible) {
    return (
      <div className="space-y-2">
        <span className="text-[10px] font-semibold tracking-wider uppercase">Scene props</span>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <span className="text-[10px] font-semibold tracking-wider uppercase">Scene props</span>

      {cubeVisible ? (
        <div className="space-y-2 rounded-box bg-base-100/60 p-2">
          <span className="text-[10px] font-semibold text-primary">Cube</span>
          <RangeRow
            label="Size (m)"
            value={cube.size}
            min={0.05}
            max={1}
            step={0.01}
            format={(v) => v.toFixed(2)}
            onChange={actions.setCubeSize}
          />
          <RangeRow
            label="Corner radius (m)"
            value={cube.cornerRadius}
            min={0}
            max={cube.size / 2 - 0.001}
            step={0.005}
            format={(v) => v.toFixed(3)}
            onChange={actions.setCubeCornerRadius}
          />
          <Vec3Inputs
            label="Position (m)"
            step={0.01}
            values={cube.position}
            onChange={(axis, v) => {
              actions.patchCubeProp({ position: { ...cube.position, [axis]: v } });
            }}
          />
          <Vec3Inputs
            label="Rotation (deg)"
            step={0.01}
            values={cube.rotationEulerDeg}
            onChange={(axis, v) => {
              actions.patchCubeProp({
                rotationEulerDeg: { ...cube.rotationEulerDeg, [axis]: v },
              });
            }}
          />
        </div>
      ) : null}

      {sphereVisible ? (
        <div className="space-y-2 rounded-box bg-base-100/60 p-2">
          <span className="text-[10px] font-semibold text-primary">Sphere</span>
          <RangeRow
            label="Radius (m)"
            value={sphere.radius}
            min={0.03}
            max={0.75}
            step={0.01}
            format={(v) => v.toFixed(2)}
            onChange={actions.setSphereRadius}
          />
          <Vec3Inputs
            label="Position (m)"
            step={0.01}
            values={sphere.position}
            onChange={(axis, v) => {
              actions.patchSphereProp({ position: { ...sphere.position, [axis]: v } });
            }}
          />
          <Vec3Inputs
            label="Rotation (deg)"
            step={0.01}
            values={sphere.rotationEulerDeg}
            onChange={(axis, v) => {
              actions.patchSphereProp({
                rotationEulerDeg: { ...sphere.rotationEulerDeg, [axis]: v },
              });
            }}
          />
        </div>
      ) : null}
    </div>
  );
}
