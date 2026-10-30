import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { Icon } from '@/ui/components/Icon';
import { removePatchPoint } from '@/scene/triangle-patch-point-edit';
import { PanelCheckbox } from '@/ui/components/PanelCheckbox';
import { SubPanelSection } from '@/ui/components/SubPanelSection';
import { PanelAxisField } from '@/ui/components/PanelAxisField/PanelAxisField';
import { MaterialSelect } from '@/ui/panels/MaterialSelect';
import { useAppStore } from '@/ui/store/use-app-store';
import {
  setKindParams,
  selectPatchHandle,
  setPatchAddPointMode,
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

const TARGETS: { key: PatchHandleTarget; label: string; color: string }[] = [
  { key: 'pos', label: 'Anchor Point', color: '#0284c7' },
  { key: 'handleNext', label: 'Handle Forward (Pink)', color: '#ec4899' },
  { key: 'handlePrev', label: 'Handle Backward (Pink)', color: '#ec4899' },
  { key: 'handleCrossIn', label: 'Cross-Tangent In (Yellow)', color: '#eab308' },
  { key: 'handleCrossOut', label: 'Cross-Tangent Out (Yellow)', color: '#eab308' },
];

export function TrianglePatchFields({ entity }: TrianglePatchFieldsProps) {
  const materials = useAppStore((s) => s.materials);
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

  const activeVec = activeNode[selectedTargetKey];

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
    const next = removePatchPoint(patchParams, pointId);
    if (next === patchParams) {return;}
    setKindParams('patch', entity.id, { points: next.points, edgeParams: next.edgeParams });
    if (pointId === selectedPointId) {
      const previous = patchParams.points[(index - 1 + patchParams.points.length) % patchParams.points.length];
      handleSelectTarget(previous.id, 'pos');
    }
  };

  const updateCoord = (axis: 'x' | 'y' | 'z', value: number) => {

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

      if (selectedTargetKey === 'handleCrossIn' || selectedTargetKey === 'handleCrossOut') {
        const isCrossIn = selectedTargetKey === 'handleCrossIn';
        const partnerKey = isCrossIn ? 'handleCrossOut' : 'handleCrossIn';

        const p0 = nodeCopy.pos;
        const curH = nodeCopy[selectedTargetKey];
        const oppH = nodeCopy[partnerKey];

        const dx = curH.x - p0.x;
        const dy = curH.y - p0.y;
        const dz = curH.z - p0.z;
        const len = Math.hypot(dx, dy, dz);

        const oppDx = oppH.x - p0.x;
        const oppDy = oppH.y - p0.y;
        const oppDz = oppH.z - p0.z;
        const oppLen = Math.hypot(oppDx, oppDy, oppDz);

        if (len > 0.0001) {
          nodeCopy[partnerKey] = {
            x: p0.x - (dx / len) * oppLen,
            y: p0.y - (dy / len) * oppLen,
            z: p0.z - (dz / len) * oppLen,
          };
        }
      }

      commitPoint(nodeCopy);
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

    if (selectedTargetKey === 'handleCrossIn' || selectedTargetKey === 'handleCrossOut') {
      const isCrossIn = selectedTargetKey === 'handleCrossIn';
      const partnerKey = isCrossIn ? 'handleCrossOut' : 'handleCrossIn';
      const oppH = nodeCopy[partnerKey];
      const oppLen = Math.hypot(oppH.x - p0.x, oppH.y - p0.y, oppH.z - p0.z);
      const newLen = Math.hypot(dx, dy, dz);
      if (newLen > 0.0001) {
        nodeCopy[partnerKey] = {
          x: p0.x - (dx / newLen) * oppLen,
          y: p0.y - (dy / newLen) * oppLen,
          z: p0.z - (dz / newLen) * oppLen,
        };
      }
    }

    commitPoint(nodeCopy);
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

      <SubPanelSection title="Mirror">
        <PanelCheckbox label="Mirror X" checked={mirror.x} onChange={(checked) => { setMirrorAxis('x', checked); }} />
        <PanelCheckbox label="Mirror Y" checked={mirror.y} onChange={(checked) => { setMirrorAxis('y', checked); }} />
        <PanelCheckbox label="Mirror Z" checked={mirror.z} onChange={(checked) => { setMirrorAxis('z', checked); }} />
      </SubPanelSection>

      <SubPanelSection title="Point & Handle Inspector">
        <ul className="patch-point-inspector-list">
          {patchParams.points.map((node) => {
            const selected = selectedPointId === node.id;
            const corner = isPatchCorner(patchParams, node.id);
            return (
              <li key={node.id} className="patch-point-inspector-item">
                <div
                  className={`patch-point-inspector-point${selected ? ' patch-point-inspector-point--active' : ''}`}
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
                  {corner ? null : (
                    <button
                      type="button"
                      className="patch-point-inspector-point__remove"
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
                    <label htmlFor={`patch-target-${entity.id}`} className="panel-field-label">
                      Handle
                    </label>
                    <select
                      id={`patch-target-${entity.id}`}
                      className="panel-field-select"
                      value={selectedTargetKey}
                      onChange={(e) => { handleSelectTarget(node.id, e.target.value as PatchHandleTarget); }}
                    >
                      {TARGETS.map((t) => (
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
        <button
          type="button"
          className={`toolbar-chip-btn${addPointActive ? ' toolbar-chip-btn--active' : ''}`}
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
