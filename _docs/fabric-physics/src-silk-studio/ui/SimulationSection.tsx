import { useStudioStore } from '../state/studioStore.ts';

export function SimulationSection(): React.ReactElement {
  const simulationFrozen = useStudioStore((s) => s.simulationFrozen);
  const startSimulation = useStudioStore((s) => s.startSimulation);
  const setSimulationFrozen = useStudioStore((s) => s.setSimulationFrozen);
  const resetSimulation = useStudioStore((s) => s.resetSimulation);

  return (
    <div className="space-y-2">
      <span className="text-[10px] font-semibold tracking-wider uppercase">Simulation</span>
      <div className="flex flex-wrap gap-1.5">
        <button
          type="button"
          className="btn btn-xs btn-outline btn-primary"
          onClick={() => {
            startSimulation();
          }}
        >
          Start
        </button>
        <button
          type="button"
          className={`btn btn-xs btn-ghost ${simulationFrozen ? 'btn-active' : ''}`}
          onClick={() => {
            setSimulationFrozen(!simulationFrozen);
          }}
        >
          {simulationFrozen ? 'Unfreeze' : 'Freeze'}
        </button>
        <button
          type="button"
          className="btn btn-xs btn-ghost"
          onClick={() => {
            resetSimulation();
          }}
        >
          Reset
        </button>
      </div>
    </div>
  );
}
