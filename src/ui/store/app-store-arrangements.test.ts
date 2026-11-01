import { describe, expect, it } from 'vitest';
import {
  BUILTIN_ARRANGEMENT_DEFAULT_ID,
  BUILTIN_ARRANGEMENT_DEVICES_ID,
} from '@/data/builtin-arrangements';
import { getAppState } from './app-store-internals';
import {
  duplicateArrangement,
  nextArrangementSaveName,
  removeArrangement,
  saveCurrentAsArrangement,
  updateArrangement,
} from './app-store-arrangements';

describe('arrangements', () => {
  it('starts with the Clothing arrangement active', () => {
    expect(getAppState().activeArrangementId).toBe(BUILTIN_ARRANGEMENT_DEFAULT_ID);
  });

  it('saves the current assets as a numbered user arrangement', () => {
    const first = saveCurrentAsArrangement();
    const second = saveCurrentAsArrangement();
    const names = getAppState().arrangements
      .filter((entry) => entry.id === first || entry.id === second)
      .map((entry) => entry.name);
    expect(names).toEqual(['My arrangement', 'My arrangement 2']);
    expect(getAppState().activeArrangementId).toBe(second);
    const saved = getAppState().arrangements.find((entry) => entry.id === second);
    expect(saved?.source).toBe('user');
    expect(saved?.content.kind).toBe('entities');
  });

  it('renames only user arrangements', () => {
    const id = saveCurrentAsArrangement();
    updateArrangement(id, { name: 'Shelf' });
    updateArrangement(BUILTIN_ARRANGEMENT_DEVICES_ID, { name: 'Hacked' });
    const byId = new Map(getAppState().arrangements.map((entry) => [entry.id, entry.name]));
    expect(byId.get(id)).toBe('Shelf');
    expect(byId.get(BUILTIN_ARRANGEMENT_DEVICES_ID)).toBe('Devices');
  });

  it('duplicates a built-in into a user copy', () => {
    const id = duplicateArrangement(BUILTIN_ARRANGEMENT_DEVICES_ID);
    const copy = getAppState().arrangements.find((entry) => entry.id === id);
    expect(copy).toMatchObject({ name: 'Devices copy', source: 'user' });
    expect(copy?.content.kind).toBe('spawn');
  });

  it('removes user arrangements but never built-ins', () => {
    const id = saveCurrentAsArrangement();
    removeArrangement(id);
    removeArrangement(BUILTIN_ARRANGEMENT_DEVICES_ID);
    const ids = getAppState().arrangements.map((entry) => entry.id);
    expect(ids).not.toContain(id);
    expect(ids).toContain(BUILTIN_ARRANGEMENT_DEVICES_ID);
    expect(getAppState().activeArrangementId).toBeNull();
  });

  it('picks the next free save name', () => {
    expect(nextArrangementSaveName([])).toBe('My arrangement');
  });
});
