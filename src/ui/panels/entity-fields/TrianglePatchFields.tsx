import { useState } from 'react';
import { SubPanelSection } from '@/ui/components/SubPanelSection';
import { PanelAxisField } from '@/ui/components/PanelAxisField/PanelAxisField';
import { MaterialSelect } from '@/ui/panels/MaterialSelect';
import { useAppStore } from '@/ui/store/use-app-store';
import {
  selectPatchHandle,
  setTrianglePatchParams,
} from '@/ui/store/app-store';
import {
  defaultTrianglePatchParams,
  type PatchHandleTarget,
  type PatchNodeData,
  type TrianglePatchParams,
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

function patchPointLetter(index: number): string {
  return String.fromCharCode(65 + index);
}

function patchPointHint(node: PatchNodeData): string | undefined {
  const match = /\(([^)]+)\)/.exec(node.name);
  return match?.[1];
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

  const patchParams: TrianglePatchParams = entity.trianglePatchParams ?? defaultTrianglePatchParams();
  const [selectedCornerIdx, setSelectedCornerIdx] = useState<number>(0);
  const [selectedTargetKey, setSelectedTargetKey] = useState<PatchHandleTarget>('pos');
  const [anchorHandleRotRad, setAnchorHandleRotRad] = useState({ x: 0, y: 0, z: 0 });

  const activeNode = patchParams.nodes[selectedCornerIdx] ?? patchParams.nodes[0];
  const activeVec = activeNode[selectedTargetKey];

  const handleSelectTarget = (cornerIdx: number, targetKey: PatchHandleTarget) => {
    setSelectedCornerIdx(cornerIdx);
    setSelectedTargetKey(targetKey);
    setAnchorHandleRotRad({ x: 0, y: 0, z: 0 });
    selectPatchHandle(entity.id, cornerIdx, targetKey);
  };

  const updateCoord = (axis: 'x' | 'y' | 'z', value: number) => {
    const updatedNodes = [...patchParams.nodes] as [typeof patchParams.nodes[0], typeof patchParams.nodes[1], typeof patchParams.nodes[2]];

    if (selectedTargetKey === 'pos') {
      updatedNodes[selectedCornerIdx] = translatePatchNodeAnchor(activeNode, {
        ...activeNode.pos,
        [axis]: value,
      });
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

      updatedNodes[selectedCornerIdx] = nodeCopy;
    }

    setTrianglePatchParams(entity.id, { nodes: updatedNodes });
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

      const updatedNodes = [...patchParams.nodes] as [
        typeof patchParams.nodes[0],
        typeof patchParams.nodes[1],
        typeof patchParams.nodes[2],
      ];
      updatedNodes[selectedCornerIdx] = rotatePatchNodeHandlesAroundAnchor(
        activeNode,
        deltaEuler,
      );
      setTrianglePatchParams(entity.id, { nodes: updatedNodes });

      return { ...prev, [axis]: radians };
    });
  };

  const scaleHandleLength = (factor: number) => {
    if (selectedTargetKey === 'pos') {return;}
    const updatedNodes = [...patchParams.nodes] as [typeof patchParams.nodes[0], typeof patchParams.nodes[1], typeof patchParams.nodes[2]];
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

    updatedNodes[selectedCornerIdx] = nodeCopy;
    setTrianglePatchParams(entity.id, { nodes: updatedNodes });
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

      <SubPanelSection title="Point & Handle Inspector">
        <ul className="patch-point-inspector-list">
          {patchParams.nodes.map((node, cornerIdx) => {
            const selected = selectedCornerIdx === cornerIdx;
            const hint = patchPointHint(node);
            return (
              <li key={node.id} className="patch-point-inspector-item">
                <button
                  type="button"
                  className={`patch-point-inspector-point${selected ? ' patch-point-inspector-point--active' : ''}`}
                  aria-expanded={selected}
                  onClick={() => { handleSelectTarget(cornerIdx, selectedTargetKey); }}
                >
                  <span className="patch-point-inspector-point__letter">{patchPointLetter(cornerIdx)}</span>
                  {hint ? (
                    <span className="patch-point-inspector-point__hint">{hint}</span>
                  ) : null}
                </button>

                {selected ? (
                  <div className="patch-point-inspector-detail panel-field-stack">
                    <label htmlFor={`patch-target-${entity.id}`} className="panel-field-label">
                      Handle
                    </label>
                    <select
                      id={`patch-target-${entity.id}`}
                      className="panel-field-select"
                      value={selectedTargetKey}
                      onChange={(e) => { handleSelectTarget(cornerIdx, e.target.value as PatchHandleTarget); }}
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
      </SubPanelSection>
    </>
  );
}
