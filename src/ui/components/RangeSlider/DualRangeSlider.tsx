import { useCallback, useId, useRef, useState } from 'react';
import { formatLengthMeters, parseLengthMetersInput } from '@/units/length';
import {
  clamp,
  pointerToRatio,
  ratioToValue,
  thumbLeftCss,
  trackFillLeftCss,
  trackFillWidthCss,
  valueToRatio,
} from './dual-range-slider-utils';
import { SliderValueField } from './SliderValueField';

export type DualRangeValue = {
  low: number;
  high: number;
};

type DualRangeSliderProps = {
  label?: string;
  min: number;
  max: number;
  step?: number;
  valueLow: number;
  valueHigh: number;
  onChange: (value: DualRangeValue) => void;
  lowLabel?: string;
  highLabel?: string;
  disabled?: boolean;
  /** Show editable text inputs; decimals = mm precision in meters (e.g. 3 → 8.000 m). */
  valueInputDecimals?: number;
  valueUnit?: string;
};

type ActiveThumb = 'low' | 'high';
type DraftField = 'low' | 'high';

function formatInputValue(value: number, decimals?: number): string {
  if (decimals === undefined) {
    return Number.isInteger(value) ? String(value) : value.toFixed(1);
  }
  return formatLengthMeters(value, decimals);
}

function parseInputValue(raw: string, decimals?: number): number | null {
  if (decimals === undefined) {
    const trimmed = raw.trim().replace(',', '.');
    const value = Number.parseFloat(trimmed);
    return Number.isNaN(value) ? null : value;
  }
  return parseLengthMetersInput(raw, decimals);
}

