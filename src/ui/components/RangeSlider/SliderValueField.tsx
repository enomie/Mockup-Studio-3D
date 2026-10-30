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

/** Value input + optional unit, without its own row or visible label. */
export function SliderValueInput({
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
    <>
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
    </>
  );
}

/** Labeled value row (label left, input right), e.g. "Near" / "Far" below a dual slider. */
export function SliderValueField(props: SliderValueFieldProps) {
  return (
    <label className="panel-field-row" htmlFor={props.id}>
      <span className="panel-field-label">{props.label}</span>
      <span className="panel-field-controls">
        <SliderValueInput {...props} />
      </span>
    </label>
  );
}
