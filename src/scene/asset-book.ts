import type { AssetKind } from './asset-kind';
import { MM_TO_M } from '@/units/length';
import { clamp } from '@/units/math';

export interface BookParams {
  pagesThicknessM: number;
  coverThicknessM: number;
  spineThicknessM: number;
  coverOverhangMm: number;
  hingeGrooveEnabled: boolean;
  hingeGrooveOffsetMm: number;
  hingeGrooveWidthMm: number;
  hingeGrooveIntensity: number;
}

export const BOOK_REF_COVER_WIDTH_M = 0.148;
export const BOOK_PLACEHOLDER_ASPECT = 148 / 210;

const PAGES_THICKNESS_MIN_M = 0.005;
const PAGES_THICKNESS_MAX_M = 0.2;
const COVER_THICKNESS_MIN_M = 0.0005;
const COVER_THICKNESS_MAX_M = 0.02;
const SPINE_THICKNESS_MIN_M = 0.0005;
const SPINE_THICKNESS_MAX_M = 0.02;
const OVERHANG_MIN_MM = 0;
const OVERHANG_MAX_MM = 30;
const HINGE_OFFSET_MIN_MM = 0;
const HINGE_OFFSET_MAX_MM = 20;
const HINGE_WIDTH_MIN_MM = 0.2;
const HINGE_WIDTH_MAX_MM = 12;

export function bookTotalThicknessM(params: BookParams): number {
  return params.pagesThicknessM + 2 * params.coverThicknessM;
}

export function isBookAssetKind(kind: AssetKind): boolean {
  return kind === 'book-softcover' || kind === 'book-hardcover';
}

export function isBookHardcoverKind(kind: AssetKind): boolean {
  return kind === 'book-hardcover';
}

export function defaultBookParams(kind: AssetKind): BookParams {
  const hardcover = isBookHardcoverKind(kind);
  return {
    pagesThicknessM: 0.02,
    coverThicknessM: 0.002,
    spineThicknessM: 0.002,
    coverOverhangMm: hardcover ? 3 : 0,
    hingeGrooveEnabled: true,
    hingeGrooveOffsetMm: 5,
    hingeGrooveWidthMm: hardcover ? 1.5 : 2.5,
    hingeGrooveIntensity: hardcover ? 0.45 : 0.25,
  };
}

export function cloneBookParams(params: BookParams): BookParams {
  return { ...params };
}

function positiveThicknessM(
  value: number | undefined,
  fallback: number,
  minM: number,
  maxM: number,
): number {
  const raw = value !== undefined && value > 0 ? value : fallback;
  return clamp(raw, minM, maxM);
}

/** Defaults + clamps; missing or zero thickness fields fall back to kind defaults. */
export function resolveBookParams(
  kind: AssetKind,
  stored?: Partial<BookParams> | null,
): BookParams {
  return clampBookParams(stored ?? {}, defaultBookParams(kind), kind);
}

export function clampBookParams(
  partial: Partial<BookParams>,
  base: BookParams,
  kind: AssetKind,
): BookParams {
  const coverThicknessM = positiveThicknessM(
    partial.coverThicknessM,
    base.coverThicknessM,
    COVER_THICKNESS_MIN_M,
    COVER_THICKNESS_MAX_M,
  );
  const spineThicknessM = positiveThicknessM(
    partial.spineThicknessM,
    base.spineThicknessM > 0 ? base.spineThicknessM : coverThicknessM,
    SPINE_THICKNESS_MIN_M,
    SPINE_THICKNESS_MAX_M,
  );
  const hardcover = isBookHardcoverKind(kind);
  const overhangRaw = partial.coverOverhangMm ?? base.coverOverhangMm;
  const coverOverhangMm = hardcover
    ? clamp(overhangRaw, OVERHANG_MIN_MM, OVERHANG_MAX_MM)
    : 0;

  return {
    pagesThicknessM: positiveThicknessM(
      partial.pagesThicknessM,
      base.pagesThicknessM,
      PAGES_THICKNESS_MIN_M,
      PAGES_THICKNESS_MAX_M,
    ),
    coverThicknessM,
    spineThicknessM,
    coverOverhangMm,
    hingeGrooveEnabled: partial.hingeGrooveEnabled ?? base.hingeGrooveEnabled,
    hingeGrooveOffsetMm: clamp(
      partial.hingeGrooveOffsetMm ?? base.hingeGrooveOffsetMm,
      HINGE_OFFSET_MIN_MM,
      HINGE_OFFSET_MAX_MM,
    ),
    hingeGrooveWidthMm: clamp(
      partial.hingeGrooveWidthMm ?? base.hingeGrooveWidthMm,
      HINGE_WIDTH_MIN_MM,
      HINGE_WIDTH_MAX_MM,
    ),
    hingeGrooveIntensity: clamp(
      partial.hingeGrooveIntensity ?? base.hingeGrooveIntensity,
      0,
      1,
    ),
  };
}

export function coverOverhangM(params: BookParams, kind: AssetKind): number {
  if (!isBookHardcoverKind(kind)) {return 0;}
  return params.coverOverhangMm * MM_TO_M;
}