export function DualRangeSlider({
  label,
  min,
  max,
  step = 1,
  valueLow,
  valueHigh,
  onChange,
  lowLabel = 'Near',
  highLabel = 'Far',
  disabled = false,
  valueInputDecimals,
  valueUnit,
}: DualRangeSliderProps) {
  const labelId = useId();
  const lowInputId = useId();
  const highInputId = useId();
  const trackRef = useRef<HTMLDivElement>(null);
  const [activeThumb, setActiveThumb] = useState<ActiveThumb | null>(null);
  const [draftField, setDraftField] = useState<DraftField | null>(null);
  const [draftValue, setDraftValue] = useState('');

  const lowRatio = valueToRatio(valueLow, min, max);
  const highRatio = valueToRatio(valueHigh, min, max);
  const showInputs = valueInputDecimals !== undefined;

  const lowDisplay = draftField === 'low' ? draftValue : formatInputValue(valueLow, valueInputDecimals);
  const highDisplay =
    draftField === 'high' ? draftValue : formatInputValue(valueHigh, valueInputDecimals);
  const lowInvalid =
    draftField === 'low' && parseInputValue(draftValue, valueInputDecimals) === null;
  const highInvalid =
    draftField === 'high' && parseInputValue(draftValue, valueInputDecimals) === null;

  const emitFromPointer = useCallback(
    (clientX: number, thumb: ActiveThumb): void => {
      const track = trackRef.current;
      if (!track) return;

      const rect = track.getBoundingClientRect();
      if (rect.width <= 0) return;

      const nextValue = ratioToValue(pointerToRatio(clientX, rect), min, max, step);

      if (thumb === 'low') {
        const low = clamp(nextValue, min, valueHigh - step);
        onChange({ low, high: valueHigh });
        return;
      }

      const high = clamp(nextValue, valueLow + step, max);
      onChange({ low: valueLow, high });
    },
    [max, min, onChange, step, valueHigh, valueLow],
  );

  const clearDraft = (): void => {
    setDraftField(null);
    setDraftValue('');
  };

  const commitDraft = (field: DraftField): void => {
    const parsed = parseInputValue(draftValue, valueInputDecimals);
    if (parsed === null) {
      clearDraft();
      return;
    }

    if (field === 'low') {
      const low = clamp(parsed, min, valueHigh - step);
      onChange({ low, high: valueHigh });
    } else {
      const high = clamp(parsed, valueLow + step, max);
      onChange({ low: valueLow, high });
    }

    clearDraft();
  };

  const handleInputFocus = (field: DraftField, current: number): void => {
    setDraftField(field);
    setDraftValue(formatInputValue(current, valueInputDecimals));
  };

  const handleInputChange = (field: DraftField, raw: string): void => {
    setDraftField(field);
    setDraftValue(raw);

    const parsed = parseInputValue(raw, valueInputDecimals);
    if (parsed === null) return;

    if (field === 'low') {
      const low = clamp(parsed, min, valueHigh - step);
      onChange({ low, high: valueHigh });
      return;
    }

    const high = clamp(parsed, valueLow + step, max);
    onChange({ low: valueLow, high });
  };

  const handleInputBlur = (field: DraftField): void => {
    if (draftField !== field) return;
    commitDraft(field);
  };

  const handleThumbPointerDown = (
    event: React.PointerEvent<HTMLButtonElement>,
    thumb: ActiveThumb,
  ): void => {
    if (disabled) return;
    clearDraft();
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    setActiveThumb(thumb);
    emitFromPointer(event.clientX, thumb);
  };

  const handleThumbPointerMove = (event: React.PointerEvent<HTMLButtonElement>): void => {
    if (disabled || !activeThumb) return;
    if (!event.currentTarget.hasPointerCapture(event.pointerId)) return;
    emitFromPointer(event.clientX, activeThumb);
  };

  const handleThumbPointerUp = (event: React.PointerEvent<HTMLButtonElement>): void => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    setActiveThumb(null);
  };

  const handleTrackPointerDown = (event: React.PointerEvent<HTMLDivElement>): void => {
    if (disabled) return;
    const target = event.target as HTMLElement;
    if (target.classList.contains('panel-slider__thumb')) return;

    clearDraft();
    const track = trackRef.current;
    if (!track) return;

    const rect = track.getBoundingClientRect();
    const clickValue = ratioToValue(pointerToRatio(event.clientX, rect), min, max, step);
    const distToLow = Math.abs(clickValue - valueLow);
    const distToHigh = Math.abs(clickValue - valueHigh);
    const thumb: ActiveThumb = distToLow <= distToHigh ? 'low' : 'high';

    event.currentTarget.setPointerCapture(event.pointerId);
    setActiveThumb(thumb);
    emitFromPointer(event.clientX, thumb);
  };

  const handleTrackPointerMove = (event: React.PointerEvent<HTMLDivElement>): void => {
    if (disabled || !activeThumb) return;
    if (!event.currentTarget.hasPointerCapture(event.pointerId)) return;
    emitFromPointer(event.clientX, activeThumb);
  };

  const handleTrackPointerUp = (event: React.PointerEvent<HTMLDivElement>): void => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    setActiveThumb(null);
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
          style={{
            left: trackFillLeftCss(lowRatio),
            width: trackFillWidthCss(highRatio - lowRatio),
          }}
        />
        <button
          type="button"
          className={`panel-slider__thumb${activeThumb === 'low' ? ' panel-slider__thumb--active' : ''}`}
          style={{ left: thumbLeftCss(lowRatio) }}
          role="slider"
          aria-label={lowLabel}
          aria-valuemin={min}
          aria-valuemax={valueHigh - step}
          aria-valuenow={valueLow}
          disabled={disabled}
          onPointerDown={(event) => handleThumbPointerDown(event, 'low')}
          onPointerMove={handleThumbPointerMove}
          onPointerUp={handleThumbPointerUp}
          onPointerCancel={handleThumbPointerUp}
        />
        <button
          type="button"
          className={`panel-slider__thumb${activeThumb === 'high' ? ' panel-slider__thumb--active' : ''}`}
          style={{ left: thumbLeftCss(highRatio) }}
          role="slider"
          aria-label={highLabel}
          aria-valuemin={valueLow + step}
          aria-valuemax={max}
          aria-valuenow={valueHigh}
          disabled={disabled}
          onPointerDown={(event) => handleThumbPointerDown(event, 'high')}
          onPointerMove={handleThumbPointerMove}
          onPointerUp={handleThumbPointerUp}
          onPointerCancel={handleThumbPointerUp}
        />
      </div>

      {showInputs ? (
        <div className="slider-values">
          <SliderValueField
            id={lowInputId}
            label={lowLabel}
            value={lowDisplay}
            unit={valueUnit}
            invalid={lowInvalid}
            disabled={disabled}
            onFocus={() => handleInputFocus('low', valueLow)}
            onChange={(raw) => handleInputChange('low', raw)}
            onBlur={() => handleInputBlur('low')}
          />
          <SliderValueField
            id={highInputId}
            label={highLabel}
            value={highDisplay}
            unit={valueUnit}
            invalid={highInvalid}
            disabled={disabled}
            onFocus={() => handleInputFocus('high', valueHigh)}
            onChange={(raw) => handleInputChange('high', raw)}
            onBlur={() => handleInputBlur('high')}
          />
        </div>
      ) : (
        <div className="panel-slider__value-readouts">
          <span className="panel-slider__value-readout">
            {lowLabel} {formatInputValue(valueLow, valueInputDecimals)}
          </span>
          <span className="panel-slider__value-readout">
            {highLabel} {formatInputValue(valueHigh, valueInputDecimals)}
          </span>
        </div>
      )}
    </div>
  );
}
