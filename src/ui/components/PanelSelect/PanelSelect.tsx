import { useId } from 'react';

export type PanelSelectOption = {
  value: string;
  label: string;
};

type PanelSelectProps = {
  label?: string;
  ariaLabel?: string;
  value: string;
  options: readonly PanelSelectOption[];
  onChange: (value: string) => void;
  id?: string;
  disabled?: boolean;
  placeholder?: string;
};

export function PanelSelect({
  label,
  ariaLabel,
  value,
  options,
  onChange,
  id,
  disabled = false,
  placeholder,
}: PanelSelectProps) {
  const generatedId = useId();
  const fieldId = id ?? generatedId;
  const resolvedAriaLabel = label ?? ariaLabel;

  return (
    <div className="panel-field-stack">
      {label ? <label htmlFor={fieldId}>{label}</label> : null}
      <select
        id={fieldId}
        className="panel-field-select"
        value={value}
        disabled={disabled}
        aria-label={resolvedAriaLabel}
        onChange={(event) => onChange(event.target.value)}
      >
        {placeholder ? <option value="">{placeholder}</option> : null}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}
