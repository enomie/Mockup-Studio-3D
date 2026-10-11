import { useCallback, useId, useRef, useState } from 'react';
import {
  clamp,
  pointerToRatio,
  ratioToValue,
  thumbLeftCss,
  trackFillWidthCss,
  valueToRatio,
} from './dual-range-slider-utils';
import { SliderValueField } from './SliderValueField';

type RangeSliderProps = {
  label?: string;
  min: number;
  max: number;
  step?: number;
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
  /** When set, show an editable text input with this many decimal places. */
  valueInputDecimals?: number;
  /** Left label for the value input row (e.g. "Near"). */
  valueInputLabel?: string;
  /** Optional unit suffix (e.g. "%", "m"). */
  valueUnit?: string;
  /** Display/input scale — e.g. 100 shows 0.35 as 35 when unit is "%". */
  valueDisplayScale?: number;
};

function formatValue(value: number, decimals?: number, displayScale = 1): string {
  const scaled = value * displayScale;
  if (decimals === undefined) {
    return Number.isInteger(scaled) ? String(scaled) : scaled.toFixed(2);
  }
  return scaled.toFixed(decimals);
}

function parseInputValue(raw: string, displayScale = 1): number | null {
  const trimmed = raw.trim().replace(',', '.');
  const parsed = Number.parseFloat(trimmed);
  if (Number.isNaN(parsed)) return null;
  return parsed / displayScale;
}

export function RangeSlider({
  label,
  min,
  max,
  step = 0.01,
  value,
  onChange,
  disabled = false,
  valueInputDecimals,
  valueInputLabel,
  valueUnit,
  valueDisplayScale = 1,
}: RangeSliderProps) {
  const labelId = useId();
  const inputId = useId();
  const trackRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);
  const [draftValue, setDraftValue] = useState<string | null>(null);

  const ratio = valueToRatio(value, min, max);
  const showInput = valueInputDecimals !== undefined;
  const resolvedValueInputLabel = valueInputLabel ?? label;
  const displayValue =
    draftValue ??
    formatValue(value, valueInputDecimals ?? (step < 1 ? 2 : undefined), valueDisplayScale);
  const inputInvalid =
    draftValue !== null && parseInputValue(draftValue, valueDisplayScale) === null;

  const emitValue = useCallback(
    (next: number): void => {
      onChange(clamp(next, min, max));
    },
    [max, min, onChange],
  );

  const emitFromPointer = useCallback(
    (clientX: number): void => {
      const track = trackRef.current;
      if (!track) return;

      const rect = track.getBoundingClientRect();
      if (rect.width <= 0) return;

      emitValue(ratioToValue(pointerToRatio(clientX, rect), min, max, step));
    },
    [emitValue, max, min, step],
  );

  const clearDraft = (): void => {
    setDraftValue(null);
  };

  const handleInputFocus = (): void => {
    setDraftValue(formatValue(value, valueInputDecimals, valueDisplayScale));
  };

  const handleInputChange = (raw: string): void => {
    setDraftValue(raw);
    const parsed = parseInputValue(raw, valueDisplayScale);
    if (parsed === null) return;
    emitValue(parsed);
  };

  const handleInputBlur = (): void => {
    const parsed = parseInputValue(draftValue ?? displayValue, valueDisplayScale);
    if (parsed !== null) emitValue(parsed);
    clearDraft();
  };

  const handleThumbPointerDown = (event: React.PointerEvent<HTMLButtonElement>): void => {
    if (disabled) return;
    clearDraft();
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    setDragging(true);
    emitFromPointer(event.clientX);
  };

  const handleThumbPointerMove = (event: React.PointerEvent<HTMLButtonElement>): void => {
    if (disabled || !dragging) return;
    if (!event.currentTarget.hasPointerCapture(event.pointerId)) return;
    emitFromPointer(event.clientX);
  };

  const handleThumbPointerUp = (event: React.PointerEvent<HTMLButtonElement>): void => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    setDragging(false);
  };

  const handleTrackPointerDown = (event: React.PointerEvent<HTMLDivElement>): void => {
    if (disabled) return;
    const target = event.target as HTMLElement;
    if (target.classList.contains('panel-slider__thumb')) return;

    clearDraft();
    event.currentTarget.setPointerCapture(event.pointerId);
    setDragging(true);
    emitFromPointer(event.clientX);
  };

  const handleTrackPointerMove = (event: React.PointerEvent<HTMLDivElement>): void => {
    if (disabled || !dragging) return;
    if (!event.currentTarget.hasPointerCapture(event.pointerId)) return;
    emitFromPointer(event.clientX);
  };

  const handleTrackPointerUp = (event: React.PointerEvent<HTMLDivElement>): void => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    setDragging(false);
  };

  return (
    <div
      className={`panel-slider${disabled ? ' panel-slider--disabled' : ''}`}
      role="group"
      aria-labelledby={label ? labelId : undefined}
    >
      {label ? (
        <span id={labelId} className="panel-slider__label">
          {label}
        </span>
      ) : null}

      <div
        ref={trackRef}
        className="panel-slider__track"
        onPointerDown={handleTrackPointerDown}
        onPointerMove={handleTrackPointerMove}
        onPointerUp={handleTrackPointerUp}
        onPointerCancel={handleTrackPointerUp}
      >
        <div className="panel-slider__track-bg" />
        <div
          className="panel-slider__track-fill"
          style={{ width: trackFillWidthCss(ratio) }}
        />
        <button
          type="button"
          className={`panel-slider__thumb${dragging ? ' panel-slider__thumb--active' : ''}`}
          style={{ left: thumbLeftCss(ratio) }}
          role="slider"
          aria-label={label ?? 'Value'}
          aria-valuemin={min}
          aria-valuemax={max}
          aria-valuenow={value}
          disabled={disabled}
          onPointerDown={handleThumbPointerDown}
          onPointerMove={handleThumbPointerMove}
          onPointerUp={handleThumbPointerUp}
          onPointerCancel={handleThumbPointerUp}
        />
      </div>

      {showInput && resolvedValueInputLabel ? (
        <SliderValueField
          id={inputId}
          label={resolvedValueInputLabel}
          value={displayValue}
          unit={valueUnit}
          invalid={inputInvalid}
          disabled={disabled}
          onFocus={handleInputFocus}
          onChange={handleInputChange}
          onBlur={handleInputBlur}
        />
      ) : (
        <span className="panel-slider__value-readout">{displayValue}</span>
      )}
    </div>
  );
}
