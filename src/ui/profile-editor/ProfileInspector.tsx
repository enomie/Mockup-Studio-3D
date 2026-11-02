import { Eye, EyeOff, MousePointer2, PenTool, Plus, Scissors, Trash2 } from 'lucide-react';
import { LATHE_PATH_SLOT_STROKES } from '@/engine/lathe-svg-path-slots';
import { BUILTIN_PROFILE_PATH_NAMES } from '@/scene/builtin-profile-path-names';
import {
  addSquarePath,
  nextFreeSlot,
  PROFILE_SLOT_COUNT,
  removePath,
  setPathSlot,
} from '@/scene/profile-edit';
import { getProfile, type ProfileEntry } from '@/scene/profile-library';
import type { ProfilePath } from '@/scene/profile-model';
import { Icon } from '@/ui/components/Icon';
import { PanelSelect } from '@/ui/components/PanelSelect';
import { SubPanel } from '@/ui/components/SubPanel';
import { SubPanelSection } from '@/ui/components/SubPanelSection';
import {
  closeProfileEditor,
  editProfilePath,
  editProfilePaths,
  getAppState,
  renameProfilePath,
  selectProfilePath,
  setProfileEditorTool,
  toggleProfilePathHidden,
} from '@/ui/store/app-store';
import type { ProfileEditorTool } from '@/ui/store/app-store-internals';
import { useAppStore } from '@/ui/store/use-app-store';
import { ProfilePointSection } from './ProfileNodeFields';

const TOOLS: readonly { tool: ProfileEditorTool; label: string; key: string; icon: typeof PenTool; ready: boolean }[] = [
  { tool: 'select', label: 'Select', key: 'V', icon: MousePointer2, ready: true },
  { tool: 'pen', label: 'Pen', key: 'P', icon: PenTool, ready: false },
  { tool: 'scissors', label: 'Scissors', key: 'C', icon: Scissors, ready: true },
];

/** What a slot means for the built-in assets, e.g. "Bottle: Glass · Can: Body". */
export function slotRoleHint(slot: number): string {
  const roles = Object.entries(BUILTIN_PROFILE_PATH_NAMES).flatMap(([asset, names]) => {
    const name = names?.[slot];
    return name ? [`${asset}: ${name}`] : [];
  });
  return roles.length > 0 ? roles.join(' · ') : 'No built-in role';
}

const SLOT_OPTIONS = Array.from({ length: PROFILE_SLOT_COUNT }, (_unused, slot) => ({
  value: String(slot),
  label: `Slot ${slot + 1}`,
}));

function ToolsSection() {
  const active = useAppStore((s) => s.profileEditorTool);
  return (
    <SubPanelSection title="Tools">
      <div className="panel-toggle-group profile-tools" role="group" aria-label="Tools">
        {TOOLS.map(({ tool, label, key, icon, ready }) => (
          <button
            key={tool}
            type="button"
            className="panel-toggle-group__button"
            aria-pressed={active === tool}
            disabled={!ready}
            title={ready ? `${label} (${key})` : `${label} (${key}) – coming next`}
            onClick={() => { setProfileEditorTool(tool); }}
          >
            <Icon icon={icon} size={16} strokeWidth={1.75} />
            {label}
          </button>
        ))}
      </div>
    </SubPanelSection>
  );
}

