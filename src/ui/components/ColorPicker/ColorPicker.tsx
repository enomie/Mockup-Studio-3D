import { useId, useRef, useState } from 'react';
import type { Rgb } from '@/colors/rgb';
import { parseHexColor, rgbToCss, rgbToHex } from '@/colors/color-format';
import { ColorPickerPopover } from './ColorPickerPopover';

type ColorPickerProps = {
  value: Rgb;
  onChange: (rgb: Rgb) => void;
  label?: string;
  disabled?: boolean;
};

export function ColorPicker({ value, onChange, label, disabled = false }: ColorPickerProps) {
  const fieldId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [openSession, setOpenSession] = useState(0);
  const [draftHex, setDraftHex] = useState<string | null>(null);

  const hexInput = draftHex ?? rgbToHex(value);
  const hexInvalid = draftHex !== null && parseHexColor(draftHex) === null;

  const clearDraft = (): void => {
    setDraftHex(null);
  };

  const handleOpen = (): void => {
    if (disabled) return;
    setOpenSession((session) => session + 1);
    setOpen(true);
  };

  const handleHexChange = (raw: string): void => {
    setDraftHex(raw);
    const parsed = parseHexColor(raw);
    if (!parsed) return;
    onChange(parsed);
  };

  const handleHexBlur = (): void => {
    const parsed = parseHexColor(hexInput);
    if (parsed) onChange(parsed);
    clearDraft();
  };

  return (
    <div
      ref={rootRef}
      className={`color-picker panel-field-row${disabled ? ' color-picker--disabled' : ''}`}
    >
      {label ? (
        <label className="panel-field-label" htmlFor={fieldId}>
          {label}
        </label>
      ) : null}

      <div className="panel-field-controls">
        <button
          type="button"
          className="color-picker__swatch"
          aria-label={label ? `Pick ${label.toLowerCase()}` : 'Pick color'}
          disabled={disabled}
          onClick={handleOpen}
        >
          <span
            className="color-picker__swatch-color"
            style={{ backgroundColor: rgbToCss(value) }}
          />
        </button>

        <input
          id={fieldId}
          type="text"
          className={`panel-field-input${hexInvalid ? ' panel-field-input--invalid' : ''}`}
          value={hexInput}
          disabled={disabled}
          spellCheck={false}
          onFocus={handleOpen}
          onChange={(event) => handleHexChange(event.target.value)}
          onBlur={handleHexBlur}
        />
      </div>

      {open && !disabled ? (
        <ColorPickerPopover
          key={openSession}
          value={value}
          onChange={(rgb) => {
            onChange(rgb);
            clearDraft();
          }}
          onClose={() => setOpen(false)}
          anchorRef={rootRef}
        />
      ) : null}
    </div>
  );
}
