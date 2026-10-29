import { useStudioStore } from '../state/studioStore.ts';

export function ResetSection(): React.ReactElement {
  const resetPins = useStudioStore((s) => s.resetPins);
  const resetScene = useStudioStore((s) => s.resetScene);

  return (
    <div className="space-y-2">
      <span className="text-[10px] font-semibold tracking-wider uppercase">Reset</span>
      <div className="flex flex-wrap gap-1.5">
        <button
          type="button"
          className="btn btn-xs btn-ghost"
          onClick={() => {
            resetPins();
          }}
        >
          Pins
        </button>
        <button
          type="button"
          className="btn btn-xs btn-secondary"
          onClick={() => {
            resetScene();
          }}
        >
          Scene
        </button>
      </div>
    </div>
  );
}
