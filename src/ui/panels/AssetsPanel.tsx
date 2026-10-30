import { ASSET_CATALOG } from '@/data/asset-catalog';
import { sortByDisplayName } from '@/ui/utils/library-list-order';

const SORTED_ASSET_CATALOG = sortByDisplayName(ASSET_CATALOG, (entry) => entry.label);
import { Icon } from '@/ui/components/Icon';
import { SubPanel } from '@/ui/components/SubPanel';
import { addAssetFromCatalog } from '@/ui/store/app-store-scene-entities';
import { formatFabricClothBakedMeshSubtitle } from '@/scene/user-baked-asset';
import { addAssetFromUserBaked, removeUserBakedAsset } from '@/ui/store/app-store';
import { useAppStore } from '@/ui/store/use-app-store';
import { Layers, Trash2 } from 'lucide-react';

export function AssetsPanel() {
  const userBakedAssets = useAppStore((s) => s.userBakedAssets);
  const sortedUserBaked = sortByDisplayName(userBakedAssets, (entry) => entry.name);

  return (
    <SubPanel title="Assets" side="left" width="list">
      <ul className="tile-list">
        {SORTED_ASSET_CATALOG.map((entry) => (
          <li key={entry.kind}>
            <button
              type="button"
              className="tile"
              aria-label={`Add ${entry.label}`}
              title={`Add ${entry.label}`}
              onClick={() => { addAssetFromCatalog(entry.kind); }}
            >
              <span className="tile__thumb tile__thumb--icon">
                <Icon icon={entry.icon} />
              </span>
              <span className="tile__meta">
                <span className="tile__name">{entry.label}</span>
                <span className="tile__detail">{entry.category}</span>
              </span>
            </button>
          </li>
        ))}
        {sortedUserBaked.map((entry) => (
          <li key={entry.id} className="tile-list__row">
            <button
              type="button"
              className="tile"
              aria-label={`Add ${entry.name}`}
              title={`Add ${entry.name}`}
              onClick={() => { addAssetFromUserBaked(entry.id); }}
            >
              <span className="tile__thumb tile__thumb--icon">
                <Icon icon={Layers} />
              </span>
              <span className="tile__meta">
                <span className="tile__name">{entry.name}</span>
                <span className="tile__detail">
                  {formatFabricClothBakedMeshSubtitle(entry.mesh)}
                </span>
              </span>
            </button>
            <button
              type="button"
              className="btn"
              aria-label={`Remove ${entry.name}`}
              title="Remove user asset"
              onClick={() => {
                const removed = removeUserBakedAsset(entry.id);
                if (!removed) {
                  window.alert('Cannot remove: asset is still used in the scene.');
                }
              }}
            >
              <Icon icon={Trash2} size={16} strokeWidth={1.75} />
            </button>
          </li>
        ))}
      </ul>
    </SubPanel>
  );
}
