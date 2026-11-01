import {
  Atom,
  Boxes,
  Camera,
  CloudSun,
  Download,
  Droplet,
  Image,
  LayoutGrid,
  LampFloor,
  Lightbulb,
  Package,
  Palette,
  Sun,
  type LucideIcon,
} from 'lucide-react';

export interface ShellNavItem {
  id: string;
  label: string;
  icon: LucideIcon;
}

export const LEFT_SHELL_NAV: ShellNavItem[] = [
  { id: 'environments', label: 'Environments', icon: CloudSun },
  { id: 'light-rigs', label: 'Light rigs', icon: LampFloor },
  { id: 'arrangements', label: 'Arrangements', icon: LayoutGrid },
  { id: 'assets', label: 'Assets', icon: Package },
  { id: 'images', label: 'Images', icon: Image },
  { id: 'colors', label: 'Colors', icon: Droplet },
  { id: 'materials', label: 'Materials', icon: Palette },
];

export const RIGHT_SHELL_NAV: ShellNavItem[] = [
  { id: 'scene', label: 'Scene', icon: Boxes },
  { id: 'environment', label: 'Environment', icon: Sun },
  { id: 'camera', label: 'Camera', icon: Camera },
  { id: 'lighting', label: 'Lighting', icon: Lightbulb },
  { id: 'physics', label: 'Physics', icon: Atom },
  { id: 'export', label: 'Export', icon: Download },
];
