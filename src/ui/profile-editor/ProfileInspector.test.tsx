import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it } from 'vitest';
import { ShellSubPanelProvider } from '@/ui/components/shell-sub-panel-context';
import { closeProfileEditor, duplicateProfile, openProfileEditor, removeProfile } from '@/ui/store/app-store';
import { ProfileInspector, slotRoleHint } from './ProfileInspector';

describe('ProfileInspector', () => {
  let id: string | null = null;
  afterEach(() => {
    closeProfileEditor();
    if (id) {removeProfile(id);}
  });

  it('lists the paths with names and the tools while the editor is open', () => {
    id = duplicateProfile('bottle-bordeaux');
    if (!id) {throw new Error('duplicate failed');}
    openProfileEditor(id);
    const html = renderToStaticMarkup(
      <ShellSubPanelProvider side="right" onToggleShellCollapse={() => undefined}>
        <ProfileInspector />
      </ShellSubPanelProvider>,
    );
    for (const text of ['Tools', 'Select', 'Pen', 'Scissors', 'Paths', 'Glass', 'Cork', 'Add path', 'Point']) {
      expect(html).toContain(text);
    }
  });

  it('explains the role of a slot for the built-in assets', () => {
    expect(slotRoleHint(0)).toContain('Wine bottle: Glass');
    expect(slotRoleHint(2)).toContain('Pen: Body');
    expect(slotRoleHint(9)).toBe('No built-in role');
  });
});
