import { PanelAxisField } from '@/ui/components/PanelAxisField/PanelAxisField';
import { formatLengthMeters, LENGTH_DECIMALS, parseLengthMetersInput } from '@/units/length';
import { formatDegrees, parseDegreesInput } from './entity-fields/field-input-helpers';

type Axis = 'x' | 'y' | 'z';
interface Xyz { x: number; y: number; z: number }
const AXES: readonly Axis[] = ['x', 'y', 'z'];

const formatPercent = (scale: number): string => (scale * 100).toFixed(1);

function parsePercent(raw: string): number | null {
  const value = Number(raw.trim().replace(',', '.').replace('%', ''));
  return raw.trim() !== '' && Number.isFinite(value) && value > 0 ? value / 100 : null;
}

interface GroupTransformFieldsProps {
  center: Xyz;
  rotation: Xyz;
  scale: number;
  onCenterChange: (center: Xyz) => void;
  onRotationChange: (rotation: Xyz) => void;
  onScaleChange: (scale: number) => void;
}

/** Pos / Rot / Scale fields of a multi-selection (assets or patch points). */
export function GroupTransformFields({
  center,
  rotation,
  scale,
  onCenterChange,
  onRotationChange,
  onScaleChange,
}: GroupTransformFieldsProps) {
  return (
    <>
      {AXES.map((axis) => (
        <PanelAxisField
          key={`pos-${axis}`}
          label={`Pos ${axis.toUpperCase()}`}
          unit="m"
          value={center[axis]}
          format={(value) => formatLengthMeters(value, LENGTH_DECIMALS)}
          parse={parseLengthMetersInput}
          onChange={(value) => { onCenterChange({ ...center, [axis]: value }); }}
        />
      ))}
      {AXES.map((axis) => (
        <PanelAxisField
          key={`rot-${axis}`}
          label={`Rot ${axis.toUpperCase()}`}
          unit="°"
          value={rotation[axis]}
          format={formatDegrees}
          parse={parseDegreesInput}
          onChange={(value) => { onRotationChange({ ...rotation, [axis]: value }); }}
        />
      ))}
      <PanelAxisField
        label="Scale"
        unit="%"
        value={scale}
        format={formatPercent}
        parse={parsePercent}
        onChange={onScaleChange}
      />
    </>
  );
}
