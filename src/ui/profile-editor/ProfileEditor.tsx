import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactElement,
} from 'react';
import { Check } from 'lucide-react';
import { LATHE_PATH_SLOT_STROKES } from '@/engine/lathe-svg-path-slots';
import {
  closestTOnSegment,
  deleteNode,
  insertNode,
  moveNode,
  segmentControlPoints,
  segmentCount,
  setHandle,
  toggleNodeMode,
  type HandleSide,
} from '@/scene/profile-edit';
import { getProfile } from '@/scene/profile-library';
import {
  profileControlBounds,
  profilePathToSvgData,
  type ProfileNode,
  type ProfilePath,
  type ProfileVec2,
} from '@/scene/profile-model';
import { Icon } from '@/ui/components/Icon';
import {
  closeProfileEditor,
  editProfilePath,
  getAppState,
  selectProfileNode,
} from '@/ui/store/app-store';
import { useAppStore } from '@/ui/store/use-app-store';
import {
  fitView,
  gridStepMm,
  toMm,
  toScreen,
  zoomAt,
  type EditorView,
} from './profile-editor-view';

/** Screen radius (px) of node and handle hit areas; large on purpose. */
const HIT_RADIUS_PX = 12;
const NODE_RADIUS_PX = 6;
const HANDLE_RADIUS_PX = 5;
const SEGMENT_HIT_WIDTH_PX = 14;
/** Movement (px) below which a background press counts as a click. */
const CLICK_SLOP_PX = 3;
/** Two presses on the same point within this time (ms) count as a double-click. */
const DOUBLE_CLICK_MS = 350;
/** Free area next to the floating side panels when fitting the view. */
const FIT_PADDING = { left: 420, right: 380, top: 80, bottom: 80 };

type Drag =
  | { kind: 'pan'; startX: number; startY: number; view: EditorView; moved: boolean; deselect: boolean }
  | { kind: 'node'; pathId: string; index: number; grabOffset: ProfileVec2 }
  | { kind: 'handle'; pathId: string; index: number; side: HandleSide };

function isEditableTarget(target: EventTarget | null): boolean {
  return target instanceof Element && Boolean(target.closest('input, textarea, select, [contenteditable="true"]'));
}

function readData(target: EventTarget | null): DOMStringMap | null {
  return target instanceof SVGElement ? target.dataset : null;
}

function handlePoint(node: ProfileNode, side: HandleSide): ProfileVec2 | null {
  const handle = side === 'in' ? node.handleIn : node.handleOut;
  return handle ? { x: node.x + handle.x, y: node.y + handle.y } : null;
}

interface VisibleHandle {
  pathId: string;
  index: number;
  side: HandleSide;
  node: ProfileNode;
  point: ProfileVec2;
}

/** Handles of the selected node plus the neighbour handles that shape its segments. */
function visibleHandles(path: ProfilePath, index: number): VisibleHandle[] {
  const count = path.nodes.length;
  const candidates: { index: number; side: HandleSide }[] = [
    { index, side: 'in' },
    { index, side: 'out' },
  ];
  if (index > 0 || path.closed) {candidates.push({ index: (index - 1 + count) % count, side: 'out' });}
  if (index < count - 1 || path.closed) {candidates.push({ index: (index + 1) % count, side: 'in' });}
  return candidates.flatMap((candidate) => {
    const node = path.nodes[candidate.index];
    const point = handlePoint(node, candidate.side);
    return point ? [{ pathId: path.id, index: candidate.index, side: candidate.side, node, point }] : [];
  });
}

