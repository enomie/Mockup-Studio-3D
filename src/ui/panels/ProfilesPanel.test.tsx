import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { BUILTIN_PROFILES } from '@/scene/profile-library';
import { ShellSubPanelProvider } from '@/ui/components/shell-sub-panel-context';
import { ProfilesPanel } from './ProfilesPanel';

describe('ProfilesPanel', () => {
  it('renders a tile for every built-in profile', () => {
    const html = renderToStaticMarkup(
      <ShellSubPanelProvider side="left" onToggleShellCollapse={() => undefined}>
        <ProfilesPanel />
      </ShellSubPanelProvider>,
    );
    for (const entry of BUILTIN_PROFILES) {
      expect(html).toContain(entry.name);
    }
  });
});
