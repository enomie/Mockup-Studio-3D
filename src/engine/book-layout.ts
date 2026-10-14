import {
  bookTotalThicknessM,
  coverOverhangM,
  isBookHardcoverKind,
  type BookParams,
} from '@/scene/asset-book';
import type { AssetKind } from '@/scene/asset-kind';

export interface BookLayoutPart {
  role: 'bookPages' | 'bookSpine' | 'bookFrontCover' | 'bookBackCover';
  sizeX: number;
  sizeY: number;
  sizeZ: number;
  centerX: number;
  centerY: number;
  centerZ: number;
}

export interface BookLayout {
  coverWidthM: number;
  coverHeightM: number;
  totalWidthM: number;
  totalThicknessM: number;
  panelCenterX: number;
  parts: BookLayoutPart[];
}

export function computeBookLayout(
  coverWidthM: number,
  coverHeightM: number,
  bookParams: BookParams,
  assetKind: AssetKind,
): BookLayout {
  const spineX = bookParams.spineThicknessM;
  const totalWidthM = spineX + coverWidthM;
  const totalThicknessM = bookTotalThicknessM(bookParams);
  const overhangM = coverOverhangM(bookParams, assetKind);
  const hardcover = isBookHardcoverKind(assetKind);

  const pagesWidthM = hardcover
    ? Math.max(0.01, coverWidthM - 2 * overhangM)
    : coverWidthM;
  const pagesHeightM = hardcover
    ? Math.max(0.01, coverHeightM - 2 * overhangM)
    : coverHeightM;

  const spineCenterX = -totalWidthM * 0.5 + spineX * 0.5;
  const panelCenterX = -totalWidthM * 0.5 + spineX + coverWidthM * 0.5;
  const centerY = coverHeightM * 0.5;

  const pagesCenterZ = 0;
  const frontCoverCenterZ =
    bookParams.pagesThicknessM * 0.5 + bookParams.coverThicknessM * 0.5;
  const backCoverCenterZ = -frontCoverCenterZ;

  const parts: BookLayoutPart[] = [
    {
      role: 'bookPages',
      sizeX: pagesWidthM,
      sizeY: pagesHeightM,
      sizeZ: bookParams.pagesThicknessM,
      centerX: panelCenterX,
      centerY,
      centerZ: pagesCenterZ,
    },
    {
      role: 'bookSpine',
      sizeX: spineX,
      sizeY: coverHeightM,
      sizeZ: totalThicknessM,
      centerX: spineCenterX,
      centerY,
      centerZ: 0,
    },
    {
      role: 'bookFrontCover',
      sizeX: coverWidthM,
      sizeY: coverHeightM,
      sizeZ: bookParams.coverThicknessM,
      centerX: panelCenterX,
      centerY,
      centerZ: frontCoverCenterZ,
    },
    {
      role: 'bookBackCover',
      sizeX: coverWidthM,
      sizeY: coverHeightM,
      sizeZ: bookParams.coverThicknessM,
      centerX: panelCenterX,
      centerY,
      centerZ: backCoverCenterZ,
    },
  ];

  return {
    coverWidthM,
    coverHeightM,
    totalWidthM,
    totalThicknessM,
    panelCenterX,
    parts,
  };
}
