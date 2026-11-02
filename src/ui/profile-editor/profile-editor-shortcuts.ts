/** Keyboard and mouse shortcuts of the 2D profile editor, grouped for the Info section. */
export interface ProfileEditorShortcut {
  keys: string;
  action: string;
}

export interface ProfileEditorShortcutGroup {
  title: string;
  shortcuts: readonly ProfileEditorShortcut[];
}

export const PROFILE_EDITOR_SHORTCUTS: readonly ProfileEditorShortcutGroup[] = [
  {
    title: 'Tools',
    shortcuts: [
      { keys: 'V', action: 'Select' },
      { keys: 'P', action: 'Pen' },
      { keys: 'C', action: 'Scissors' },
    ],
  },
  {
    title: 'Editing',
    shortcuts: [
      { keys: 'Drag', action: 'Move points and handles' },
      { keys: 'Shift', action: 'Break handles' },
      { keys: 'Click path', action: 'Add point' },
      { keys: 'Del', action: 'Delete point' },
      { keys: 'Double-click', action: 'Corner / smooth' },
      { keys: 'Shift-click end + J', action: 'Join' },
    ],
  },
  {
    title: 'Pen',
    shortcuts: [
      { keys: 'Click', action: 'Corner point' },
      { keys: 'Drag', action: 'Curve point' },
      { keys: 'Click first point', action: 'Close path' },
      { keys: 'Enter', action: 'Finish path' },
    ],
  },
  {
    title: 'Snapping',
    shortcuts: [
      { keys: 'G', action: 'Snap to grid' },
      { keys: 'N', action: 'Snap to points' },
      { keys: 'Alt', action: 'No snapping' },
    ],
  },
  {
    title: 'View',
    shortcuts: [
      { keys: 'Wheel', action: 'Zoom' },
      { keys: 'Space / middle mouse', action: 'Pan' },
      { keys: 'Esc', action: 'Close editor' },
    ],
  },
];
