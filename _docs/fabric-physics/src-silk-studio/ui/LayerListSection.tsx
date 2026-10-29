import { STUDIO_LAYER_IDS, STUDIO_LAYER_LABELS } from '../config/studioLayers.ts';
import { useStudioStore } from '../state/studioStore.ts';

function EyeIcon({ open }: { open: boolean }): React.ReactElement {
  if (open) {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        className="size-3.5"
        aria-hidden
      >
        <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
        <circle cx="12" cy="12" r="3" />
      </svg>
    );
  }
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className="size-3.5"
      aria-hidden
    >
      <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
      <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
      <path d="M6.61 6.61A13.52 13.52 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
      <line x1="2" x2="22" y1="2" y2="22" />
    </svg>
  );
}

export function LayerListSection(): React.ReactElement {
  const layers = useStudioStore((s) => s.studioLayers);
  const toggleLayerVisibility = useStudioStore((s) => s.toggleLayerVisibility);
  const selectLayer = useStudioStore((s) => s.selectLayer);

  return (
    <div className="space-y-2">
      <span className="text-[10px] font-semibold tracking-wider uppercase">Scene layers</span>
      <ul className="flex flex-col gap-0.5">
        {STUDIO_LAYER_IDS.map((id) => {
          const visible = layers.visibility[id];
          const selected = layers.selected === id;
          return (
            <li key={id}>
              <div
                className={`flex items-center gap-1 rounded-md pr-1 ${selected ? 'bg-base-100' : ''}`}
              >
                <button
                  type="button"
                  className="btn btn-ghost btn-xs shrink-0 px-1.5"
                  aria-label={visible ? `Hide ${STUDIO_LAYER_LABELS[id]}` : `Show ${STUDIO_LAYER_LABELS[id]}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleLayerVisibility(id);
                  }}
                >
                  <EyeIcon open={visible} />
                </button>
                <button
                  type="button"
                  className={`btn btn-ghost btn-xs min-h-0 flex-1 justify-start font-normal ${selected ? 'text-primary' : ''}`}
                  onClick={() => {
                    selectLayer(id);
                  }}
                >
                  {STUDIO_LAYER_LABELS[id]}
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
