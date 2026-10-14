import { useId, useState, type ReactNode } from 'react';

export interface PanelAxisFieldProps {
  label: string;
  value: number;
  format: (value: number) => string;
  parse: (raw: string) => number | null;
  unit?: string;
  disabled?: boolean;
  onChange: (value: number) => void;
  trailing?: ReactNode;
}

export function PanelAxisField({
  label,
  value,
  format,
  parse,
  unit,
  disabled = false,
  onChange,
  trailing,
}: PanelAxisFieldProps) {
  const fieldId = useId();
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState('');

  const displayValue = isEditing ? draft : format(value);
  const isInvalid = isEditing && parse(draft) === null && draft.trim() !== '';

  const handleFocus = (): void => {
    if (disabled) {return;}
    setIsEditing(true);
    setDraft(format(value));
  };

  const handleChange = (raw: string): void => {
    if (disabled) {return;}
    setDraft(raw);
    const parsed = parse(raw);
    if (parsed !== null) {onChange(parsed);}
  };

  const handleBlur = (): void => {
    const parsed = parse(draft);
    if (parsed !== null) {onChange(parsed);}
    setIsEditing(false);
    setDraft('');
  };

  return (
    <label className="panel-field-row" htmlFor={fieldId}>
      <span className="panel-field-label">{label}</span>
      <span className="panel-field-controls">
        <input
          id={fieldId}
          type="text"
          className={`panel-field-input${isInvalid ? ' panel-field-input--invalid' : ''}`}
          value={displayValue}
          disabled={disabled}
          inputMode="decimal"
          spellCheck={false}
          aria-label={label}
          aria-invalid={isInvalid}
          onFocus={handleFocus}
          onChange={(event) => { handleChange(event.target.value); }}
          onBlur={handleBlur}
        />
        {unit ? <span className="panel-field-unit">{unit}</span> : null}
        {trailing}
      </span>
    </label>
  );
}
