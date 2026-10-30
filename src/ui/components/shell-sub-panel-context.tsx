import { createContext, useContext, useMemo, type ReactNode } from 'react';

interface ShellSubPanelContextValue {
  side: 'left' | 'right';
  onToggleShellCollapse: () => void;
}

const ShellSubPanelContext = createContext<ShellSubPanelContextValue | null>(null);

interface ShellSubPanelProviderProps {
  side: 'left' | 'right';
  onToggleShellCollapse: () => void;
  children: ReactNode;
}

export function ShellSubPanelProvider({
  side,
  onToggleShellCollapse,
  children,
}: ShellSubPanelProviderProps) {
  const value = useMemo(
    () => ({ side, onToggleShellCollapse }),
    [side, onToggleShellCollapse],
  );

  return (
    <ShellSubPanelContext.Provider value={value}>{children}</ShellSubPanelContext.Provider>
  );
}

export function useShellSubPanel(): ShellSubPanelContextValue | null {
  return useContext(ShellSubPanelContext);
}
