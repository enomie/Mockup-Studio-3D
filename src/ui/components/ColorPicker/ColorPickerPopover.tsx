import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';
import type { Rgb } from '@/colors/rgb';
import {
  hsvToRgb,
  hueToRgb,
  parseHexColor,
  rgbFromByte,
  rgbToByte,
  rgbToCss,
  rgbToHex,
  rgbToHsv,
  type Hsv,
} from '@/colors/color-format';
import { useAppStore } from '@/ui/store/use-app-store';
import { getRecentColors, pushRecentColor } from './color-picker-recent';

interface ColorPickerPopoverProps {
  value: Rgb;
  onChange: (rgb: Rgb) => void;
  onClose: () => void;
  anchorRef: RefObject<HTMLElement | null>;
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

export function ColorPickerPopover({
  value,
  onChange,
  onClose,
  anchorRef,
}: ColorPickerPopoverProps) {
  const popoverRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const [hsv, setHsv] = useState<Hsv>(() => rgbToHsv(value));
  const [hexInput, setHexInput] = useState(() => rgbToHex(value));
  const [hexInvalid, setHexInvalid] = useState(false);
  const [recent, setRecent] = useState(() => getRecentColors());
  const libraryColors = useAppStore((s) => s.colors);
  const hsvRef = useRef(hsv);

  useEffect(() => {
    hsvRef.current = hsv;
  }, [hsv]);

  const emitRgb = useCallback(
    (nextHsv: Hsv) => {
      hsvRef.current = nextHsv;
      setHsv(nextHsv);
      const rgb = hsvToRgb(nextHsv);
      onChange(rgb);
      setHexInput(rgbToHex(rgb));
      setHexInvalid(false);
    },
    [onChange],
  );

  const commitRecent = useCallback(() => {
    pushRecentColor(hsvToRgb(hsvRef.current));
    setRecent(getRecentColors());
  }, []);

  useEffect(() => {
    const anchor = anchorRef.current;
    if (!anchor) {return;}

    const updatePosition = (): void => {
      const rect = anchor.getBoundingClientRect();
      const width = 200;
      const height = 280;
      let top = rect.top - height - 8;
      let left = rect.right - width;

      if (top < 8) {top = rect.bottom + 8;}
      if (left < 8) {left = 8;}
      if (left + width > window.innerWidth - 8) {
        left = window.innerWidth - width - 8;
      }

      setPosition({ top, left });
    };

    updatePosition();
    window.addEventListener('resize', updatePosition);
    return () => { window.removeEventListener('resize', updatePosition); };
  }, [anchorRef]);

  useEffect(() => {
    const handlePointerDown = (event: PointerEvent): void => {
      const target = event.target as Node;
      if (popoverRef.current?.contains(target)) {return;}
      if (anchorRef.current?.contains(target)) {return;}
      commitRecent();
      onClose();
    };

    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        commitRecent();
        onClose();
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [anchorRef, commitRecent, onClose]);

  const updateSvFromPointer = (clientX: number, clientY: number, rect: DOMRect): void => {
    const s = clamp01((clientX - rect.left) / rect.width);
    const v = clamp01(1 - (clientY - rect.top) / rect.height);
    emitRgb({ ...hsvRef.current, s, v });
  };

  const updateHueFromPointer = (clientX: number, rect: DOMRect): void => {
    const h = clamp01((clientX - rect.left) / rect.width) * 360;
    emitRgb({ ...hsvRef.current, h });
  };

  const handleHexChange = (raw: string): void => {
    setHexInput(raw);
    const parsed = parseHexColor(raw);
    if (!parsed) {
      setHexInvalid(true);
      return;
    }
    setHexInvalid(false);
    emitRgb(rgbToHsv(parsed));
  };

  const handleHexBlur = (): void => {
    const parsed = parseHexColor(hexInput);
    if (parsed) {
      pushRecentColor(parsed);
      setRecent(getRecentColors());
      setHexInput(rgbToHex(parsed));
      setHexInvalid(false);
    }
  };

  const handleRgbChannel = (channel: 'r' | 'g' | 'b', raw: string): void => {
    const parsed = Number.parseInt(raw, 10);
    if (Number.isNaN(parsed)) {return;}
    const bytes = rgbToByte(hsvToRgb(hsvRef.current));
    bytes[channel] = Math.max(0, Math.min(255, parsed));
    const rgb = rgbFromByte(bytes.r, bytes.g, bytes.b);
    emitRgb(rgbToHsv(rgb));
    pushRecentColor(rgb);
    setRecent(getRecentColors());
  };

  const bytes = rgbToByte(hsvToRgb(hsv));
  const hueColor = rgbToCss(hueToRgb(hsv.h));

  return (
    <div
      ref={popoverRef}
      className="color-picker-popover"
      role="dialog"
      aria-label="Color picker"
      style={{ top: position.top, left: position.left }}
    >
      <div
        className="color-picker-popover__sv"
        style={{ backgroundColor: hueColor }}
        onPointerDown={(event) => {
          event.currentTarget.setPointerCapture(event.pointerId);
          updateSvFromPointer(
            event.clientX,
            event.clientY,
            event.currentTarget.getBoundingClientRect(),
          );
        }}
        onPointerMove={(event) => {
          if (!event.currentTarget.hasPointerCapture(event.pointerId)) {return;}
          updateSvFromPointer(
            event.clientX,
            event.clientY,
            event.currentTarget.getBoundingClientRect(),
          );
        }}
        onPointerUp={(event) => {
          if (event.currentTarget.hasPointerCapture(event.pointerId)) {
            event.currentTarget.releasePointerCapture(event.pointerId);
            commitRecent();
          }
        }}
      >
        <div className="color-picker-popover__sv-white" />
        <div className="color-picker-popover__sv-black" />
        <div
          className="color-picker-popover__sv-handle"
          style={{
            left: `${hsv.s * 100}%`,
            top: `${(1 - hsv.v) * 100}%`,
          }}
        />
      </div>

      <div
        className="color-picker-popover__hue"
        onPointerDown={(event) => {
          event.currentTarget.setPointerCapture(event.pointerId);
          updateHueFromPointer(event.clientX, event.currentTarget.getBoundingClientRect());
        }}
        onPointerMove={(event) => {
          if (!event.currentTarget.hasPointerCapture(event.pointerId)) {return;}
          updateHueFromPointer(event.clientX, event.currentTarget.getBoundingClientRect());
        }}
        onPointerUp={(event) => {
          if (event.currentTarget.hasPointerCapture(event.pointerId)) {
            event.currentTarget.releasePointerCapture(event.pointerId);
            commitRecent();
          }
        }}
      >
        <div
          className="color-picker-popover__hue-handle"
          style={{ left: `${(hsv.h / 360) * 100}%` }}
        />
      </div>

      <div className="color-picker-popover__fields">
        <label className="color-picker-popover__field">
          <span>Hex</span>
          <input
            type="text"
            className={`color-picker-popover__input${hexInvalid ? ' color-picker-popover__input--invalid' : ''}`}
            value={hexInput}
            onChange={(event) => { handleHexChange(event.target.value); }}
            onBlur={handleHexBlur}
            spellCheck={false}
          />
        </label>
        <label className="color-picker-popover__field color-picker-popover__field--narrow">
          <span>R</span>
          <input
            type="number"
            min={0}
            max={255}
            className="color-picker-popover__input"
            value={bytes.r}
            onChange={(event) => { handleRgbChannel('r', event.target.value); }}
          />
        </label>
        <label className="color-picker-popover__field color-picker-popover__field--narrow">
          <span>G</span>
          <input
            type="number"
            min={0}
            max={255}
            className="color-picker-popover__input"
            value={bytes.g}
            onChange={(event) => { handleRgbChannel('g', event.target.value); }}
          />
        </label>
        <label className="color-picker-popover__field color-picker-popover__field--narrow">
          <span>B</span>
          <input
            type="number"
            min={0}
            max={255}
            className="color-picker-popover__input"
            value={bytes.b}
            onChange={(event) => { handleRgbChannel('b', event.target.value); }}
          />
        </label>
      </div>

      {libraryColors.length > 0 ? (
        <div className="color-picker-popover__library">
          {libraryColors.map((preset) => (
            <button
              key={preset.id}
              type="button"
              className="color-picker-popover__library-swatch"
              style={{ backgroundColor: rgbToCss(preset.rgb) }}
              aria-label={preset.name}
              title={preset.name}
              onClick={() => {
                emitRgb(rgbToHsv(preset.rgb));
                pushRecentColor(preset.rgb);
                setRecent(getRecentColors());
              }}
            />
          ))}
        </div>
      ) : null}

      {recent.length > 0 ? (
        <div className="color-picker-popover__recent">
          {recent.map((color) => (
            <button
              key={rgbToHex(color)}
              type="button"
              className="color-picker-popover__recent-swatch"
              style={{ backgroundColor: rgbToCss(color) }}
              aria-label={`Recent color ${rgbToHex(color)}`}
              onClick={() => {
                emitRgb(rgbToHsv(color));
                pushRecentColor(color);
                setRecent(getRecentColors());
              }}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
