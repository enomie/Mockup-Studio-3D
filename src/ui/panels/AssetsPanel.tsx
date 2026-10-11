import { ASSET_CATALOG } from '@/data/asset-catalog';
import { Icon } from '@/ui/components/Icon';
import { SubPanel } from '@/ui/components/SubPanel';
import { addAssetFromCatalog } from '@/ui/store/app-store';

export function AssetsPanel() {
  return (
    <SubPanel title="Assets" side="left">
      <ul className="image-list">
        {ASSET_CATALOG.map((entry) => (
          <li key={entry.kind}>
            <button
              type="button"
              className="image-tile"
              aria-label={`Add ${entry.label}`}
              title={`Add ${entry.label}`}
              onClick={() => addAssetFromCatalog(entry.kind)}
            >
              <span className="image-tile__thumb image-tile__thumb--icon">
                <Icon icon={entry.icon} />
              </span>
              <span className="image-tile__meta">
                <span className="image-tile__name">{entry.label}</span>
                <span className="image-tile__orientation">{entry.category}</span>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </SubPanel>
  );
}
