export function RangeRow({
  label,
  value,
  min,
  max,
  step,
  format,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  format: (v: number) => string;
  onChange: (v: number) => void;
}): React.ReactElement {
  return (
    <div>
      <div className="flex justify-between text-[11px] text-base-content/80">
        <span>{label}</span>
        <span className="font-mono text-[10px] text-primary">{format(value)}</span>
      </div>
      <input
        type="range"
        className="range range-primary range-xs mt-1 w-full"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => {
          onChange(parseFloat(e.target.value));
        }}
      />
    </div>
  );
}
