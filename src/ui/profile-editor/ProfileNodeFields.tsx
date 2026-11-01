import {
  handleFromPolar,
  handlePolar,
  moveNode,
  setHandle,
  toggleNodeMode,
  type HandleSide,
} from '@/scene/profile-edit';
import type { ProfileEntry } from '@/scene/profile-library';
import type { ProfileNode, ProfilePath } from '@/scene/profile-model';
import { PanelAxisField } from '@/ui/components/PanelAxisField/PanelAxisField';
import { PanelCheckbox } from '@/ui/components/PanelCheckbox';
import { PanelToggleGroup } from '@/ui/components/PanelToggleGroup';
import { SubPanelSection } from '@/ui/components/SubPanelSection';
import { editProfilePath } from '@/ui/store/app-store';
import { useAppStore } from '@/ui/store/use-app-store';

const formatMm = (value: number): string => String(Math.round(value * 100) / 100);
const formatDeg = (value: number): string => String(Math.round(value * 10) / 10);

function parseNumber(raw: string): number | null {
  const value = Number(raw.trim().replace(',', '.'));
  return raw.trim() !== '' && Number.isFinite(value) ? value : null;
}

function parseNonNegative(raw: string): number | null {
  const value = parseNumber(raw);
  return value !== null && value >= 0 ? value : null;
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
      <PanelAxisField label={`${label} length`} unit="mm" value={length}
        format={formatMm} parse={parseNonNegative} onChange={(value) => { apply(value, angleDeg); }} />
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
        <PanelAxisField label="X" unit="mm" value={node.x} format={formatMm} parse={parseNumber}
          onChange={(x) => { edit((current) => moveNode(current, index, x, node.y)); }} />
        <PanelAxisField label="Y" unit="mm" value={node.y} format={formatMm} parse={parseNumber}
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
          <PanelAxisField label="Radius" unit="mm" value={node.radius ?? 0} format={formatMm}
            parse={parseNonNegative}
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

/** Numeric fields for the 2D editor: selected point and its path. */
export function ProfileNodeFields({ profile }: { profile: ProfileEntry }) {
  const selection = useAppStore((s) => s.profileNodeSelection);
  const path = selection ? profile.paths.find((entry) => entry.id === selection.pathId) : undefined;
  const node = path && selection ? path.nodes.at(selection.index) : undefined;

  if (!path || !node || !selection) {
    return (
      <SubPanelSection title="Point">
        <p className="profile-hint">Select a point in the editor to edit its values.</p>
      </SubPanelSection>
    );
  }
  return (
    <>
      <NodeFields profileId={profile.id} path={path} index={selection.index} node={node} />
      <SubPanelSection title={`Path · ${path.name}`}>
        <PanelCheckbox
          label="Closed"
          checked={path.closed}
          disabled={path.nodes.length < 3}
          onChange={(closed) => {
            editProfilePath(profile.id, path.id, (current) => ({ ...current, closed }));
          }}
        />
      </SubPanelSection>
    </>
  );
}
