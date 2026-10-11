/**
 * Legacy module path — viewport rendering lives in `src/render/viewport-render-pipeline.ts`.
 */
export {
  compositeSceneToTarget as renderSceneFrame,
  type ViewportFrameParams,
  ViewportRenderPipeline,
} from '@/render/viewport-render-pipeline';
