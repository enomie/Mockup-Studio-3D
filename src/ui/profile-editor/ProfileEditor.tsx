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
  isEndpoint,
  setPenHandles,
  moveNode,
  removePath,
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
  editProfilePaths,
  getAppState,
  selectProfilePath,
  setProfileEditorTool,
  setProfileJoinTarget,
  breakProfileAtNode,
  breakProfileAtSegment,
  joinProfileEndpoints,
  setProfileSnap,
  startProfilePen,
  appendProfilePenNode,
  closeProfilePen,
  finishProfilePen,
  selectProfileNode,
} from '@/ui/store/app-store';
import { useAppStore } from '@/ui/store/use-app-store';
import { mmToM } from '@/units/length';
import { snapPoint, type SnapResult } from '@/scene/profile-snap';
import {
  fitView,
  gridStepMm,
  toMm,
  toScreen,
  zoomAt,
  type EditorView,
} from './profile-editor-view';

/** Grid step for the hint, in meters without trailing zeros (e.g. 10 mm → "0.01"). */
export function formatGridStepMeters(stepMm: number): string {
  return String(Number(mmToM(stepMm).toFixed(4)));
}

/** Screen radius (px) of node and handle hit areas; large on purpose. */
const HIT_RADIUS_PX = 12;
const NODE_RADIUS_PX = 6;
const HANDLE_RADIUS_PX = 5;
const SEGMENT_HIT_WIDTH_PX = 14;
/** Movement (px) below which a background press counts as a click. */
const CLICK_SLOP_PX = 3;
/** Two presses on the same point within this time (ms) count as a double-click. */
const DOUBLE_CLICK_MS = 350;
/** Pen: a drag shorter than this (px) keeps the new point a corner. */
const PEN_DRAG_MIN_PX = 4;
/** Snap radius for points and axes, in screen px (independent of zoom). */
const SNAP_RADIUS_PX = 10;
/** Free area next to the floating side panels when fitting the view. */
const FIT_PADDING = { left: 420, right: 380, top: 80, bottom: 80 };

type Drag =
  | { kind: 'pan'; startX: number; startY: number; view: EditorView; moved: boolean; deselect: boolean }
  | { kind: 'node'; pathId: string; index: number; grabOffset: ProfileVec2 }
  | { kind: 'handle'; pathId: string; index: number; side: HandleSide }
  /** Pen: dragging after a click pulls the handles of the new point. */
  | { kind: 'pen-handle'; pathId: string; index: number };

function isEditableTarget(target: EventTarget | null): boolean {
  return target instanceof Element && Boolean(target.closest('input, textarea, select, [contenteditable="true"]'));
}

function readData(target: EventTarget | null): DOMStringMap | null {
  return target instanceof SVGElement ? target.dataset : null;
}

