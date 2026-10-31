import { ArrowLeftRight, ClipboardPaste, Copy, Link, Unlink, X } from 'lucide-react';
import { Icon } from '@/ui/components/Icon';
import { SubPanelSection } from '@/ui/components/SubPanelSection';
import { useAppStore } from '@/ui/store/use-app-store';
import type { PatchParams } from '@/scene/asset-triangle-patch';
import type { AssetEntity } from '@/scene/entity-types';
import { isEdgeLinkValid, isSameSegment, listPatchSegments } from '@/scene/triangle-patch-edge-link';
import {
  copyPatchEdge,
  flipPatchEdgeLink,
  pastePatchEdge,
  segmentLabel,
  selectPatchEdge,
  setPatchEdgeClipboard,
  setPatchEdgePickMode,
  unlinkPatchEdge,
  usePatchEdgeClipboard,
} from '@/ui/store/patch-edge-store';

interface PatchEdgesSectionProps {
  entity: AssetEntity;
  params: PatchParams;
}

/** Edge segments of a patch: pick, copy, paste, link to another patch, flip and unlink. */
export function PatchEdgesSection({ entity, params }: PatchEdgesSectionProps) {
  const entities = useAppStore((s) => s.entities);
  const pickActive = useAppStore((s) => s.patchEdgePickEntityId === entity.id);
  const selEntityId = useAppStore((s) => s.patchEdgeSelection?.entityId);
  const selStart = useAppStore((s) => s.patchEdgeSelection?.startPointId);
  const selEnd = useAppStore((s) => s.patchEdgeSelection?.endPointId);
  const clipboard = usePatchEdgeClipboard();
  const findEntity = (id: string) => entities.find((e) => e.id === id);

  return (
    <SubPanelSection title="Edges">
      <ul className="patch-point-inspector-list">
        {listPatchSegments(params).map((segment) => {
          const key = `${segment.startPointId}>${segment.endPointId}`;
          const selected =
            selEntityId === entity.id &&
            selStart !== undefined && selEnd !== undefined &&
            isSameSegment(segment, { startPointId: selStart, endPointId: selEnd });
          const link = (params.edgeLinks ?? []).find((l) => isSameSegment(l, segment));
          const partner = link ? findEntity(link.partnerEntityId) : undefined;
          const valid = link ? isEdgeLinkValid(entity, link, findEntity) : false;
          const partnerLabel = link && partner?.patchParams
            ? `${partner.name} · ${segmentLabel(partner.patchParams, {
              startPointId: link.partnerStartPointId,
              endPointId: link.partnerEndPointId,
            })}`
            : 'missing partner';
          const isClipSource = clipboard?.sourceEntityId === entity.id && isSameSegment(clipboard.segment, segment);
          return (
            <li key={key} className="patch-point-inspector-item">
              <div
                className="patch-point-inspector-point"
                aria-current={selected ? 'true' : undefined}
                onClick={() => { selectPatchEdge({ entityId: entity.id, ...segment }); }}
              >
                <span className="patch-point-inspector-point__name">{segmentLabel(params, segment)}</span>
                <button
                  type="button"
                  className="btn btn--icon"
                  aria-label={`Copy edge ${segmentLabel(params, segment)}`}
                  title="Copy edge"
                  onClick={(e) => { e.stopPropagation(); copyPatchEdge(entity.id, segment); }}
                >
                  <Icon icon={Copy} />
                </button>
                <button
                  type="button"
                  className="btn btn--icon"
                  aria-label={`Paste edge onto ${segmentLabel(params, segment)}`}
                  title="Paste edge (one-time copy of the shape)"
                  disabled={!clipboard || isClipSource}
                  onClick={(e) => { e.stopPropagation(); pastePatchEdge(entity.id, segment, false); }}
                >
                  <Icon icon={ClipboardPaste} />
                </button>
                <button
                  type="button"
                  className="btn btn--icon"
                  aria-label={`Link edge ${segmentLabel(params, segment)}`}
                  title="Link edge (paste and keep both edges together)"
                  disabled={!clipboard || clipboard.sourceEntityId === entity.id}
                  onClick={(e) => { e.stopPropagation(); pastePatchEdge(entity.id, segment, true); }}
                >
                  <Icon icon={Link} />
                </button>
              </div>
              {link ? (
                <div className="patch-point-inspector-point">
                  <span className="panel-field-label" title={valid ? 'Linked edge' : 'Link is broken (partner deleted or edge split)'}>
                    {valid ? '🔗' : '⚠'} {partnerLabel}
                  </span>
                  {valid ? (
                    <button
                      type="button"
                      className="btn btn--icon"
                      aria-label="Flip linked edge direction"
                      title="Flip direction (this edge stays, the partner follows)"
                      onClick={() => { flipPatchEdgeLink(entity.id, link); }}
                    >
                      <Icon icon={ArrowLeftRight} />
                    </button>
                  ) : null}
                  <button
                    type="button"
                    className="btn btn--icon"
                    aria-label="Unlink edge"
                    title="Unlink (both edges stay where they are)"
                    onClick={() => { unlinkPatchEdge(entity.id, link); }}
                  >
                    <Icon icon={Unlink} />
                  </button>
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>
      {clipboard ? (
        <div className="patch-point-inspector-point">
          <span className="panel-field-label">Copied edge: {clipboard.label}</span>
          <button
            type="button"
            className="btn btn--icon"
            aria-label="Clear copied edge"
            title="Clear copied edge"
            onClick={() => { setPatchEdgeClipboard(null); }}
          >
            <Icon icon={X} />
          </button>
        </div>
      ) : null}
      <button
        type="button"
        className="btn"
        aria-pressed={pickActive}
        title="Click an edge in the viewport to select it (Esc cancels)"
        onClick={() => { setPatchEdgePickMode(pickActive ? null : entity.id); }}
      >
        Pick Edge
      </button>
    </SubPanelSection>
  );
}