function Grid({ view, width, height }: { view: EditorView; width: number; height: number }) {
  const step = gridStepMm(view.scale);
  const major = step * 5;
  const topLeft = toMm(view, { x: 0, y: 0 });
  const bottomRight = toMm(view, { x: width, y: height });
  const lines: ReactElement[] = [];
  const startX = Math.floor(topLeft.x / step) * step;
  for (let x = startX; x <= bottomRight.x; x += step) {
    const sx = x * view.scale + view.offsetX;
    const isMajor = Math.abs(x / major - Math.round(x / major)) < 1e-6;
    lines.push(
      <line key={`x${x.toFixed(3)}`} x1={sx} x2={sx} y1={0} y2={height}
        className={isMajor ? 'profile-editor__grid--major' : 'profile-editor__grid'} />,
    );
  }
  const startY = Math.floor(topLeft.y / step) * step;
  for (let y = startY; y <= bottomRight.y; y += step) {
    const sy = y * view.scale + view.offsetY;
    const isMajor = Math.abs(y / major - Math.round(y / major)) < 1e-6;
    lines.push(
      <line key={`y${y.toFixed(3)}`} x1={0} x2={width} y1={sy} y2={sy}
        className={isMajor ? 'profile-editor__grid--major' : 'profile-editor__grid'} />,
    );
  }
  const origin = toScreen(view, { x: 0, y: 0 });
  return (
    <g aria-hidden="true">
      {lines}
      <line x1={origin.x} x2={origin.x} y1={0} y2={height} className="profile-editor__axis" />
      <line x1={0} x2={width} y1={origin.y} y2={origin.y} className="profile-editor__axis" />
    </g>
  );
}