/** Open end points at the same position as `at`, excluding the current selection. */
export function pickJoinTarget(
  paths: readonly ProfilePath[],
  at: ProfileVec2,
  selection: { pathId: string; index: number | null } | null,
): { pathId: string; index: number } | null {
  for (const path of paths) {
    for (const index of [0, path.nodes.length - 1]) {
      const node = path.nodes[index];
      const same = Math.abs(node.x - at.x) < 1e-6 && Math.abs(node.y - at.y) < 1e-6;
      const selected = selection?.pathId === path.id && selection.index === index;
      if (same && !selected && isEndpoint(path, index)) {return { pathId: path.id, index };}
    }
  }
  return null;
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

/** Ring on a snapped point; short guide lines on snapped axes. */
function SnapIndicator({ view, hint, width, height }: { view: EditorView; hint: SnapResult; width: number; height: number }) {
  if (hint.target) {
    const p = toScreen(view, hint.target);
    return <circle cx={p.x} cy={p.y} r={SNAP_RADIUS_PX} className="profile-editor__snap-ring" />;
  }
  const p = toScreen(view, hint.point);
  const origin = toScreen(view, { x: 0, y: 0 });
  return (
    <g className="profile-editor__snap-axis">
      {hint.kindX === 'axis' ? <line x1={origin.x} x2={origin.x} y1={Math.max(0, p.y - 40)} y2={Math.min(height, p.y + 40)} /> : null}
      {hint.kindY === 'axis' ? <line y1={origin.y} y2={origin.y} x1={Math.max(0, p.x - 40)} x2={Math.min(width, p.x + 40)} /> : null}
    </g>
  );
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
  const selectedIndex =
    selectedPath && selection?.index != null && selection.index < selectedPath.nodes.length
      ? selection.index
      : null;
  const hiddenPathIds = useAppStore((s) => s.hiddenProfilePathIds);
  const joinTargetPoint = useAppStore((s) => s.profileJoinTarget);
  const activeTool = useAppStore((s) => s.profileEditorTool);
  const penPathId = useAppStore((s) => s.profilePenPathId);
  const [penHover, setPenHover] = useState<ProfileVec2 | null>(null);
  const [snapHint, setSnapHint] = useState<SnapResult | null>(null);
  const visiblePaths = profile ? profile.paths.filter((path) => !hiddenPathIds.includes(path.id)) : [];

  // Keys: the editor owns the keyboard while open (no scene delete or viewport shortcuts).
  useEffect(() => {
    if (!editingProfileId) {return undefined;}
    const onKeyDown = (event: KeyboardEvent) => {
      if (isEditableTarget(event.target)) {return;}
      if (event.ctrlKey || event.metaKey) {return;}
      event.stopPropagation();
      if (event.key === 'Escape' || event.key === 'Enter') {
        event.preventDefault();
        // First Esc/Enter ends a Pen path; Esc without a Pen path closes the editor.
        if (getAppState().profilePenPathId) {
          finishProfilePen();
        } else if (event.key === 'Escape') {
          closeProfileEditor();
        }
      } else if (event.key === 'Delete' || event.key === 'Backspace') {
        event.preventDefault();
        const current = getAppState().profileNodeSelection;
        if (current?.index != null) {
          const index = current.index;
          editProfilePath(editingProfileId, current.pathId, (path) => deleteNode(path, index));
          selectProfilePath(current.pathId);
        } else if (current) {
          // Only a path is selected: Delete removes the whole path.
          editProfilePaths(editingProfileId, (paths) => removePath(paths, current.pathId));
          selectProfileNode(null);
        }
      } else if (event.key === 'v' || event.key === 'V') {
        setProfileEditorTool('select');
      } else if ((event.key === 'g' || event.key === 'G') && !event.altKey) {
        setProfileSnap('grid', !getAppState().profileSnapGrid);
      } else if ((event.key === 'n' || event.key === 'N') && !event.altKey) {
        setProfileSnap('points', !getAppState().profileSnapPoints);
      } else if (event.key === 'p' || event.key === 'P') {
        setProfileEditorTool('pen');
      } else if (event.key === 'c' || event.key === 'C') {
        setProfileEditorTool('scissors');
      } else if (event.key === 'j' || event.key === 'J') {
        const state = getAppState();
        const a = state.profileNodeSelection;
        const b = state.profileJoinTarget;
        if (a?.index != null && b) {
          joinProfileEndpoints(editingProfileId, { pathId: a.pathId, index: a.index }, b);
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

  /**
   * Snaps a position (mm) to points/axes and the grid unless Alt is held. `exclude` is the
   * point being moved (it must not snap to itself). Shows the snap target while dragging.
   */
  const snap = (
    at: ProfileVec2,
    altKey: boolean,
    exclude?: { pathId: string; index: number },
  ): ProfileVec2 => {
    const state = getAppState();
    if (!view || altKey || (!state.profileSnapGrid && !state.profileSnapPoints)) {
      setSnapHint(null);
      return at;
    }
    const targets = visiblePaths.flatMap((path) =>
      path.nodes.filter((_node, i) => !(exclude?.pathId === path.id && exclude.index === i)),
    );
    const result = snapPoint(at, {
      grid: state.profileSnapGrid,
      points: state.profileSnapPoints,
      gridStepMm: gridStepMm(view.scale),
      radiusMm: SNAP_RADIUS_PX / view.scale,
      targets,
    });
    setSnapHint(result);
    return result.point;
  };

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
    const tool = getAppState().profileEditorTool;

    if (tool === 'pen') {
      const penPathId = getAppState().profilePenPathId;
      if (!penPathId) {
        if (data?.kind === 'node' && path && isEndpoint(path, index)) {
          // Clicking an open end continues that path.
          startProfilePen(profileId, mm, { pathId: path.id, index });
          return;
        }
        if (startProfilePen(profileId, snap(mm, event.altKey))) {
          const started = getAppState().profilePenPathId;
          if (started) {dragRef.current = { kind: 'pen-handle', pathId: started, index: 0 };}
        }
        return;
      }
      const drawing = findPath(penPathId);
      if (drawing && data?.kind === 'node' && path?.id === penPathId && index === 0 && drawing.nodes.length >= 3) {
        closeProfilePen(profileId);
        return;
      }
      const added = appendProfilePenNode(profileId, snap(mm, event.altKey));
      if (added !== null) {dragRef.current = { kind: 'pen-handle', pathId: penPathId, index: added };}
      return;
    }

    if (tool === 'scissors') {
      if (data?.kind === 'node' && path) {
        breakProfileAtNode(profileId, path.id, index);
        return;
      }
      if (data?.kind === 'segment' && path) {
        const segment = Number(data.segment);
        breakProfileAtSegment(profileId, path.id, segment, closestTOnSegment(path, segment, mm));
        return;
      }
      startPan(false);
      return;
    }

    if (data?.kind === 'node' && path && event.shiftKey) {
      // Shift-click picks a second end point for Join (the selection stays). Cut ends lie on
      // top of each other, so take any open end under the pointer that is not the selection.
      const target = pickJoinTarget(visiblePaths, path.nodes[index], getAppState().profileNodeSelection);
      if (target) {setProfileJoinTarget(target);}
      return;
    }
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
    if (activeTool === 'pen' && !drag) {
      const hover = pointerMm(event);
      setPenHover(hover ? snap(hover, event.altKey) : null);
    }
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
    if (drag.kind === 'pen-handle') {
      const minMm = PEN_DRAG_MIN_PX / (view?.scale ?? 1);
      editProfilePath(profileId, drag.pathId, (path) => {
        const node = path.nodes.at(drag.index);
        if (!node) {return path;}
        const tip = snap(mm, event.altKey, { pathId: drag.pathId, index: drag.index });
        const out = { x: tip.x - node.x, y: tip.y - node.y };
        return Math.hypot(out.x, out.y) < minMm ? path : setPenHandles(path, drag.index, out, event.shiftKey);
      });
      return;
    }
    if (drag.kind === 'node') {
      const target = snap(
        { x: mm.x + drag.grabOffset.x, y: mm.y + drag.grabOffset.y },
        event.altKey,
        { pathId: drag.pathId, index: drag.index },
      );
      editProfilePath(profileId, drag.pathId, (path) =>
        drag.index < path.nodes.length ? moveNode(path, drag.index, target.x, target.y) : path,
      );
      return;
    }
    const shift = event.shiftKey;
    editProfilePath(profileId, drag.pathId, (path) => {
      const node = path.nodes.at(drag.index);
      if (!node) {return path;}
      const tip = snap(mm, event.altKey, { pathId: drag.pathId, index: drag.index });
      return setHandle(path, drag.index, drag.side, { x: tip.x - node.x, y: tip.y - node.y }, shift);
    });
  };

  const onPointerUp = (event: ReactPointerEvent<SVGSVGElement>) => {
    const drag = dragRef.current;
    dragRef.current = null;
    if (activeTool !== 'pen') {setSnapHint(null);}
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    if (drag?.kind === 'pan' && drag.deselect && !drag.moved) {
      selectProfileNode(null);
    }
  };

  // Pen: dashed line from the last point of the path being drawn to the pointer.
  const penLast = penPathId ? findPath(penPathId)?.nodes.at(-1) : undefined;
  const penPreview = view && penLast && penHover && activeTool === 'pen'
    ? { from: toScreen(view, penLast), to: toScreen(view, penHover) }
    : null;

  const transform = view
    ? `matrix(${view.scale} 0 0 ${view.scale} ${view.offsetX} ${view.offsetY})`
    : undefined;

  return (
    <div className="profile-editor">
      <svg
        ref={svgRef}
        className={`profile-editor__canvas profile-editor__canvas--${activeTool}`}
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
              {visiblePaths.map((path) => {
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

            {snapHint ? <SnapIndicator view={view} hint={snapHint} height={size.height} width={size.width} /> : null}

            {penPreview ? (
              <line
                x1={penPreview.from.x}
                y1={penPreview.from.y}
                x2={penPreview.to.x}
                y2={penPreview.to.y}
                className="profile-editor__pen-preview"
              />
            ) : null}

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

            {visiblePaths.map((path) =>
              path.nodes.map((node, index) => {
                const point = toScreen(view, node);
                const selected = path.id === selectedPath?.id && index === selectedIndex;
                const joinTarget = joinTargetPoint?.pathId === path.id && joinTargetPoint.index === index;
                const nodeClass = `profile-editor__node${selected ? ' profile-editor__node--selected' : ''}${
                  joinTarget ? ' profile-editor__node--join' : ''}`;
                return (
                  <g key={`${path.id}-${index}`}>
                    {node.mode === 'smooth' ? (
                      <circle cx={point.x} cy={point.y} r={NODE_RADIUS_PX}
                        className={nodeClass}
                        style={{ stroke: LATHE_PATH_SLOT_STROKES[path.slot] }} />
                    ) : (
                      <rect x={point.x - NODE_RADIUS_PX} y={point.y - NODE_RADIUS_PX}
                        width={NODE_RADIUS_PX * 2} height={NODE_RADIUS_PX * 2}
                        className={nodeClass}
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
        {view ? `Grid ${formatGridStepMeters(gridStepMm(view.scale))} m · ` : null}
        Drag points and handles · Shift: break handles · Click a path: add point · Del: delete point ·
        Double-click: corner/smooth · C: scissors · Shift-click end + J: join · V: select ·
        P: pen (click = corner, drag = curve, click first point = close, Enter = finish) ·
        G / N: snap to grid / points · Alt: no snapping ·
        Wheel: zoom · Space or middle mouse: pan · Esc: close
      </p>
    </div>
  );
}
