import { LATHE_PATH_SLOT_STROKES } from '@/engine/lathe-svg-path-slots';
import {
  BUILTIN_PROFILES,
  getProfile,
  profileSizeLabel,
  profileUrl,
  type ProfileEntry,
} from '@/scene/profile-library';
import { SubPanel } from '@/ui/components/SubPanel';
import { SubPanelSection } from '@/ui/components/SubPanelSection';
import { selectProfile } from '@/ui/store/app-store';
import { useAppStore } from '@/ui/store/use-app-store';
import { sortBuiltinThenUserByName } from '@/ui/utils/library-list-order';

function profileDetail(entry: ProfileEntry): string {
  const size = profileSizeLabel(entry);
  return ['Built-in', entry.usedBy, size].filter(Boolean).join(' · ');
}

function ProfileInfo({ entry }: { entry: ProfileEntry }) {
  return (
    <SubPanelSection title="Info">
      <dl className="info-list">
        <dt>Size</dt>
        <dd>{profileSizeLabel(entry) ?? '–'}</dd>
        <dt>Used by</dt>
        <dd>{entry.usedBy}</dd>
        <dt>File</dt>
        <dd>{entry.file}</dd>
      </dl>
      <ul className="profile-path-list" aria-label="Paths">
        {entry.paths.map((path) => (
          <li key={path.id} className="profile-path-list__item">
            <span
              className="info-list__swatch"
              style={{ background: LATHE_PATH_SLOT_STROKES[path.slot] }}
            />
            <span className="profile-path-list__name">{path.name}</span>
            <span className="profile-path-list__detail">
              {path.closed ? 'Closed' : 'Open'} · {path.nodes.length} points
            </span>
          </li>
        ))}
      </ul>
    </SubPanelSection>
  );
}

export function ProfilesPanel() {
  const selectedProfileId = useAppStore((s) => s.selectedProfileId);
  const profiles = sortBuiltinThenUserByName(
    [...BUILTIN_PROFILES],
    (entry) => entry.name,
    (entry) => entry.source === 'builtin',
  );
  const selected = selectedProfileId ? getProfile(selectedProfileId) : undefined;

  return (
    <SubPanel title="Profiles" side="left">
      <ul className="tile-list">
        {profiles.map((entry) => (
          <li key={entry.id}>
            <button
              type="button"
              className="tile"
              aria-current={selectedProfileId === entry.id ? 'true' : undefined}
              aria-label={entry.name}
              title={entry.name}
              onClick={() => { selectProfile(entry.id); }}
            >
              <span className="tile__thumb tile__thumb--profile">
                <img src={profileUrl(entry)} alt="" />
              </span>
              <span className="tile__meta">
                <span className="tile__name">{entry.name}</span>
                <span className="tile__detail">{profileDetail(entry)}</span>
              </span>
            </button>
          </li>
        ))}
      </ul>

      {selected ? <ProfileInfo entry={selected} /> : null}
    </SubPanel>
  );
}
