import { BackSide, MeshBasicNodeMaterial } from 'three/webgpu';
import { float, max, mix, normalize, positionLocal, smoothstep } from 'three/tsl';
import type { Rgb } from '@/colors/rgb';
import { SCENE_DEFAULTS } from '@/config/scene-defaults';
import { createFloatUniform, setUniformFloat } from './uniform-float';
import { createRgbUniform, setUniformRgb } from './uniform-rgb';

export interface SkyState {
  horizonColor: Rgb;
  zenithColor: Rgb;
  gradientFade: number;
}

const { environment } = SCENE_DEFAULTS;

const DEFAULT_SKY_STATE: SkyState = {
  horizonColor: environment.skyHorizonColor,
  zenithColor: environment.skyZenithColor,
  gradientFade: environment.skyGradientFade,
};

export class SkyboxMaterial extends MeshBasicNodeMaterial {
  readonly uHorizonColor = createRgbUniform(environment.skyHorizonColor);
  readonly uZenithColor = createRgbUniform(environment.skyZenithColor);
  readonly uGradientFade = createFloatUniform(environment.skyGradientFade);

  constructor(initial: SkyState = DEFAULT_SKY_STATE) {
    super({ side: BackSide, depthWrite: false });

    // Unlit sky — no scene lights or fog on the sky pass material.
    this.lights = false;
    this.fog = false;

    // Sphere is centered on the camera; local direction matches world sky direction.
    const y = max(normalize(positionLocal).y, float(0));
    // Arithmetic (not mix) keeps fade uniform live in the compiled shader graph.
    const horizonEnd = float(0.9).sub(this.uGradientFade.mul(float(0.85)));
    const blend = smoothstep(horizonEnd, float(1), y);
    this.colorNode = mix(this.uHorizonColor, this.uZenithColor, blend);

    this.setSkyState(initial);
  }

  setSkyState(state: SkyState): void {
    setUniformRgb(this.uHorizonColor, state.horizonColor);
    setUniformRgb(this.uZenithColor, state.zenithColor);
    setUniformFloat(this.uGradientFade, state.gradientFade);
  }

  setHorizonColor(rgb: Rgb): void {
    setUniformRgb(this.uHorizonColor, rgb);
  }

  setZenithColor(rgb: Rgb): void {
    setUniformRgb(this.uZenithColor, rgb);
  }

  setGradientFade(fade: number): void {
    setUniformFloat(this.uGradientFade, fade);
  }
}

export function createSkyboxMaterial(initial?: SkyState): SkyboxMaterial {
  return new SkyboxMaterial(initial);
}