export function ProfileEditor() {
  const editingProfileId = useAppStore((s) => s.editingProfileId);
  const userProfiles = useAppStore((s) => s.userProfiles);
  const selection = useAppStore((s) => s.profileNodeSelection);
  const profile = editingProfileId ? getProfile(editingProfileId, userProfiles) : undefined;

  const svgRef = useRef<SVGSVGElement>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [view, setView] = useState<EditorView | null>(null);
  const dragRef = useRef<Drag | null>(null);
  const spaceRef = useRef(false);
  const fittedFor = useRef<string | null>(null);
  const lastNodePress = useRef<{ key: string; time: number } | null>(null);

  // Track canvas size.
  useLayoutEffect(() => {
    const svg = svgRef.current;
    if (!svg) {return undefined;}
    const observer = new ResizeObserver(() => {
      const rect = svg.getBoundingClientRect();
      setSize({ width: rect.width, height: rect.height });
    });
    observer.observe(svg);
    return () => { observer.disconnect(); };
  }, [editingProfileId]);

  // Fit the view once per opened profile.
  useEffect(() => {
    if (!profile || size.width === 0 || fittedFor.current === profile.id) {return;}
    const bounds = profileControlBounds(profile) ?? { minX: 0, maxX: 100, minY: 0, maxY: 100 };
    const padding = size.width > FIT_PADDING.left + FIT_PADDING.right + 200
      ? FIT_PADDING
      : { left: 40, right: 40, top: 60, bottom: 60 };
    setView(fitView(bounds, size.width, size.height, padding));
    fittedFor.current = profile.id;
  }, [profile, size]);

  useEffect(() => {
    if (!editingProfileId) {fittedFor.current = null;}
  }, [editingProfileId]);

  const selectedPath = profile && selection
    ? profile.paths.find((path) => path.id === selection.pathId)
    : undefined;
  const selectedIndex = selectedPath && selection && selection.index < selectedPath.nodes.length
    ? selection.index
    : null;

  // Keys: the editor owns the keyboard while open (no scene delete or viewport shortcuts).
  useEffect(() => {
    if (!editingProfileId) {return undefined;}
    const onKeyDown = (event: KeyboardEvent) => {
      if (isEditableTarget(event.target)) {return;}
      if (event.ctrlKey || event.metaKey) {return;}
      event.stopPropagation();
      if (event.key === 'Escape') {
        event.preventDefault();
        closeProfileEditor();
      } else if (event.key === 'Delete' || event.key === 'Backspace') {
        event.preventDefault();
        const current = getAppState().profileNodeSelection;
        if (current) {
          editProfilePath(editingProfileId, current.pathId, (path) => deleteNode(path, current.index));
          selectProfileNode(null);
        }
      } else if (event.key === ' ') {
        event.preventDefault();
        spaceRef.current = true;
      }
    };
    const onKeyUp = (event: KeyboardEvent) => {
      if (event.key === ' ') {spaceRef.current = false;}
    };
    window.addEventListener('keydown', onKeyDown, { capture: true });
    window.addEventListener('keyup', onKeyUp, { capture: true });
    return () => {
      window.removeEventListener('keydown', onKeyDown, { capture: true });
      window.removeEventListener('keyup', onKeyUp, { capture: true });
    };
  }, [editingProfileId]);

  // Wheel zoom needs a non-passive listener.
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) {return undefined;}
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      const rect = svg.getBoundingClientRect();
      const anchor = { x: event.clientX - rect.left, y: event.clientY - rect.top };
      setView((current) => (current ? zoomAt(current, anchor, Math.exp(-event.deltaY * 0.0015)) : current));
    };
    svg.addEventListener('wheel', onWheel, { passive: false });
    return () => { svg.removeEventListener('wheel', onWheel); };
  }, [editingProfileId]);

  const pointerMm = useCallback((event: ReactPointerEvent): ProfileVec2 | null => {
    const svg = svgRef.current;
    if (!svg || !view) {return null;}
    const rect = svg.getBoundingClientRect();
    return toMm(view, { x: event.clientX - rect.left, y: event.clientY - rect.top });
  }, [view]);

  if (!profile || !editingProfileId) {
    return null;
  }
  const profileId = profile.id;

  const findPath = (pathId: string | undefined) =>
    profile.paths.find((path) => path.id === pathId);

  const onPointerDown = (event: ReactPointerEvent<SVGSVGElement>) => {
    if (!view) {return;}
    const data = readData(event.target);
    const mm = pointerMm(event);
    event.currentTarget.setPointerCapture(event.pointerId);

    const startPan = (deselect: boolean) => {
      dragRef.current = {
        kind: 'pan', startX: event.clientX, startY: event.clientY, view, moved: false, deselect,
      };
    };
    if (event.button === 1 || spaceRef.current) {
      event.preventDefault();
      startPan(false);
      return;
    }
    if (event.button !== 0 || !mm) {return;}

    const path = findPath(data?.pathId);
    const index = Number(data?.index);
    if (data?.kind === 'node' && path) {
      // Double-click detection here: pointer capture retargets the native dblclick to the canvas.
      const key = `${path.id}:${index}`;
      const last = lastNodePress.current;
      if (last?.key === key && event.timeStamp - last.time < DOUBLE_CLICK_MS) {
        lastNodePress.current = null;
        editProfilePath(profileId, path.id, (current) => toggleNodeMode(current, index));
        return;
      }
      lastNodePress.current = { key, time: event.timeStamp };
      const node = path.nodes[index];
      selectProfileNode({ pathId: path.id, index });
      dragRef.current = {
        kind: 'node', pathId: path.id, index, grabOffset: { x: node.x - mm.x, y: node.y - mm.y },
      };
      return;
    }
    if (data?.kind === 'handle' && path && (data.side === 'in' || data.side === 'out')) {
      dragRef.current = { kind: 'handle', pathId: path.id, index, side: data.side };
      return;
    }
    if (data?.kind === 'segment' && path) {
      const segment = Number(data.segment);
      const t = closestTOnSegment(path, segment, mm);
      let inserted = 0;
      editProfilePath(profileId, path.id, (current) => {
        const result = insertNode(current, segment, t);
        inserted = result.index;
        return result.path;
      });
      selectProfileNode({ pathId: path.id, index: inserted });
      dragRef.current = { kind: 'node', pathId: path.id, index: inserted, grabOffset: { x: 0, y: 0 } };
      return;
    }
    startPan(true);
  };

  const onPointerMove = (event: ReactPointerEvent<SVGSVGElement>) => {
    const drag = dragRef.current;
    if (!drag) {return;}
    if (drag.kind === 'pan') {
      const dx = event.clientX - drag.startX;
      const dy = event.clientY - drag.startY;
      if (Math.hypot(dx, dy) > CLICK_SLOP_PX) {drag.moved = true;}
      setView({ ...drag.view, offsetX: drag.view.offsetX + dx, offsetY: drag.view.offsetY + dy });
      return;
    }
    const mm = pointerMm(event);
    if (!mm) {return;}
    if (drag.kind === 'node') {
      editProfilePath(profileId, drag.pathId, (path) =>
        drag.index < path.nodes.length
          ? moveNode(path, drag.index, mm.x + drag.grabOffset.x, mm.y + drag.grabOffset.y)
          : path,
      );
      return;
    }
    const shift = event.shiftKey;
    editProfilePath(profileId, drag.pathId, (path) => {
      const node = path.nodes.at(drag.index);
      if (!node) {return path;}
      return setHandle(path, drag.index, drag.side, { x: mm.x - node.x, y: mm.y - node.y }, shift);
    });
  };

  const onPointerUp = (event: ReactPointerEvent<SVGSVGElement>) => {
    const drag = dragRef.current;
    dragRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    if (drag?.kind === 'pan' && drag.deselect && !drag.moved) {
      selectProfileNode(null);
    }
  };

  const transform = view
    ? `matrix(${view.scale} 0 0 ${view.scale} ${view.offsetX} ${view.offsetY})`
    : undefined;

  return (
    <div className="profile-editor">
      <svg
        ref={svgRef}
        className="profile-editor__canvas"
        role="application"
        aria-label={`Profile editor: ${profile.name}`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onContextMenu={(event) => { event.preventDefault(); }}
      >
        {view ? (
          <>
            <Grid view={view} width={size.width} height={size.height} />
            <g transform={transform}>
              {profile.paths.map((path) => {
                const active = path.id === selectedPath?.id;
                return (
                  <g key={path.id}>
                    <path
                      d={profilePathToSvgData(path)}
                      className={`profile-editor__path${active ? ' profile-editor__path--active' : ''}`}
                      style={{ stroke: LATHE_PATH_SLOT_STROKES[path.slot] }}
                    />
                    {Array.from({ length: segmentCount(path) }, (_unused, segment) => {
                      const [p0, p1, p2, p3] = segmentControlPoints(path, segment);
                      return (
                        <path
                          key={segment}
                          d={`M${p0.x},${p0.y}C${p1.x},${p1.y} ${p2.x},${p2.y} ${p3.x},${p3.y}`}
                          className="profile-editor__segment-hit"
                          style={{ strokeWidth: SEGMENT_HIT_WIDTH_PX }}
                          data-kind="segment"
                          data-path-id={path.id}
                          data-segment={segment}
                        />
                      );
                    })}
                  </g>
                );
              })}
            </g>

            {selectedPath && selectedIndex !== null
              ? visibleHandles(selectedPath, selectedIndex).map((handle) => {
                  const anchor = toScreen(view, handle.node);
                  const tip = toScreen(view, handle.point);
                  return (
                    <g key={`${handle.index}-${handle.side}`}>
                      <line x1={anchor.x} y1={anchor.y} x2={tip.x} y2={tip.y} className="profile-editor__handle-line" />
                      <circle cx={tip.x} cy={tip.y} r={HANDLE_RADIUS_PX} className="profile-editor__handle" />
                      <circle
                        cx={tip.x}
                        cy={tip.y}
                        r={HIT_RADIUS_PX}
                        className="profile-editor__hit"
                        data-kind="handle"
                        data-path-id={handle.pathId}
                        data-index={handle.index}
                        data-side={handle.side}
                      />
                    </g>
                  );
                })
              : null}

            {profile.paths.map((path) =>
              path.nodes.map((node, index) => {
                const point = toScreen(view, node);
                const selected = path.id === selectedPath?.id && index === selectedIndex;
                return (
                  <g key={`${path.id}-${index}`}>
                    {node.mode === 'smooth' ? (
                      <circle cx={point.x} cy={point.y} r={NODE_RADIUS_PX}
                        className={`profile-editor__node${selected ? ' profile-editor__node--selected' : ''}`}
                        style={{ stroke: LATHE_PATH_SLOT_STROKES[path.slot] }} />
                    ) : (
                      <rect x={point.x - NODE_RADIUS_PX} y={point.y - NODE_RADIUS_PX}
                        width={NODE_RADIUS_PX * 2} height={NODE_RADIUS_PX * 2}
                        className={`profile-editor__node${selected ? ' profile-editor__node--selected' : ''}`}
                        style={{ stroke: LATHE_PATH_SLOT_STROKES[path.slot] }} />
                    )}
                    <circle
                      cx={point.x}
                      cy={point.y}
                      r={HIT_RADIUS_PX}
                      className="profile-editor__hit"
                      data-kind="node"
                      data-path-id={path.id}
                      data-index={index}
                    />
                  </g>
                );
              }),
            )}
          </>
        ) : null}
      </svg>

      <div className="profile-editor__bar">
        <span className="profile-editor__title">{profile.name}</span>
        <button type="button" className="btn" onClick={() => { closeProfileEditor(); }}>
          <Icon icon={Check} size={16} strokeWidth={1.75} />
          Done
        </button>
      </div>
      <p className="profile-editor__hint">
        Drag points and handles · Shift: break handles · Click a path: add point · Del: delete point ·
        Double-click: corner/smooth · Wheel: zoom · Space or middle mouse: pan · Esc: close
      </p>
    </div>
  );
}
