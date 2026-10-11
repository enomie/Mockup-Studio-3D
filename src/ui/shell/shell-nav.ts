import {
  Boxes,
  Camera,
  CloudSun,
  Download,
  Droplet,
  Image,
  LampFloor,
  Lightbulb,
  Package,
  Palette,
  Sun,
  type LucideIcon,
} from 'lucide-react';

export type ShellNavItem = {
  id: string;
  label: string;
  icon: LucideIcon;
};

export const LEFT_SHELL_NAV: ShellNavItem[] = [
  { id: 'environments', label: 'Environments', icon: CloudSun },
  { id: 'light-rigs', label: 'Light rigs', icon: LampFloor },
  { id: 'assets', label: 'Assets', icon: Package },
  { id: 'images', label: 'Images', icon: Image },
  { id: 'colors', label: 'Colors', icon: Droplet },
  { id: 'materials', label: 'Materials', icon: Palette },
];

export const RIGHT_SHELL_NAV: ShellNavItem[] = [
  { id: 'scene', label: 'Szene', icon: Boxes },
  { id: 'environment', label: 'Environment', icon: Sun },
  { id: 'camera', label: 'Camera', icon: Camera },
  { id: 'lighting', label: 'Lighting', icon: Lightbulb },
  { id: 'export', label: 'Export', icon: Download },
];
