import { Copy, Plus, Trash2 } from 'lucide-react';
import { LATHE_PATH_SLOT_STROKES } from '@/engine/lathe-svg-path-slots';
import {
  allProfiles,
  getProfile,
  profileSizeLabel,
  profileUrl,
  type ProfileEntry,
} from '@/scene/profile-library';
import type { ProfilePath } from '@/scene/profile-model';
import { Icon } from '@/ui/components/Icon';
import { PanelTextField } from '@/ui/components/PanelTextField';
import { SubPanel } from '@/ui/components/SubPanel';
import { SubPanelSection } from '@/ui/components/SubPanelSection';
import {
  addProfile,
  duplicateProfile,
  removeProfile,
  renameProfile,
  renameProfilePath,
  selectProfile,
} from '@/ui/store/app-store';
import { useAppStore } from '@/ui/store/use-app-store';
import { sortBuiltinThenUserByName } from '@/ui/utils/library-list-order';

function profileDetail(entry: ProfileEntry): string {
  const origin = entry.source === 'builtin' ? 'Built-in' : null;
  return [origin, entry.usedBy, profileSizeLabel(entry)].filter(Boolean).join(' · ');
}

function pathDetail(path: ProfilePath): string {
  return `${path.closed ? 'Closed' : 'Open'} · ${path.nodes.length} points`;
}

function PathSwatch({ path }: { path: ProfilePath }) {
  return (
    <span
      className="info-list__swatch"
      style={{ background: LATHE_PATH_SLOT_STROKES[path.slot] }}
    />
  );
}

function ProfileInfo({ entry }: { entry: ProfileEntry }) {
  return (
    <dl className="info-list">
      <dt>Size</dt>
      <dd>{profileSizeLabel(entry) ?? '–'}</dd>
      {entry.usedBy ? (
        <>
          <dt>Used by</dt>
          <dd>{entry.usedBy}</dd>
        </>
      ) : null}
      {entry.file ? (
        <>
          <dt>File</dt>
          <dd>{entry.file}</dd>
        </>
      ) : null}
    </dl>
  );
}

function ReadOnlyPaths({ entry }: { entry: ProfileEntry }) {
  return (
    <ul className="profile-path-list" aria-label="Paths">
      {entry.paths.map((path) => (
        <li key={path.id} className="profile-path-list__item">
          <PathSwatch path={path} />
          <span className="profile-path-list__name">{path.name}</span>
          <span className="profile-path-list__detail">{pathDetail(path)}</span>
        </li>
      ))}
    </ul>
  );
}

function EditablePaths({ entry }: { entry: ProfileEntry }) {
  return (
    <ul className="profile-path-list" aria-label="Paths">
      {entry.paths.map((path) => (
        <li key={path.id} className="profile-path-list__item">
          <PathSwatch path={path} />
          <input
            type="text"
            className="panel-field-input profile-path-list__name"
            aria-label={`Name of path ${path.name}`}
            value={path.name}
            onChange={(event) => { renameProfilePath(entry.id, path.id, event.target.value); }}
          />
          <span className="profile-path-list__detail">{pathDetail(path)}</span>
        </li>
      ))}
    </ul>
  );
}

function ProfileActions({ entry }: { entry: ProfileEntry }) {
  return (
    <div className="material-editor-actions">
      <button type="button" className="btn" onClick={() => duplicateProfile(entry.id)}>
        <Icon icon={Copy} size={16} strokeWidth={1.75} />
        Duplicate
      </button>
      {entry.source === 'user' ? (
        <button
          type="button"
          className="btn btn--danger"
          onClick={() => { removeProfile(entry.id); }}
        >
          <Icon icon={Trash2} size={16} strokeWidth={1.75} />
          Remove
        </button>
      ) : null}
    </div>
  );
}

function ProfileDetail({ entry }: { entry: ProfileEntry }) {
  if (entry.source === 'builtin') {
    return (
      <SubPanelSection title="Info">
        <ProfileInfo entry={entry} />
        <ReadOnlyPaths entry={entry} />
        <p className="profile-hint">Built-in profiles are read-only. Duplicate to edit.</p>
        <ProfileActions entry={entry} />
      </SubPanelSection>
    );
  }
  return (
    <SubPanelSection title="Editor">
      <PanelTextField
        id="profile-name"
        label="Name"
        value={entry.name}
        onChange={(name) => { renameProfile(entry.id, name); }}
      />
      <ProfileInfo entry={entry} />
      <EditablePaths entry={entry} />
      <ProfileActions entry={entry} />
    </SubPanelSection>
  );
}

export function ProfilesPanel() {
  const selectedProfileId = useAppStore((s) => s.selectedProfileId);
  const userProfiles = useAppStore((s) => s.userProfiles);
  const profiles = sortBuiltinThenUserByName(
    allProfiles(userProfiles),
    (entry) => entry.name,
    (entry) => entry.source === 'builtin',
  );
  const selected = selectedProfileId ? getProfile(selectedProfileId, userProfiles) : undefined;

  return (
    <SubPanel
      title="Profiles"
      side="left"
      footer={
        <button
          type="button"
          className="btn btn--add"
          aria-label="Add new profile"
          title="Create a new profile"
          onClick={() => addProfile()}
        >
          <Icon icon={Plus} />
          Add new
        </button>
      }
    >
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

      {selected ? <ProfileDetail entry={selected} /> : null}
    </SubPanel>
  );
}
