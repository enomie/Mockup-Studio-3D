import { MATERIAL_PRESETS } from '@/data/material-presets';
import type { FabricDrapeProfile } from '@/scene/material-types';
import { FABRIC_PLANE_DYNAMIC_FRICTION } from './constants';

export interface FabricClothSpringCoeffs {
  naturalFrequency: number;
  dampingRatio: number;
}

export interface FabricClothDrapeSimParams {
  profile: FabricDrapeProfile;
  areaDensityKgPerM2: number;
  edgeSoftness: FabricClothSpringCoeffs;
  bendSoftness: FabricClothSpringCoeffs;
  shearSoftness: FabricClothSpringCoeffs;
  linearDamping: number;
  deformationDamping: number;
  elasticDampingRatio: number;
  contactFriction: number;
}

const DEFAULT_PROFILE: FabricDrapeProfile = 'linen';

type ProfileRow = Omit<FabricClothDrapeSimParams, 'profile' | 'contactFriction'>;

const PROFILE_ROWS: Record<FabricDrapeProfile, ProfileRow> = {
  silk: {
    areaDensityKgPerM2: 0.09,
    edgeSoftness: { naturalFrequency: 42, dampingRatio: 0.55 },
    bendSoftness: { naturalFrequency: 22, dampingRatio: 0.62 },
    shearSoftness: { naturalFrequency: 36, dampingRatio: 0.58 },
    linearDamping: 0.48,
    deformationDamping: 0.42,
    elasticDampingRatio: 0.82,
  },
  linen: {
    areaDensityKgPerM2: 0.18,
    edgeSoftness: { naturalFrequency: 38, dampingRatio: 0.5 },
    bendSoftness: { naturalFrequency: 18, dampingRatio: 0.58 },
    shearSoftness: { naturalFrequency: 32, dampingRatio: 0.52 },
    linearDamping: 0.42,
    deformationDamping: 0.32,
    elasticDampingRatio: 0.86,
  },
  heavy: {
    areaDensityKgPerM2: 0.32,
    edgeSoftness: { naturalFrequency: 34, dampingRatio: 0.52 },
    bendSoftness: { naturalFrequency: 14, dampingRatio: 0.6 },
    shearSoftness: { naturalFrequency: 28, dampingRatio: 0.55 },
    linearDamping: 0.45,
    deformationDamping: 0.36,
    elasticDampingRatio: 0.85,
  },
  stiff: {
    areaDensityKgPerM2: 0.42,
    edgeSoftness: { naturalFrequency: 48, dampingRatio: 0.48 },
    bendSoftness: { naturalFrequency: 28, dampingRatio: 0.52 },
    shearSoftness: { naturalFrequency: 40, dampingRatio: 0.48 },
    linearDamping: 0.48,
    deformationDamping: 0.38,
    elasticDampingRatio: 0.84,
  },
};

function presetById(materialId: string) {
  return MATERIAL_PRESETS.find((entry) => entry.id === materialId) ?? null;
}

export function fabricDrapeProfileForMaterialId(materialId: string): FabricDrapeProfile {
  const preset = presetById(materialId);
  return preset?.fabricDrape?.profile ?? DEFAULT_PROFILE;
}

export function resolveFabricDrape(materialId: string): FabricClothDrapeSimParams {
  const profile = fabricDrapeProfileForMaterialId(materialId);
  const row = PROFILE_ROWS[profile];
  return {
    profile,
    ...row,
    contactFriction: FABRIC_PLANE_DYNAMIC_FRICTION,
  };
}

export function fabricClothParticleMassKg(
  drape: FabricClothDrapeSimParams,
  cellAreaM2: number,
): number {
  return drape.areaDensityKgPerM2 * cellAreaM2;
}

/** Legacy slime-like params (pre-drape wiring) — for regression tests only. */
export function legacyRubberyFabricDrapeParams(): FabricClothDrapeSimParams {
  return {
    profile: 'linen',
    areaDensityKgPerM2: 0.05,
    edgeSoftness: { naturalFrequency: 1, dampingRatio: FABRIC_PLANE_DYNAMIC_FRICTION },
    bendSoftness: { naturalFrequency: 1, dampingRatio: FABRIC_PLANE_DYNAMIC_FRICTION },
    shearSoftness: { naturalFrequency: 1, dampingRatio: FABRIC_PLANE_DYNAMIC_FRICTION },
    linearDamping: 0.15,
    deformationDamping: 0,
    elasticDampingRatio: 1,
    contactFriction: FABRIC_PLANE_DYNAMIC_FRICTION,
  };
}
