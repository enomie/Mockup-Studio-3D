export function AxisTripleInputs({
  step,
  values,
  onChange,
}: {
  step: number;
  values: { x: number; y: number; z: number };
  onChange: (axis: 'x' | 'y' | 'z', value: number) => void;
}): React.ReactElement {
  const axes: ('x' | 'y' | 'z')[] = ['x', 'y', 'z'];
  return (
    <div className="grid grid-cols-3 gap-1">
      {axes.map((axis) => (
        <label key={axis} className="form-control w-full">
          <span className="label py-0">
            <span className="label-text text-[10px] uppercase">{axis}</span>
          </span>
          <input
            type="number"
            className="input input-bordered input-xs w-full font-mono"
            step={step}
            value={values[axis]}
            onChange={(e) => {
              const v = parseFloat(e.target.value);
              if (Number.isFinite(v)) onChange(axis, v);
            }}
          />
        </label>
      ))}
    </div>
  );
}
