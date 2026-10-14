import { GRAVITY_SCALE_MAX, GRAVITY_SCALE_MIN } from '@/scene/physics-settings';
import { NORMALIZED_DECIMALS, NORMALIZED_STEP } from '@/units/normalized';
import { RangeSlider } from '@/ui/components/RangeSlider';
import { SubPanel } from '@/ui/components/SubPanel';
import { SubPanelSection } from '@/ui/components/SubPanelSection';
import {
  resetWorldPhysics,
  setGravityScale,
  startPhysicsRigidTest,
  startWorldPhysics,
  stopPhysicsRigidTest,
  toggleWorldPhysicsPause,
} from '@/ui/store/app-store';
import { useAppStore } from '@/ui/store/use-app-store';

export function PhysicsSubPanel() {
  const gravityScale = useAppStore((s) => s.physics.gravityScale);
  const rigidTestPhase = useAppStore((s) => s.physics.rigidTestPhase);
  const worldPhysicsPhase = useAppStore((s) => s.physics.worldPhysicsPhase);
  const worldPhysicsHasSnapshot = useAppStore((s) => s.physics.worldPhysicsHasSnapshot);
  const canStopRigidTest = rigidTestPhase === 'running';
  const canTogglePause =
    worldPhysicsPhase === 'simulating' || worldPhysicsPhase === 'paused';
  const freezeLabel = worldPhysicsPhase === 'paused' ? 'Unfreeze' : 'Freeze';

  return (
    <SubPanel title="Physics" side="right">
      <div className="panel-stack">
        <SubPanelSection title="World physics">
          <div className="panel-field-row">
            <span className="panel-field-label">Session</span>
            <span className="panel-field-controls side-toggle">
              <button
                type="button"
                className="toolbar-chip-btn side-toggle__btn"
                onClick={() => { startWorldPhysics(); }}
              >
                Start
              </button>
              <button
                type="button"
                className={`toolbar-chip-btn side-toggle__btn${worldPhysicsPhase === 'paused' ? ' toolbar-chip-btn--active' : ''}`}
                disabled={!canTogglePause}
                aria-pressed={worldPhysicsPhase === 'paused'}
                onClick={() => { toggleWorldPhysicsPause(); }}
              >
                {freezeLabel}
              </button>
              <button
                type="button"
                className="toolbar-chip-btn side-toggle__btn"
                disabled={!worldPhysicsHasSnapshot}
                onClick={() => { resetWorldPhysics(); }}
              >
                Reset
              </button>
            </span>
          </div>
        </SubPanelSection>
        <SubPanelSection title="Test">
          <div className="panel-field-row">
            <span className="panel-field-label">Rigid fall</span>
            <span className="panel-field-controls side-toggle">
              <button
                type="button"
                className="toolbar-chip-btn side-toggle__btn"
                onClick={() => { startPhysicsRigidTest(); }}
              >
                Start
              </button>
              <button
                type="button"
                className="toolbar-chip-btn side-toggle__btn"
                disabled={!canStopRigidTest}
                onClick={() => { stopPhysicsRigidTest(); }}
              >
                Stop
              </button>
            </span>
          </div>
        </SubPanelSection>
        <SubPanelSection title="Simulation">
          <RangeSlider
            label="Gravity scale"
            min={GRAVITY_SCALE_MIN}
            max={GRAVITY_SCALE_MAX}
            step={NORMALIZED_STEP}
            value={gravityScale}
            valueInputLabel="Scale"
            valueInputDecimals={NORMALIZED_DECIMALS}
            onChange={setGravityScale}
          />
        </SubPanelSection>
      </div>
    </SubPanel>
  );
}
