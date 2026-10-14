import { createContext, useContext, useMemo, type ReactNode } from 'react';

export type SubPanelWidthMode = 'default' | 'split';

interface ShellSubPanelContextValue {
  side: 'left' | 'right';
  onToggleShellCollapse: () => void;
  requestSubWidth: (mode: SubPanelWidthMode) => void;
}

const ShellSubPanelContext = createContext<ShellSubPanelContextValue | null>(null);

interface ShellSubPanelProviderProps {
  side: 'left' | 'right';
  onToggleShellCollapse: () => void;
  onSubWidthModeChange?: (mode: SubPanelWidthMode) => void;
  children: ReactNode;
}

export function ShellSubPanelProvider({
  side,
  onToggleShellCollapse,
  onSubWidthModeChange,
  children,
}: ShellSubPanelProviderProps) {
  const value = useMemo(
    () => ({
      side,
      onToggleShellCollapse,
      requestSubWidth: (mode: SubPanelWidthMode) => {
        onSubWidthModeChange?.(mode);
      },
    }),
    [side, onToggleShellCollapse, onSubWidthModeChange],
  );

  return (
    <ShellSubPanelContext.Provider value={value}>{children}</ShellSubPanelContext.Provider>
  );
}

export function useShellSubPanel(): ShellSubPanelContextValue | null {
  return useContext(ShellSubPanelContext);
}
