import type { LucideIcon } from 'lucide-react';

type IconProps = {
  icon: LucideIcon;
  size?: number;
  strokeWidth?: number;
  className?: string;
};

export function Icon({
  icon: IconComponent,
  size = 14,
  strokeWidth = 1.75,
  className,
}: IconProps) {
  return (
    <IconComponent
      size={size}
      strokeWidth={strokeWidth}
      className={className}
      aria-hidden
    />
  );
}
