import { useId } from 'react';

type PanelTextFieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  layout?: 'stack' | 'row';
  id?: string;
  disabled?: boolean;
  invalid?: boolean;
  placeholder?: string;
  inputMode?: 'text' | 'decimal' | 'numeric';
  spellCheck?: boolean;
  unit?: string;
  onFocus?: () => void;
  onBlur?: () => void;
};

export function PanelTextField({
  label,
  value,
  onChange,
  layout = 'stack',
  id,
  disabled = false,
  invalid = false,
  placeholder,
  inputMode = 'text',
  spellCheck = true,
  unit,
  onFocus,
  onBlur,
}: PanelTextFieldProps) {
  const generatedId = useId();
  const fieldId = id ?? generatedId;
  const inputClassName = layout === 'row'
    ? `panel-field-input${invalid ? ' panel-field-input--invalid' : ''}`
    : `panel-field-input--full${invalid ? ' panel-field-input--invalid' : ''}`;

  if (layout === 'row') {
    return (
      <label className="panel-field-row" htmlFor={fieldId}>
        <span className="panel-field-label">{label}</span>
        <span className="panel-field-controls">
          <input
            id={fieldId}
            type="text"
            className={inputClassName}
            value={value}
            disabled={disabled}
            placeholder={placeholder}
            inputMode={inputMode}
            spellCheck={spellCheck}
            aria-label={label}
            aria-invalid={invalid}
            onFocus={onFocus}
            onChange={(event) => onChange(event.target.value)}
            onBlur={onBlur}
          />
          {unit ? <span className="panel-field-unit">{unit}</span> : null}
        </span>
      </label>
    );
  }

  return (
    <div className="panel-field-stack">
      <label htmlFor={fieldId}>{label}</label>
      <input
        id={fieldId}
        type="text"
        className={inputClassName}
        value={value}
        disabled={disabled}
        placeholder={placeholder}
        inputMode={inputMode}
        spellCheck={spellCheck}
        aria-invalid={invalid}
        onFocus={onFocus}
        onChange={(event) => onChange(event.target.value)}
        onBlur={onBlur}
      />
    </div>
  );
}
