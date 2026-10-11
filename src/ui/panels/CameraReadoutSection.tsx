import { X } from 'lucide-react';
import { CAMERA_NAV_LENGTH_DECIMALS } from '@/constants';
import {
  formatDegreesDisplay,
  parseDegreesDisplayInput,
} from '@/units/angle';
import {
  formatLengthMeters,
  parseLengthMetersInput,
} from '@/units/length';
import { Icon } from '@/ui/components/Icon';
import { PanelAxisField } from '@/ui/components/PanelAxisField/PanelAxisField';
import { SubPanelSection } from '@/ui/components/SubPanelSection';
import { useCameraReadout } from '@/ui/hooks/useCameraReadout';
import {
  resetCameraAzimuth,
  resetCameraElevation,
  setCameraAzimuthDeg,
  setCameraDistance,
  setCameraElevationDeg,
  setCameraPosition,
  setCameraTarget,
} from '@/ui/store/app-store';

const ANGLE_RESET_EPSILON = 0.05;

function formatNavMeters(value: number): string {
  return formatLengthMeters(value, CAMERA_NAV_LENGTH_DECIMALS);
}

function parseNavMeters(raw: string): number | null {
  return parseLengthMetersInput(raw, CAMERA_NAV_LENGTH_DECIMALS);
}

type AngleResetButtonProps = {
  ariaLabel: string;
  disabled: boolean;
  onClick: () => void;
};

function AngleResetButton({ ariaLabel, disabled, onClick }: AngleResetButtonProps) {
  return (
    <button
      type="button"
      className="panel-field-icon-btn"
      aria-label={ariaLabel}
      title={ariaLabel}
      disabled={disabled}
      onClick={onClick}
    >
      <Icon icon={X} size={14} strokeWidth={1.75} />
    </button>
  );
}

export function CameraReadoutSection() {
  const readout = useCameraReadout();

  return (
    <SubPanelSection title="Navigation">
      <div className="panel-stack">
        <PanelAxisField
          label="Pos X"
          unit="m"
          value={readout.position.x}
          format={formatNavMeters}
          parse={parseNavMeters}
          onChange={(value) => setCameraPosition({ x: value })}
        />
        <PanelAxisField
          label="Pos Y"
          unit="m"
          value={readout.position.y}
          format={formatNavMeters}
          parse={parseNavMeters}
          onChange={(value) => setCameraPosition({ y: value })}
        />
        <PanelAxisField
          label="Pos Z"
          unit="m"
          value={readout.position.z}
          format={formatNavMeters}
          parse={parseNavMeters}
          onChange={(value) => setCameraPosition({ z: value })}
        />
        <PanelAxisField
          label="Tgt X"
          unit="m"
          value={readout.target.x}
          format={formatNavMeters}
          parse={parseNavMeters}
          onChange={(value) => setCameraTarget({ x: value })}
        />
        <PanelAxisField
          label="Tgt Y"
          unit="m"
          value={readout.target.y}
          format={formatNavMeters}
          parse={parseNavMeters}
          onChange={(value) => setCameraTarget({ y: value })}
        />
        <PanelAxisField
          label="Tgt Z"
          unit="m"
          value={readout.target.z}
          format={formatNavMeters}
          parse={parseNavMeters}
          onChange={(value) => setCameraTarget({ z: value })}
        />
        <PanelAxisField
          label="Distance"
          unit="m"
          value={readout.distance}
          format={formatNavMeters}
          parse={parseNavMeters}
          onChange={setCameraDistance}
        />
        <PanelAxisField
          label="Azimuth"
          unit="°"
          value={readout.azimuthDeg}
          format={formatDegreesDisplay}
          parse={parseDegreesDisplayInput}
          onChange={setCameraAzimuthDeg}
          trailing={
            <AngleResetButton
              ariaLabel="Azimuth auf 0° setzen"
              disabled={Math.abs(readout.azimuthDeg) < ANGLE_RESET_EPSILON}
              onClick={resetCameraAzimuth}
            />
          }
        />
        <PanelAxisField
          label="Elevation"
          unit="°"
          value={readout.elevationDeg}
          format={formatDegreesDisplay}
          parse={parseDegreesDisplayInput}
          onChange={setCameraElevationDeg}
          trailing={
            <AngleResetButton
              ariaLabel="Elevation auf 0° setzen"
              disabled={Math.abs(readout.elevationDeg) < ANGLE_RESET_EPSILON}
              onClick={resetCameraElevation}
            />
          }
        />
      </div>
    </SubPanelSection>
  );
}
