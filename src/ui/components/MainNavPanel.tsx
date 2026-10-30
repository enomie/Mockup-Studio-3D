import { PanelLeftClose, PanelLeftOpen, PanelRightClose, PanelRightOpen } from 'lucide-react';
import type { ShellNavItem } from '@/ui/shell/shell-nav';
import { Icon } from './Icon';

interface MainNavPanelProps {
  side: 'left' | 'right';
  items: ShellNavItem[];
  selectedId: string;
  collapsed: boolean;
  onSelect: (id: string) => void;
  onToggleCollapse: () => void;
}

export function MainNavPanel({
  side,
  items,
  selectedId,
  collapsed,
  onSelect,
  onToggleCollapse,
}: MainNavPanelProps) {
  const CollapseIcon =
    side === 'left'
      ? collapsed
        ? PanelLeftOpen
        : PanelLeftClose
      : collapsed
        ? PanelRightOpen
        : PanelRightClose;

  return (
    <nav
      className={`main-nav main-nav--${side}${collapsed ? ' main-nav--collapsed' : ''}`}
      aria-label={side === 'left' ? 'Library' : 'Scene'}
    >
      <ul className="main-nav__list">
        {items.map((item) => {
          const active = item.id === selectedId;
          return (
            <li key={item.id}>
              <button
                type="button"
                className="main-nav__item"
                aria-current={active ? 'page' : undefined}
                aria-label={item.label}
                title={item.label}
                onClick={() => { onSelect(item.id); }}
              >
                <Icon icon={item.icon} />
                {!collapsed ? (
                  <span className="main-nav__label">{item.label}</span>
                ) : null}
              </button>
            </li>
          );
        })}
      </ul>

      <button
        type="button"
        className="main-nav__collapse"
        aria-label={collapsed ? 'Expand panel' : 'Collapse to icons'}
        title={collapsed ? 'Expand panel' : 'Collapse to icons'}
        onClick={onToggleCollapse}
      >
        <Icon icon={CollapseIcon} />
      </button>
    </nav>
  );
}
