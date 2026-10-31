import { useState } from 'react';
import { ClipboardPaste, Copy, Trash2, X } from 'lucide-react';
import { Icon } from '@/ui/components/Icon';
import { removePatchPoint } from '@/scene/triangle-patch-point-edit';
import { mergeLinksOnRemove } from '@/scene/triangle-patch-linked-edit';
import { applyInnerPinkCoupling } from '@/scene/triangle-patch-coupled-pairs';
import { alignPatchNode, setPatchNodeSlot } from '@/ui/store/patch-edge-store';
import {
  extraSlotsFor,
  nodeHasFreePairs,
  nodeOffsetFromLocalTip,
  nodeSlotLocal,
} from '@/scene/patch-nodes';
import { PanelToggleGroup, type PanelToggleOption } from '@/ui/components/PanelToggleGroup';
import { SubPanelSection } from '@/ui/components/SubPanelSection';
import { RangeSlider } from '@/ui/components/RangeSlider';
import { DEFAULT_EDGE_BLEND, MAX_EDGE_BLEND, MIN_EDGE_BLEND } from '@/engine/patch-edge-correction';
import { PatchEdgesSection } from './PatchEdgesSection';
import { PanelAxisField } from '@/ui/components/PanelAxisField/PanelAxisField';
import { MaterialSelect } from '@/ui/panels/MaterialSelect';
import { useAppStore } from '@/ui/store/use-app-store';
import {
  copyPatchPointToClipboard,
  pastePatchPointFromClipboard,
  setPatchPointClipboard,
  setPatchPointPasteMode,
  usePatchPointClipboard,
  usePatchPointPasteMode,
} from '@/ui/store/patch-point-clipboard-store';
import type { PatchPointPasteMode } from '@/scene/triangle-patch-point-clipboard';
import {
  setKindParams,
  selectPatchHandle,
  setPatchAddPointMode,
  getAppState,
  } from '@/ui/store/app-store';
import {
  defaultPatchParamsForKind,
  isPatchAssetKind,
  isPatchCorner,
  replacePatchPoint,
  type PatchHandleTarget,
  type PatchMirror,
  type PatchPoint,
  type PatchParams,
} from '@/scene/asset-triangle-patch';
import {
  rotatePatchNodeHandlesAroundAnchor,
  translatePatchNodeAnchor,
} from '@/scene/triangle-patch-node-edit';
import type { AssetEntity } from '@/scene/entity-types';
import { MATERIAL_ALUMINUM_BRUSHED_ID } from '@/scene/material-ids';
import { formatLengthMeters, LENGTH_DECIMALS, parseLengthMetersInput } from '@/units/length';
import { formatDegrees, parseDegreesInput } from './field-input-helpers';

interface TrianglePatchFieldsProps {
  entity: AssetEntity;
}

const MIRROR_OPTIONS: PanelToggleOption<keyof PatchMirror>[] = [
  { key: 'x', label: 'X', title: 'Mirror across the YZ plane (flips X)' },
  { key: 'y', label: 'Y', title: 'Mirror across the XZ plane (flips Y); the copy may sit below the ground' },
  { key: 'z', label: 'Z', title: 'Mirror across the XY plane (flips Z)' },
];

const PASTE_MODES: { key: PatchPointPasteMode; label: string }[] = [
  { key: 'all', label: 'Position & Handles' },
  { key: 'position', label: 'Position Only' },
  { key: 'handles', label: 'Handles Only' },
];

const TARGETS: { key: PatchHandleTarget; label: string }[] = [
  { key: 'pos', label: 'Anchor Point' },
  { key: 'handleNext', label: 'Handle Forward (Pink)' },
  { key: 'handlePrev', label: 'Handle Backward (Pink)' },
  { key: 'handleCrossIn', label: 'Surface Handle (Yellow)' },
];

