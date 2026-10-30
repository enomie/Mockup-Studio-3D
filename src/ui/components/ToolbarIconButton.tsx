import type { LucideIcon } from 'lucide-react';
import { Icon } from '@/ui/components/Icon';

interface ToolbarIconButtonProps {
  icon: LucideIcon;
  ariaLabel: string;
  title?: string;
  disabled?: boolean;
  className?: string;
  onClick: () => void;
}

export function ToolbarIconButton({
  icon,
  ariaLabel,
  title,
  disabled = false,
  className = '',
  onClick,
}: ToolbarIconButtonProps) {
  return (
    <button
      type="button"
      className={`btn btn--icon${className ? ` ${className}` : ''}`}
      aria-label={ariaLabel}
      title={title ?? ariaLabel}
      disabled={disabled}
      onClick={onClick}
    >
      <Icon icon={icon} size={14} strokeWidth={1.75} />
    </button>
  );
}
