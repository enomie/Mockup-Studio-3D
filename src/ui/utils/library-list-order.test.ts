import { describe, expect, it } from 'vitest';
import {
  sortBuiltinThenUserByName,
  sortByDisplayName,
  sortPanelSelectOptions,
} from './library-list-order';

describe('library-list-order', () => {
  it('sortByDisplayName orders case-insensitively', () => {
    const items = [{ name: 'Zebra' }, { name: 'alpha' }, { name: 'Beta' }];
    expect(sortByDisplayName(items, (item) => item.name).map((item) => item.name)).toEqual([
      'alpha',
      'Beta',
      'Zebra',
    ]);
  });

  it('sortPanelSelectOptions sorts by label', () => {
    const sorted = sortPanelSelectOptions([
      { value: 'b', label: 'Print Glossy' },
      { value: 'a', label: 'Print Matt' },
    ]);
    expect(sorted.map((option) => option.label)).toEqual(['Print Glossy', 'Print Matt']);
  });

  it('sortBuiltinThenUserByName keeps builtin order and sorts users', () => {
    interface Row {
      id: string;
      name: string;
      builtin: boolean;
    }
    const items: Row[] = [
      { id: 'u-z', name: 'Zulu', builtin: false },
      { id: 'b-2', name: 'Built B', builtin: true },
      { id: 'u-a', name: 'Alpha', builtin: false },
      { id: 'b-1', name: 'Built A', builtin: true },
    ];
    const sorted = sortBuiltinThenUserByName(
      items,
      (item) => item.name,
      (item) => item.builtin,
    );
    expect(sorted.map((item) => item.id)).toEqual(['b-2', 'b-1', 'u-a', 'u-z']);
  });
});
