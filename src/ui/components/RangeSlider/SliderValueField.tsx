interface SliderValueFieldProps {
  id: string;
  label: string;
  value: string;
  unit?: string;
  invalid?: boolean;
  disabled?: boolean;
  onFocus: () => void;
  onChange: (value: string) => void;
  onBlur: () => void;
}

export function SliderValueField({
  id,
  label,
  value,
  unit,
  invalid = false,
  disabled = false,
  onFocus,
  onChange,
  onBlur,
}: SliderValueFieldProps) {
  return (
    <label className="panel-field-row" htmlFor={id}>
      <span className="panel-field-label">{label}</span>
      <span className="panel-field-controls">
        <input
          id={id}
          type="text"
          inputMode="decimal"
          aria-label={label}
          className={`panel-field-input${invalid ? ' panel-field-input--invalid' : ''}`}
          value={value}
          disabled={disabled}
          spellCheck={false}
          onFocus={onFocus}
          onChange={(event) => { onChange(event.target.value); }}
          onBlur={onBlur}
        />
        {unit ? <span className="panel-field-unit">{unit}</span> : null}
      </span>
    </label>
  );
}
