export interface PanelToggleOption<K extends string> {
  key: K;
  label: string;
  title?: string;
}

interface PanelToggleGroupProps<K extends string> {
  label: string;
  options: readonly PanelToggleOption<K>[];
  /** Keys that are switched on; any combination is allowed. */
  active: Readonly<Record<K, boolean>>;
  onToggle: (key: K, on: boolean) => void;
}

/** One-row group of independent toggle buttons (multi-select), e.g. Mirror X | Y | Z. */
export function PanelToggleGroup<K extends string>({
  label,
  options,
  active,
  onToggle,
}: PanelToggleGroupProps<K>) {
  return (
    <div className="panel-field-row">
      <span className="panel-field-label">{label}</span>
      <span className="panel-field-controls">
        <span className="panel-toggle-group" role="group" aria-label={label}>
          {options.map((option) => {
            const on = active[option.key];
            return (
              <button
                key={option.key}
                type="button"
                className="panel-toggle-group__button"
                aria-pressed={on}
                title={option.title}
                onClick={() => { onToggle(option.key, !on); }}
              >
                {option.label}
              </button>
            );
          })}
        </span>
      </span>
    </div>
  );
}
