import type { PanelSelectOption } from '@/ui/components/PanelSelect';

const DISPLAY_NAME_COLLATOR = { sensitivity: 'base' as const };

export function compareDisplayNames(a: string, b: string): number {
  return a.localeCompare(b, undefined, DISPLAY_NAME_COLLATOR);
}

export function sortByDisplayName<T>(
  items: readonly T[],
  getName: (item: T) => string,
): T[] {
  return [...items].sort((left, right) =>
    compareDisplayNames(getName(left), getName(right)),
  );
}

export function sortPanelSelectOptions(
  options: readonly PanelSelectOption[],
): PanelSelectOption[] {
  return sortByDisplayName(options, (option) => option.label);
}

/** Built-ins keep input order; non-built-ins sorted A–Z after them. */
export function sortBuiltinThenUserByName<T>(
  items: readonly T[],
  getName: (item: T) => string,
  isBuiltin: (item: T) => boolean,
): T[] {
  const builtins: T[] = [];
  const users: T[] = [];
  for (const item of items) {
    if (isBuiltin(item)) {
      builtins.push(item);
    } else {
      users.push(item);
    }
  }
  return [...builtins, ...sortByDisplayName(users, getName)];
}
