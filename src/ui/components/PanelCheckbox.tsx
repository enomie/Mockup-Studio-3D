interface PanelCheckboxProps {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}

export function PanelCheckbox({
  label,
  checked,
  onChange,
  disabled = false,
}: PanelCheckboxProps) {
  return (
    <label className="panel-field-row panel-checkbox">
      <span className="panel-field-label">{label}</span>
      <span className="panel-field-controls">
        <input
          type="checkbox"
          className="panel-checkbox__input"
          checked={checked}
          disabled={disabled}
          onChange={(event) => { onChange(event.target.checked); }}
        />
      </span>
    </label>
  );
}
