import { Link, Scissors } from 'lucide-react';
import {
  breakAtNode,
  handleFromPolar,
  isEndpoint,
  joinEndpoints,
  handlePolar,
  moveNode,
  setHandle,
  toggleNodeMode,
  type HandleSide,
} from '@/scene/profile-edit';
import type { ProfileEntry } from '@/scene/profile-library';
import type { ProfileNode, ProfilePath } from '@/scene/profile-model';
import { PanelAxisField } from '@/ui/components/PanelAxisField/PanelAxisField';
import { PanelToggleGroup } from '@/ui/components/PanelToggleGroup';
import { SubPanelSection } from '@/ui/components/SubPanelSection';
import { Icon } from '@/ui/components/Icon';
import { breakProfileAtNode, editProfilePath, joinProfileEndpoints } from '@/ui/store/app-store';
import { useAppStore } from '@/ui/store/use-app-store';
import { ProfileGroupFields } from './ProfileGroupFields';
import { formatMmAsMeters, parseMmFromMetersInput } from '@/units/length';

/** Profiles are stored in mm; the UI shows and takes meters like the rest of the app. */
const formatMeters = (mm: number): string => formatMmAsMeters(mm);
const formatDeg = (value: number): string => String(Math.round(value * 10) / 10);

function parseNonNegativeMeters(raw: string): number | null {
  const mm = parseMmFromMetersInput(raw);
  return mm !== null && mm >= 0 ? mm : null;
}

function parseNumber(raw: string): number | null {
  const value = Number(raw.trim().replace(',', '.'));
  return raw.trim() !== '' && Number.isFinite(value) ? value : null;
}


const MODE_OPTIONS = [
  { key: 'corner', label: 'Corner' },
  { key: 'smooth', label: 'Smooth' },
] as const;

interface NodeFieldsProps {
  profileId: string;
  path: ProfilePath;
  index: number;
  node: ProfileNode;
}

function HandleFields({ profileId, path, index, node, side }: NodeFieldsProps & { side: HandleSide }) {
  const handle = side === 'in' ? node.handleIn : node.handleOut;
  if (!handle) {return null;}
  const { length, angleDeg } = handlePolar(handle);
  const label = side === 'in' ? 'Handle in' : 'Handle out';
  const apply = (lengthMm: number, angle: number) => {
    editProfilePath(profileId, path.id, (current) =>
      setHandle(current, index, side, handleFromPolar(lengthMm, angle)),
    );
  };
  return (
    <>
      <PanelAxisField label={`${label} length`} unit="m" value={length}
        format={formatMeters} parse={parseNonNegativeMeters} onChange={(value) => { apply(value, angleDeg); }} />
      <PanelAxisField label={`${label} angle`} unit="°" value={angleDeg}
        format={formatDeg} parse={parseNumber} onChange={(value) => { apply(length, value); }} />
    </>
  );
}

function NodeFields(props: NodeFieldsProps) {
  const { profileId, path, index, node } = props;
  const edit = (update: (current: ProfilePath) => ProfilePath) => {
    editProfilePath(profileId, path.id, update);
  };
  const canRound = !node.handleIn && !node.handleOut;
  return (
    <SubPanelSection title={`Point ${index + 1} · ${path.name}`}>
      <div className="panel-stack">
        <PanelAxisField label="X" unit="m" value={node.x} format={formatMeters} parse={parseMmFromMetersInput}
          onChange={(x) => { edit((current) => moveNode(current, index, x, node.y)); }} />
        <PanelAxisField label="Y" unit="m" value={node.y} format={formatMeters} parse={parseMmFromMetersInput}
          onChange={(y) => { edit((current) => moveNode(current, index, node.x, y)); }} />
        <PanelToggleGroup
          label="Type"
          options={MODE_OPTIONS}
          active={{ corner: node.mode === 'corner', smooth: node.mode === 'smooth' }}
          onToggle={(key) => {
            if (key !== node.mode) {edit((current) => toggleNodeMode(current, index));}
          }}
        />
        {canRound ? (
          <PanelAxisField label="Radius" unit="m" value={node.radius ?? 0} format={formatMeters}
            parse={parseNonNegativeMeters}
            onChange={(radius) => {
              edit((current) => {
                const nodes = [...current.nodes];
                const { radius: _old, ...rest } = nodes[index];
                nodes[index] = radius > 0 ? { ...rest, radius } : rest;
                return { ...current, nodes };
              });
            }} />
        ) : null}
        <HandleFields {...props} side="in" />
        <HandleFields {...props} side="out" />
      </div>
    </SubPanelSection>
  );
}

/** Numeric fields for the selected point of the 2D editor (right inspector). */
export function ProfilePointSection({ profile }: { profile: ProfileEntry }) {
  const selection = useAppStore((s) => s.profileNodeSelection);
  const extraCount = useAppStore((s) => s.profileExtraNodes.length);
  const path = selection ? profile.paths.find((entry) => entry.id === selection.pathId) : undefined;
  const index = selection?.index ?? null;
  const node = path && index !== null ? path.nodes.at(index) : undefined;

  if (!path || !node || index === null) {
    return (
      <SubPanelSection title="Point">
        <p className="profile-hint">Select a point in the editor to edit its values.</p>
      </SubPanelSection>
    );
  }
  return (
    <>
      {extraCount > 0
        ? <ProfileGroupFields profile={profile} />
        : <NodeFields profileId={profile.id} path={path} index={index} node={node} />}
      <CutJoinSection profile={profile} path={path} index={index} />
    </>
  );
}

/** Break here / Join for the selected point (Scissors, and two Shift-collected ends + J). */
function CutJoinSection({ profile, path, index }: { profile: ProfileEntry; path: ProfilePath; index: number }) {
  const extras = useAppStore((s) => s.profileExtraNodes);
  const target = extras.length === 1 ? extras[0] : null;
  const canBreak = breakAtNode(profile.paths, path.id, index) !== null;
  const canJoin = target !== null && joinEndpoints(profile.paths, { pathId: path.id, index }, target) !== null;
  return (
    <SubPanelSection title="Cut & join">
      <div className="material-editor-actions">
        <button
          type="button"
          className="btn"
          disabled={!canBreak}
          title={canBreak ? 'Cut the path at this point' : 'End points cannot be cut; all ten slots may be used'}
          onClick={() => { breakProfileAtNode(profile.id, path.id, index); }}
        >
          <Icon icon={Scissors} size={16} strokeWidth={1.75} />
          Break here
        </button>
        <button
          type="button"
          className="btn"
          disabled={!canJoin}
          title="Join with the other selected end point (J)"
          onClick={() => {
            if (target) {joinProfileEndpoints(profile.id, { pathId: path.id, index }, target);}
          }}
        >
          <Icon icon={Link} size={16} strokeWidth={1.75} />
          Join
        </button>
      </div>
      <p className="profile-hint">
        {isEndpoint(path, index)
          ? 'Shift-click another end point, then Join (J). Start + end of one path closes it.'
          : 'Join works on end points of open paths.'}
      </p>
    </SubPanelSection>
  );
}
