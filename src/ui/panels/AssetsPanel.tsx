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
      <ul className="image-list">
        {SORTED_ASSET_CATALOG.map((entry) => (
          <li key={entry.kind}>
            <button
              type="button"
              className="image-tile"
              aria-label={`Add ${entry.label}`}
              title={`Add ${entry.label}`}
              onClick={() => { addAssetFromCatalog(entry.kind); }}
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
        {sortedUserBaked.map((entry) => (
          <li key={entry.id} className="image-list__item-row">
            <button
              type="button"
              className="image-tile"
              aria-label={`Add ${entry.name}`}
              title={`Add ${entry.name}`}
              onClick={() => { addAssetFromUserBaked(entry.id); }}
            >
              <span className="image-tile__thumb image-tile__thumb--icon">
                <Icon icon={Layers} />
              </span>
              <span className="image-tile__meta">
                <span className="image-tile__name">{entry.name}</span>
                <span className="image-tile__orientation">
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
