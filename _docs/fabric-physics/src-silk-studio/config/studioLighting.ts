export const DEFAULT_LIGHT_COLOR = '#efefef';

export const STUDIO_LIGHT_TARGET = { x: 0, y: 0.25, z: 0 };

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export interface ColorIntensityLight {
  color: string;
  intensity: number;
}

export interface ShadowDirectionalLight extends ColorIntensityLight {
  position: Vec3;
  shadowBlur: number;
}

export interface PositionalDirectionalLight extends ColorIntensityLight {
  position: Vec3;
}

export interface EnvironmentLighting {
  environmentIntensity: number;
  backgroundColor: string;
  backgroundIntensity: number;
  gradientTop: string;
  gradientBottom: string;
  rotationYDeg: number;
}

export interface StudioLightingState {
  ambient: ColorIntensityLight;
  key: ShadowDirectionalLight;
  fill: ShadowDirectionalLight;
  top: PositionalDirectionalLight;
  environment: EnvironmentLighting;
}

export function createDefaultStudioLighting(): StudioLightingState {
  return {
    ambient: { color: DEFAULT_LIGHT_COLOR, intensity: 1.4 },
    key: {
      color: DEFAULT_LIGHT_COLOR,
      intensity: 1.6,
      position: { x: 2.5, y: 4.5, z: 3 },
      shadowBlur: 4,
    },
    fill: {
      color: DEFAULT_LIGHT_COLOR,
      intensity: 0.8,
      position: { x: -3, y: 2.5, z: -2 },
      shadowBlur: 6,
    },
    top: {
      color: DEFAULT_LIGHT_COLOR,
      intensity: 0.5,
      position: { x: 0, y: 5, z: 0 },
    },
    environment: {
      environmentIntensity: 1,
      backgroundColor: '#fcfdfd',
      backgroundIntensity: 1,
      gradientTop: '#ffffff',
      gradientBottom: '#cbd5e1',
      rotationYDeg: 0,
    },
  };
}

export function environmentGradientKey(env: EnvironmentLighting): string {
  return `${env.gradientTop}|${env.gradientBottom}`;
}

export function shadowBlurSamples(blur: number): number {
  return blur <= 0.5 ? 4 : Math.min(25, Math.round(8 + blur * 1.5));
}
