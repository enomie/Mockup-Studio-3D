import { DEFAULT_SCENE_NAME } from '@/config/default-scene-assets';
import { Icon } from '@/ui/components/Icon';
import { ClipboardPaste, Copy, CopyPlus, Redo2, Scissors, Undo2 } from 'lucide-react';
import { redoSceneChange, setMode, undoSceneChange } from '@/ui/store/app-store';
import { useAppStore } from '@/ui/store/use-app-store';
import {
  copySelection,
  cutSelection,
  duplicateSelection,
  pasteClipboard,
  useSceneClipboardHasContent,
} from '@/ui/store/scene-clipboard-store';
import { VIEWPORT_TOOLS, viewportToolLabel } from './viewport-tools';

export function TopSubBar() {
  const mode = useAppStore((s) => s.mode);
  const canUndo = useAppStore((s) => s.history.canUndo);
  const canRedo = useAppStore((s) => s.history.canRedo);
  const undoLabel = useAppStore((s) => s.history.undoLabel);
  const redoLabel = useAppStore((s) => s.history.redoLabel);
  const undoTitle = undoLabel ? `Undo: ${undoLabel} (Ctrl+Z)` : 'Undo (Ctrl+Z)';
  const hasSelection = useAppStore((s) => s.selectedEntityIds.length > 0);
  const hasClipboard = useSceneClipboardHasContent();
  const editingProfile = useAppStore((s) => s.editingProfileId !== null);
  const clipboardActions = [
    { label: 'Cut (Ctrl+X)', icon: Scissors, enabled: hasSelection, run: cutSelection },
    { label: 'Copy (Ctrl+C)', icon: Copy, enabled: hasSelection, run: copySelection },
    {
      label: 'Paste (Ctrl+V; Ctrl+Shift+V pastes in place)',
      icon: ClipboardPaste,
      enabled: hasClipboard,
      run: () => pasteClipboard(),
    },
    { label: 'Duplicate (Ctrl+D; Alt-drag in move mode)', icon: CopyPlus, enabled: hasSelection, run: duplicateSelection },
  ];
  const redoTitle = redoLabel ? `Redo: ${redoLabel} (Ctrl+Shift+Z)` : 'Redo (Ctrl+Shift+Z)';

  return (
    <div className="top-bar top-bar--sub">
      <span className="top-bar__breadcrumb">Scene › {DEFAULT_SCENE_NAME}</span>

      <div className="viewport-tools" role="toolbar" aria-label="Viewport tools">
        {VIEWPORT_TOOLS.map((tool) => {
          const active = mode === tool.id;
          const label = viewportToolLabel(tool);
          return (
            <button
              key={tool.id}
              type="button"
              className="btn"
              aria-label={label}
              aria-pressed={active}
              title={label}
              onClick={() => { setMode(tool.id); }}
            >
              <Icon icon={tool.icon} />
              <span className="btn__key" aria-hidden="true">{tool.shortcut}</span>
            </button>
          );
        })}
      </div>

      <div className="top-bar__history">
      {!editingProfile && (
        <div className="top-bar__clipboard" role="toolbar" aria-label="Clipboard">
          {clipboardActions.map((action) => (
            <button
              key={action.label}
              type="button"
              className="btn btn--icon"
              aria-label={action.label}
              title={action.label}
              disabled={!action.enabled}
              onClick={() => { action.run(); }}
            >
              <Icon icon={action.icon} />
            </button>
          ))}
        </div>
      )}

      <div className="top-bar__clipboard" role="toolbar" aria-label="History">
        <button
          type="button"
          className="btn btn--icon"
          aria-label={undoTitle}
          title={undoTitle}
          disabled={!canUndo}
          onClick={undoSceneChange}
        >
          <Icon icon={Undo2} />
        </button>
        <button
          type="button"
          className="btn btn--icon"
          aria-label={redoTitle}
          title={redoTitle}
          disabled={!canRedo}
          onClick={redoSceneChange}
        >
          <Icon icon={Redo2} />
        </button>
      </div>
      </div>
    </div>
  );
}