function PathRow({ profile, path }: { profile: ProfileEntry; path: ProfilePath }) {
  const selection = useAppStore((s) => s.profileNodeSelection);
  const hidden = useAppStore((s) => s.hiddenProfilePathIds.includes(path.id));
  const active = selection?.pathId === path.id;
  return (
    <li className={`profile-path-row${active ? ' profile-path-row--active' : ''}`}>
      <div className="profile-path-list__item">
        <button
          type="button"
          className="profile-path-row__select"
          aria-label={`Select path ${path.name}`}
          aria-current={active ? 'true' : undefined}
          onClick={() => { selectProfilePath(path.id); }}
        >
          <span className="info-list__swatch" style={{ background: LATHE_PATH_SLOT_STROKES[path.slot] }} />
        </button>
        <input
          type="text"
          className="panel-field-input profile-path-list__name"
          aria-label={`Name of path ${path.name}`}
          value={path.name}
          onFocus={() => { selectProfilePath(path.id); }}
          onChange={(event) => { renameProfilePath(profile.id, path.id, event.target.value); }}
        />
        <button
          type="button"
          className="btn btn--icon"
          aria-label={hidden ? `Show path ${path.name}` : `Hide path ${path.name}`}
          title={hidden ? 'Show in editor' : 'Hide in editor'}
          onClick={() => { toggleProfilePathHidden(path.id); }}
        >
          <Icon icon={hidden ? EyeOff : Eye} size={16} strokeWidth={1.75} />
        </button>
        <button
          type="button"
          className="btn btn--icon btn--danger"
          aria-label={`Delete path ${path.name}`}
          title="Delete path"
          onClick={() => {
            editProfilePaths(profile.id, (paths) => removePath(paths, path.id));
            if (active) {selectProfilePath(null);}
          }}
        >
          <Icon icon={Trash2} size={16} strokeWidth={1.75} />
        </button>
      </div>
      {active ? (
        <div className="profile-path-row__details">
          <PanelSelect
            label="Slot"
            value={String(path.slot)}
            options={SLOT_OPTIONS}
            onChange={(value) => {
              editProfilePaths(profile.id, (paths) => setPathSlot(paths, path.id, Number(value)));
            }}
          />
          <p className="profile-hint">{slotRoleHint(path.slot)}</p>
          <label className="panel-field-row panel-checkbox">
            <span className="panel-field-label">Closed</span>
            <span className="panel-field-controls">
              <input
                type="checkbox"
                className="panel-checkbox__input"
                checked={path.closed}
                disabled={path.nodes.length < 3}
                onChange={(event) => {
                  const closed = event.target.checked;
                  editProfilePath(profile.id, path.id, (current) => ({ ...current, closed }));
                }}
              />
            </span>
          </label>
          <p className="profile-hint">{`${path.nodes.length} points`}</p>
        </div>
      ) : null}
    </li>
  );
}

function PathsSection({ profile }: { profile: ProfileEntry }) {
  const full = nextFreeSlot(profile.paths) === null;
  return (
    <SubPanelSection title="Paths">
      <ul className="profile-path-rows" aria-label="Paths">
        {[...profile.paths]
          .sort((a, b) => a.slot - b.slot)
          .map((path) => <PathRow key={path.id} profile={profile} path={path} />)}
      </ul>
      <button
        type="button"
        className="btn btn--add"
        disabled={full}
        title={full ? 'All ten slots are used' : 'Add a square path in the next free slot'}
        onClick={() => {
          editProfilePaths(profile.id, (paths) => addSquarePath(paths));
          const added = getLastAddedPath(profile.id);
          if (added) {selectProfilePath(added);}
        }}
      >
        <Icon icon={Plus} />
        Add path
      </button>
    </SubPanelSection>
  );
}

function getLastAddedPath(profileId: string): string | null {
  return getProfile(profileId, getAppState().userProfiles)?.paths.at(-1)?.id ?? null;
}

/** Right inspector while the 2D editor is open: tools, paths and the selected point. */
export function ProfileInspector() {
  const editingProfileId = useAppStore((s) => s.editingProfileId);
  const userProfiles = useAppStore((s) => s.userProfiles);
  const profile = editingProfileId ? getProfile(editingProfileId, userProfiles) : undefined;
  if (!profile) {return null;}
  return (
    <SubPanel
      title="Profile editor"
      side="right"
      footer={
        <button type="button" className="btn" onClick={() => { closeProfileEditor(); }}>
          Done
        </button>
      }
    >
      <ToolsSection />
      <PathsSection profile={profile} />
      <ProfilePointSection profile={profile} />
    </SubPanel>
  );
}
