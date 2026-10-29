import {
  CanvasTexture,
  LinearFilter,
  LinearMipmapLinearFilter,
  SRGBColorSpace,
  WebGLRenderer,
  type Texture,
} from 'three';
import type { WebGPURenderer } from 'three/webgpu';
import type { ClothConfig } from '../config/clothConfig.ts';
import type { FabricImagePayload } from './fabricImageLoad.ts';

const CANVAS_MAX_EDGE = 1024;

/** Canvas + border inputs; width/height define cloth aspect for undistorted user images. */
export type FabricDrawConfig = Pick<
  ClothConfig,
  'borderThicknessMm' | 'borderColor' | 'width' | 'height'
>;

function resizeCanvasToAspect(
  canvas: HTMLCanvasElement,
  aspect: number,
  maxEdge = CANVAS_MAX_EDGE,
): void {
  if (aspect >= 1) {
    canvas.width = maxEdge;
    canvas.height = Math.max(1, Math.round(maxEdge / aspect));
  } else {
    canvas.height = maxEdge;
    canvas.width = Math.max(1, Math.round(maxEdge * aspect));
  }
}

export class FabricCanvasTexture {
  readonly canvas: HTMLCanvasElement;
  readonly texture: Texture;
  private ctx: CanvasRenderingContext2D;
  private loadedUserImage: HTMLImageElement | null = null;

  constructor() {
    this.canvas = document.createElement('canvas');
    resizeCanvasToAspect(this.canvas, 1);
    const ctx = this.canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Could not create fabric texture canvas');
    }
    this.ctx = ctx;
    this.texture = new CanvasTexture(this.canvas);
    // false = canvas top-left matches UV origin; paired with clothShellUv() in ClothSystem.
    this.texture.flipY = false;
    this.texture.colorSpace = SRGBColorSpace;
    this.texture.anisotropy = 8;
    this.texture.generateMipmaps = true;
    this.texture.minFilter = LinearMipmapLinearFilter;
    this.texture.magFilter = LinearFilter;
    this.redraw({
      borderThicknessMm: 3,
      borderColor: '#87CEEB',
      width: 0.9,
      height: 0.9,
    });
  }

  hasUserImage(): boolean {
    return this.loadedUserImage !== null;
  }

  applyPayload(payload: FabricImagePayload, config: FabricDrawConfig): void {
    this.loadedUserImage = payload.image;
    this.redraw(config);
  }

  setLoadedUserImage(image: HTMLImageElement | null): void {
    this.loadedUserImage = image;
  }

  clearUserImage(): void {
    this.loadedUserImage = null;
    resizeCanvasToAspect(this.canvas, 1);
  }

  redraw(config: FabricDrawConfig): void {
    const clothAspect = config.width / config.height;
    if (this.loadedUserImage) {
      resizeCanvasToAspect(this.canvas, clothAspect);
    } else {
      resizeCanvasToAspect(this.canvas, 1);
    }

    const w = this.canvas.width;
    const h = this.canvas.height;

    this.ctx.clearRect(0, 0, w, h);

    if (this.loadedUserImage) {
      // Aspect-matched canvas (not the HTML demo’s square stretch) so UVs stay undistorted on rectangular cloth.
      this.ctx.fillStyle = '#f8fafc';
      this.ctx.fillRect(0, 0, w, h);
      this.ctx.drawImage(this.loadedUserImage, 0, 0, w, h);
    } else {
      this.drawDefaultPattern(w, h);
    }

    this.drawBorder(config, w, h);
    this.texture.needsUpdate = true;
  }

  markGpuDirty(rendererInstance: WebGLRenderer | WebGPURenderer | null): void {
    this.texture.needsUpdate = true;
    if (!rendererInstance) return;
    if (rendererInstance instanceof WebGLRenderer) {
      rendererInstance.initTexture(this.texture);
    }
  }

  private drawDefaultPattern(w: number, h: number): void {
    this.ctx.fillStyle = '#f8fafc';
    this.ctx.fillRect(0, 0, w, h);

    const grad = this.ctx.createRadialGradient(
      w / 2,
      h / 2,
      50,
      w / 2,
      h / 2,
      w * 0.65,
    );
    grad.addColorStop(0, '#ffffff');
    grad.addColorStop(0.5, '#f1f5f9');
    grad.addColorStop(1, '#e2e8f0');
    this.ctx.fillStyle = grad;
    this.ctx.fillRect(0, 0, w, h);

    this.ctx.strokeStyle = 'rgba(14, 116, 144, 0.22)';
    this.ctx.lineWidth = 4;
    this.ctx.strokeRect(60, 60, w - 120, h - 120);

    this.ctx.strokeStyle = 'rgba(14, 116, 144, 0.12)';
    this.ctx.lineWidth = 1.5;
    this.ctx.strokeRect(80, 80, w - 160, h - 160);

    this.ctx.strokeStyle = 'rgba(0, 0, 0, 0.03)';
    this.ctx.lineWidth = 1;
    for (let i = 0; i < w; i += 12) {
      this.ctx.beginPath();
      this.ctx.moveTo(i, 0);
      this.ctx.lineTo(i, h);
      this.ctx.stroke();
    }

    this.ctx.save();
    this.ctx.fillStyle = 'rgba(15, 23, 42, 0.75)';
    this.ctx.font = 'bold 38px Inter, sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText('ATELIER DE SOIE', w / 2, h / 2 - 20);
    this.ctx.font = '500 18px Inter, sans-serif';
    this.ctx.fillStyle = 'rgba(51, 65, 85, 0.65)';
    this.ctx.fillText('100% PURE SILK  •  HAND-ROLLED HEM', w / 2, h / 2 + 25);
    this.ctx.restore();
  }

  private drawBorder(config: Pick<ClothConfig, 'borderThicknessMm' | 'borderColor'>, w: number, h: number): void {
    const borderMm = config.borderThicknessMm;
    if (borderMm <= 0) return;

    const borderPixels = Math.max(2, (borderMm / 900) * w);
    this.ctx.strokeStyle = config.borderColor;
    this.ctx.lineWidth = borderPixels * 2;
    this.ctx.strokeRect(0, 0, w, h);

    this.ctx.strokeStyle = 'rgba(0, 0, 0, 0.25)';
    this.ctx.lineWidth = 2;
    this.ctx.strokeRect(
      borderPixels,
      borderPixels,
      w - borderPixels * 2,
      h - borderPixels * 2,
    );
  }
}