export function TrianglePatchFields({ entity }: TrianglePatchFieldsProps) {
  const materials = useAppStore((s) => s.materials);
  const clipboard = usePatchPointClipboard();
  const pasteMode = usePatchPointPasteMode();
  const slots = entity.materials;

  const patchParams: PatchParams = entity.patchParams ??
    defaultPatchParamsForKind(isPatchAssetKind(entity.assetKind) ? entity.assetKind : 'triangle-patch');
  // The viewport pick wins; local state covers the case where nothing is picked yet.
  const viewportEntityId = useAppStore((s) => s.patchHandleSelection?.entityId);
  const viewportPointId = useAppStore((s) => s.patchHandleSelection?.pointId);
  const viewportTargetKey = useAppStore((s) => s.patchHandleSelection?.targetKey);
  const [localPointId, setLocalPointId] = useState<string | null>(null);
  const addPointActive = useAppStore((s) => s.patchAddPointEntityId === entity.id);
  const [localTargetKey, setLocalTargetKey] = useState<PatchHandleTarget>('pos');
  const pickedInViewport = viewportEntityId === entity.id && viewportPointId !== undefined && viewportTargetKey !== undefined;
  const firstPoint = patchParams.points[0];
  const activeNode: PatchPoint =
    patchParams.points.find((point) => point.id === (pickedInViewport ? viewportPointId : localPointId)) ?? firstPoint;
  const selectedPointId = activeNode.id;
  const selectedTargetKey = pickedInViewport ? viewportTargetKey : localTargetKey;

  const [anchorHandleRotRad, setAnchorHandleRotRad] = useState({ x: 0, y: 0, z: 0 });
  const selectionKey = `${selectedPointId}:${selectedTargetKey}`;
  const [rotSelectionKey, setRotSelectionKey] = useState(selectionKey);
  if (rotSelectionKey !== selectionKey) {
    setRotSelectionKey(selectionKey);
    setAnchorHandleRotRad({ x: 0, y: 0, z: 0 });
  }

  // Shared point (node): the handles this patch does not map itself are edited on the node.
  const patchNodes = useAppStore((s) => s.patchNodes);
  const nodeOf = (point: PatchPoint) => {
    const node = point.nodeId ? patchNodes.find((n) => n.id === point.nodeId) : undefined;
    const use = node?.uses.find((u) => u.entityId === entity.id && u.pointId === point.id);
    return node && use ? { node, use } : null;
  };
  const activeShared = nodeOf(activeNode);
  const extraSlot = (key: PatchHandleTarget): string | null => {
    if (!activeShared || (key !== 'handleCrossOut' && key !== 'sharedPink')) {return null;}
    const extras = extraSlotsFor(activeShared.node, activeShared.use);
    return key === 'handleCrossOut' ? extras.yellow : extras.pink;
  };
  const selectedExtra = extraSlot(selectedTargetKey);
  const activeVec = activeShared && selectedExtra
    ? nodeSlotLocal(activeShared.node, selectedExtra, entity.transform)
    : selectedTargetKey === 'sharedPink' ? activeNode.pos : activeNode[selectedTargetKey];
  const writeExtra = (localTip: { x: number; y: number; z: number }) => {
    if (!activeShared || !selectedExtra) {return;}
    setPatchNodeSlot(
      activeShared.node.id,
      selectedExtra,
      nodeOffsetFromLocalTip(activeShared.node, localTip, entity.transform),
    );
  };

  const handleSelectTarget = (pointId: string, targetKey: PatchHandleTarget) => {
    setLocalPointId(pointId);
    setLocalTargetKey(targetKey);
    selectPatchHandle(entity.id, pointId, targetKey);
  };

  const commitPoint = (point: PatchPoint) => {
    setKindParams('patch', entity.id, { points: replacePatchPoint(patchParams.points, point) });
  };

  const renamePoint = (point: PatchPoint, input: HTMLInputElement) => {
    const name = input.value.trim();
    if (!name) {
      input.value = point.name;
      return;
    }
    if (name !== point.name) {commitPoint({ ...point, name });}
  };

  /** Removes an edge point; when it was selected, the previous point in the loop takes over. */
  const removePoint = (pointId: string) => {
    const index = patchParams.points.findIndex((point) => point.id === pointId);
    // A shared point of two linked edges is removed on both patches (links merge into one).
    const merged = mergeLinksOnRemove(entity, pointId, (id) => getAppState().entities.find((e) => e.id === id));
    const next = merged?.ownerParams ?? removePatchPoint(patchParams, pointId);
    if (next === patchParams) {return;}
    setKindParams('patch', entity.id, { points: next.points, edgeParams: next.edgeParams, edgeLinks: next.edgeLinks });
    if (merged) {
      const { points, edgeParams, edgeLinks } = merged.partnerParams;
      setKindParams('patch', merged.partnerId, { points, edgeParams, edgeLinks });
    }
    if (pointId === selectedPointId) {
      const previous = patchParams.points[(index - 1 + patchParams.points.length) % patchParams.points.length];
      handleSelectTarget(previous.id, 'pos');
    }
  };

  const updateCoord = (axis: 'x' | 'y' | 'z', value: number) => {

    if (selectedExtra) {
      writeExtra({ ...activeVec, [axis]: value });
      return;
    }
    if (selectedTargetKey === 'sharedPink') {return;}
    if (selectedTargetKey === 'pos') {
      commitPoint(translatePatchNodeAnchor(activeNode, {
        ...activeNode.pos,
        [axis]: value,
      }));
    } else {
      const nodeCopy = {
        ...activeNode,
        pos: { ...activeNode.pos },
        handleNext: { ...activeNode.handleNext },
        handlePrev: { ...activeNode.handlePrev },
        handleCrossIn: { ...activeNode.handleCrossIn },
        handleCrossOut: { ...activeNode.handleCrossOut },
      };

      nodeCopy[selectedTargetKey][axis] = value;
      // Handles move on their own; a coupled pink pair inside a shared edge turns along.
      commitPoint(applyInnerPinkCoupling(patchParams, nodeCopy, selectedTargetKey));
    }
  };

  const updateAnchorHandleRotation = (axis: 'x' | 'y' | 'z', radians: number): void => {
    setAnchorHandleRotRad((prev) => {
      const deltaRad = radians - prev[axis];
      if (Math.abs(deltaRad) < 1e-9) {return prev;}

      const deltaEuler = {
        x: axis === 'x' ? deltaRad : 0,
        y: axis === 'y' ? deltaRad : 0,
        z: axis === 'z' ? deltaRad : 0,
      };

      commitPoint(rotatePatchNodeHandlesAroundAnchor(activeNode, deltaEuler));

      return { ...prev, [axis]: radians };
    });
  };

  const scaleHandleLength = (factor: number) => {
    if (selectedTargetKey === 'pos') {return;}
    if (selectedExtra) {
      const p0 = activeNode.pos;
      writeExtra({
        x: p0.x + (activeVec.x - p0.x) * factor,
        y: p0.y + (activeVec.y - p0.y) * factor,
        z: p0.z + (activeVec.z - p0.z) * factor,
      });
      return;
    }
    if (selectedTargetKey === 'sharedPink') {return;}
    const nodeCopy = {
      ...activeNode,
      pos: { ...activeNode.pos },
      handleNext: { ...activeNode.handleNext },
      handlePrev: { ...activeNode.handlePrev },
      handleCrossIn: { ...activeNode.handleCrossIn },
      handleCrossOut: { ...activeNode.handleCrossOut },
    };

    const p0 = nodeCopy.pos;
    const curH = nodeCopy[selectedTargetKey];
    const dx = (curH.x - p0.x) * factor;
    const dy = (curH.y - p0.y) * factor;
    const dz = (curH.z - p0.z) * factor;

    nodeCopy[selectedTargetKey] = {
      x: p0.x + dx,
      y: p0.y + dy,
      z: p0.z + dz,
    };

    commitPoint(nodeCopy);
  };

  /** Handle list of a point: a shared point lists all its handles, neutrally numbered. */
  const targetsFor = (point: PatchPoint): { key: PatchHandleTarget; label: string }[] => {
    const shared = nodeOf(point);
    if (!shared) {return TARGETS;}
    const extras = extraSlotsFor(shared.node, shared.use);
    const alongIsNext = shared.node.along.includes(shared.use.next);
    const list: { key: PatchHandleTarget; label: string }[] = [
      { key: 'pos', label: 'Anchor Point' },
      { key: alongIsNext ? 'handleNext' : 'handlePrev', label: 'Pink 1' },
      { key: alongIsNext ? 'handlePrev' : 'handleNext', label: 'Pink 2' },
    ];
    if (extras.pink) {list.push({ key: 'sharedPink', label: 'Pink 3' });}
    list.push({ key: 'handleCrossIn', label: 'Yellow 1' });
    if (extras.yellow) {list.push({ key: 'handleCrossOut', label: 'Yellow 2' });}
    return list;
  };

  const mirror: PatchMirror = patchParams.mirror ?? { x: false, y: false, z: false };
  const setMirrorAxis = (axis: keyof PatchMirror, checked: boolean) => {
    setKindParams('patch', entity.id, { mirror: { ...mirror, [axis]: checked } });
  };

  const handleLen = selectedTargetKey !== 'pos'
    ? Math.hypot(activeVec.x - activeNode.pos.x, activeVec.y - activeNode.pos.y, activeVec.z - activeNode.pos.z)
    : 0;

  return (
    <>
      <SubPanelSection title="Material">
        <MaterialSelect
          entityId={entity.id}
          slot="patchMaterialId"
          materials={materials}
          value={slots?.patchMaterialId ?? MATERIAL_ALUMINUM_BRUSHED_ID}
        />
      </SubPanelSection>

      {patchParams.edgeLinks?.length ? (
        <SubPanelSection title="Linked Edges">
          <RangeSlider
            label="Edge Blend"
            min={MIN_EDGE_BLEND}
            max={MAX_EDGE_BLEND}
            step={0.01}
            value={patchParams.edgeBlend ?? DEFAULT_EDGE_BLEND}
            valueInputDecimals={0}
            valueDisplayScale={100}
            valueUnit="%"
            onChange={(value) => { setKindParams('patch', entity.id, { edgeBlend: value }); }}
          />
        </SubPanelSection>
      ) : null}

      <SubPanelSection title="Mirror">
        <PanelToggleGroup label="Axes" options={MIRROR_OPTIONS} active={mirror} onToggle={setMirrorAxis} />
      </SubPanelSection>

      <PatchEdgesSection entity={entity} params={patchParams} />

      <SubPanelSection title="Point & Handle Inspector">
        <ul className="patch-point-inspector-list">
          {patchParams.points.map((node) => {
            const selected = selectedPointId === node.id;
            const corner = isPatchCorner(patchParams, node.id);
            return (
              <li key={node.id} className="patch-point-inspector-item">
                <div
                  className="patch-point-inspector-point"
                  aria-current={selected ? 'true' : undefined}
                  aria-expanded={selected}
                  onClick={() => { handleSelectTarget(node.id, selectedTargetKey); }}
                >
                  <span
                    className={`patch-point-inspector-point__dot${corner ? '' : ' patch-point-inspector-point__dot--edge'}`}
                    title={corner ? 'Corner point' : 'Edge point'}
                  />
                  <input
                    key={node.name}
                    className="patch-point-inspector-point__name"
                    defaultValue={node.name}
                    aria-label="Point name"
                    onFocus={() => { if (!selected) {handleSelectTarget(node.id, selectedTargetKey);} }}
                    onBlur={(e) => { renamePoint(node, e.currentTarget); }}
                    onKeyDown={(e) => {
                      e.stopPropagation();
                      if (e.key === 'Enter') {e.currentTarget.blur();}
                      if (e.key === 'Escape') {
                        e.currentTarget.value = node.name;
                        e.currentTarget.blur();
                      }
                    }}
                  />
                  <button
                    type="button"
                    className="btn btn--icon"
                    aria-label={`Copy ${node.name}`}
                    title="Copy point position and handles (Ctrl+C)"
                    onClick={(e) => {
                      e.stopPropagation();
                      copyPatchPointToClipboard(entity.id, node.id);
                    }}
                  >
                    <Icon icon={Copy} />
                  </button>
                  <button
                    type="button"
                    className="btn btn--icon"
                    aria-label={`Paste onto ${node.name}`}
                    title="Paste copied point (Ctrl+V)"
                    disabled={!clipboard}
                    onClick={(e) => {
                      e.stopPropagation();
                      pastePatchPointFromClipboard(entity.id, node.id, pasteMode);
                    }}
                  >
                    <Icon icon={ClipboardPaste} />
                  </button>
                  {corner ? null : (
                    <button
                      type="button"
                      className="btn btn--icon"
                      aria-label={`Remove ${node.name}`}
                      title="Remove point"
                      onClick={(e) => {
                        e.stopPropagation();
                        removePoint(node.id);
                      }}
                    >
                      <Icon icon={Trash2} />
                    </button>
                  )}
                </div>

                {selected ? (
                  <div className="patch-point-inspector-detail panel-field-stack">
                    {activeShared ? (
                      <div className="panel-field-stack">
                        <span className="panel-field-label">
                          {nodeHasFreePairs(activeShared.node)
                            ? 'Some handles are free (Shift)'
                            : 'All handles opposite'}
                        </span>
                        <button
                          type="button"
                          className="btn"
                          disabled={!nodeHasFreePairs(activeShared.node)}
                          title="Put freed handles back opposite on their average direction (lengths stay)"
                          onClick={() => { alignPatchNode(activeShared.node.id); }}
                        >
                          Align handles opposite
                        </button>
                      </div>
                    ) : null}
                    <label htmlFor={`patch-target-${entity.id}`} className="panel-field-label">
                      Handle
                    </label>
                    <select
                      id={`patch-target-${entity.id}`}
                      className="panel-field-select"
                      value={selectedTargetKey}
                      onChange={(e) => { handleSelectTarget(node.id, e.target.value as PatchHandleTarget); }}
                    >
                      {targetsFor(node).map((t) => (
                        <option key={t.key} value={t.key}>
                          {t.label}
                        </option>
                      ))}
                    </select>

                    <PanelAxisField
                      label="X"
                      unit="m"
                      value={activeVec.x}
                      format={(val) => formatLengthMeters(val, LENGTH_DECIMALS)}
                      parse={parseLengthMetersInput}
                      onChange={(val) => { updateCoord('x', val); }}
                    />
                    <PanelAxisField
                      label="Y"
                      unit="m"
                      value={activeVec.y}
                      format={(val) => formatLengthMeters(val, LENGTH_DECIMALS)}
                      parse={parseLengthMetersInput}
                      onChange={(val) => { updateCoord('y', val); }}
                    />
                    <PanelAxisField
                      label="Z"
                      unit="m"
                      value={activeVec.z}
                      format={(val) => formatLengthMeters(val, LENGTH_DECIMALS)}
                      parse={parseLengthMetersInput}
                      onChange={(val) => { updateCoord('z', val); }}
                    />

                    {selectedTargetKey === 'pos' ? (
                      <>
                        <PanelAxisField
                          label="Rot X"
                          unit="°"
                          value={anchorHandleRotRad.x}
                          format={formatDegrees}
                          parse={parseDegreesInput}
                          onChange={(val) => { updateAnchorHandleRotation('x', val); }}
                        />
                        <PanelAxisField
                          label="Rot Y"
                          unit="°"
                          value={anchorHandleRotRad.y}
                          format={formatDegrees}
                          parse={parseDegreesInput}
                          onChange={(val) => { updateAnchorHandleRotation('y', val); }}
                        />
                        <PanelAxisField
                          label="Rot Z"
                          unit="°"
                          value={anchorHandleRotRad.z}
                          format={formatDegrees}
                          parse={parseDegreesInput}
                          onChange={(val) => { updateAnchorHandleRotation('z', val); }}
                        />
                      </>
                    ) : null}

                    {selectedTargetKey !== 'pos' ? (
                      <PanelAxisField
                        label="Length"
                        unit="m"
                        value={handleLen}
                        format={(val) => formatLengthMeters(val, LENGTH_DECIMALS)}
                        parse={parseLengthMetersInput}
                        onChange={(val) => {
                          if (handleLen > 0.0001) {
                            scaleHandleLength(val / handleLen);
                          }
                        }}
                      />
                    ) : null}
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
        {clipboard ? (
          <div className="panel-field-stack">
            <div className="patch-point-inspector-point">
              <span className="panel-field-label">Copied: {clipboard.label}</span>
              <button
                type="button"
                className="btn btn--icon"
                aria-label="Clear copied point"
                title="Clear copied point"
                onClick={() => { setPatchPointClipboard(null); }}
              >
                <Icon icon={X} />
              </button>
            </div>
            <select
              className="panel-field-select"
              aria-label="Paste mode"
              value={pasteMode}
              onChange={(e) => { setPatchPointPasteMode(e.target.value as PatchPointPasteMode); }}
            >
              {PASTE_MODES.map((m) => (
                <option key={m.key} value={m.key}>{m.label}</option>
              ))}
            </select>
          </div>
        ) : null}
        <button
          type="button"
          className="btn"
          aria-pressed={addPointActive}
          title="Click an edge in the viewport to place a point (Esc cancels)"
          onClick={() => { setPatchAddPointMode(addPointActive ? null : entity.id); }}
        >
          Add Point
        </button>
      </SubPanelSection>
    </>
  );
}
