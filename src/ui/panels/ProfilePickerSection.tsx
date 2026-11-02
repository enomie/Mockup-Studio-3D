import { Copy, PenLine } from 'lucide-react';
import { allProfiles, profileUrl, type ProfileEntry } from '@/scene/profile-library';
import { canonicalProfileId } from '@/scene/profile-registry';
import { Icon } from '@/ui/components/Icon';
import { PanelSelect } from '@/ui/components/PanelSelect';
import { SubPanelSection } from '@/ui/components/SubPanelSection';
import { duplicateProfile, editProfileFromAsset } from '@/ui/store/app-store';
import { useAppStore } from '@/ui/store/use-app-store';
import { sortBuiltinThenUserByName } from '@/ui/utils/library-list-order';

function profileOptionLabel(entry: ProfileEntry): string {
  return entry.source === 'builtin' && entry.usedBy ? `${entry.name} · ${entry.usedBy}` : entry.name;
}

interface ProfilePickerSectionProps {
  title: string;
  profileId: string;
  /** How the asset resolves its profile, incl. its fallback. */
  resolve: (id: string) => { entry: ProfileEntry; missing: boolean };
  missingHint: string;
  onChange: (profileId: string) => void;
}

/** Profile choice for profile-based assets: preview, select, Edit / Duplicate & edit. */
export function ProfilePickerSection({
  title,
  profileId,
  resolve,
  missingHint,
  onChange,
}: ProfilePickerSectionProps) {
  const userProfiles = useAppStore((s) => s.userProfiles);
  const value = canonicalProfileId(profileId);
  const { entry, missing } = resolve(value);
  const profiles = sortBuiltinThenUserByName(
    allProfiles(userProfiles),
    (profile) => profile.name,
    (profile) => profile.source === 'builtin',
  );
  const options = profiles.map((profile) => ({ value: profile.id, label: profileOptionLabel(profile) }));
  if (missing) {
    options.unshift({ value, label: 'Missing profile' });
  }

  return (
    <SubPanelSection title={title}>
      <div className="body-profile">
        <span className="tile__thumb tile__thumb--profile">
          <img src={profileUrl(entry)} alt="" />
        </span>
        <div className="body-profile__select">
          <PanelSelect label="Profile" value={value} options={options} onChange={onChange} />
        </div>
      </div>
      {missing ? <p className="profile-hint">{missingHint}</p> : null}
      <div className="material-editor-actions">
        {entry.source === 'user' && !missing ? (
          <button type="button" className="btn" onClick={() => { editProfileFromAsset(entry.id); }}>
            <Icon icon={PenLine} size={16} strokeWidth={1.75} />
            Edit profile
          </button>
        ) : (
          <button
            type="button"
            className="btn"
            onClick={() => {
              const copyId = duplicateProfile(entry.id);
              if (copyId) {
                onChange(copyId);
                editProfileFromAsset(copyId);
              }
            }}
          >
            <Icon icon={Copy} size={16} strokeWidth={1.75} />
            Duplicate & edit
          </button>
        )}
      </div>
    </SubPanelSection>
  );
}
