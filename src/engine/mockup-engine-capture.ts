import { Color, type WebGPURenderer } from 'three/webgpu';
import { EXPORT_JPEG_QUALITY } from '@/constants';
import type { CaptureViewportImageOptions } from '@/scene/export-image';
import type { CameraController } from './camera-controller';
import type { EnvironmentSystem } from './environment-system';
import type { GizmoController } from './gizmo-controller';
import type { LightingSystem } from './lighting/lighting-system';

export interface MockupEngineCaptureHost {
  renderer: WebGPURenderer;
  cameras: CameraController;
  gizmo: GizmoController;
  environment: EnvironmentSystem;
  lighting: LightingSystem;
  updateViewportHelpersFrame: () => void;
  pushExportHidePhysicsTest: () => void;
  popExportHidePhysicsTest: () => void;
  pushExportShadowQuality: () => void;
  popExportShadowQuality: () => void;
  /** Renders at a fixed pixel size framed to its aspect; returns a restore callback. */
  pushExportOutputSize: (width: number, height: number) => () => void;
  renderViewportFrame: (overrides?: {
    skyEnabled?: boolean;
    transparentBackground?: boolean;
  }) => void;
}

export async function captureViewportImageFromEngine(
  host: MockupEngineCaptureHost,
  options: CaptureViewportImageOptions,
): Promise<Blob> {
  const includeSky = options.format === 'jpeg';
  const transparentBackground = options.format === 'png-transparent';
  const groundSurface = options.groundSurface ?? 'viewport';
  const useShadowCatcher =
    transparentBackground && groundSurface === 'contact-shadows-only';
  const camera = host.cameras.camera;
  host.gizmo.updateCamera(camera);
  host.environment.updateFrame(camera);
  host.lighting.updateFrame();
  host.updateViewportHelpersFrame();

  const prevClearColor = host.renderer.getClearColor(new Color());
  const prevClearAlpha = host.renderer.getClearAlpha();
  const prevAlpha = host.renderer.alpha;

  if (transparentBackground) {
    host.renderer.alpha = true;
    host.renderer.setClearColor(0x000000, 0);
  }

  if (useShadowCatcher) {
    host.environment.pushGroundExportCaptureMode('contact-shadows-only');
  }
  host.pushExportHidePhysicsTest();
  host.pushExportShadowQuality();
  host.lighting.updateFrame();
  const popOutputSize = options.outputSize
    ? host.pushExportOutputSize(options.outputSize.width, options.outputSize.height)
    : null;

  try {
    host.renderViewportFrame({ skyEnabled: includeSky, transparentBackground });

    const canvas = host.renderer.domElement;
    const mimeType = options.format === 'jpeg' ? 'image/jpeg' : 'image/png';
    const quality =
      options.format === 'jpeg'
        ? (options.jpegQuality ?? EXPORT_JPEG_QUALITY)
        : undefined;

    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
            return;
          }
          reject(new Error(`Failed to capture viewport as ${mimeType}.`));
        },
        mimeType,
        quality,
      );
    });
  } finally {
    popOutputSize?.();
    host.popExportShadowQuality();
    host.popExportHidePhysicsTest();
    if (useShadowCatcher) {
      host.environment.popGroundExportCaptureMode();
    }
    host.renderer.setClearColor(prevClearColor, prevClearAlpha);
    host.renderer.alpha = prevAlpha;
    host.renderViewportFrame();
  }
}
