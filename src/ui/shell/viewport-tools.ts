import {
  MousePointer2,
  Move,
  RotateCw,
  Scaling,
  type LucideIcon,
} from 'lucide-react';
import type { AppMode } from '@/scene/scene-api';

type ViewportToolShortcut = 'W' | 'E' | 'R' | 'T';

export interface ViewportToolDefinition {
  id: AppMode;
  label: string;
  icon: LucideIcon;
  shortcut: ViewportToolShortcut;
}

export const VIEWPORT_TOOLS: ViewportToolDefinition[] = [
  { id: 'select', label: 'Select', icon: MousePointer2, shortcut: 'W' },
  { id: 'translate', label: 'Move', icon: Move, shortcut: 'E' },
  { id: 'rotate', label: 'Rotate', icon: RotateCw, shortcut: 'R' },
  { id: 'scale', label: 'Scale', icon: Scaling, shortcut: 'T' },
];

export const VIEWPORT_TOOL_BY_KEY: Record<string, AppMode> = Object.fromEntries(
  VIEWPORT_TOOLS.map((tool) => [tool.shortcut.toLowerCase(), tool.id]),
);

export function viewportToolLabel(tool: ViewportToolDefinition): string {
  return `${tool.label} (${tool.shortcut})`;
}
