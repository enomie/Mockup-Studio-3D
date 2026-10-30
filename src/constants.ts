/** MSAA sample count for viewport compositor, canvas, and planar mirror RT. */
export const VIEWPORT_MSAA_SAMPLES = 4;

/** Cap devicePixelRatio for viewport and export (performance vs sharpness). */
export const VIEWPORT_MAX_PIXEL_RATIO = 2;

/** Screen-space AA after scene composite (Three SMAANode). */
export const VIEWPORT_SMAA_ENABLED = true;

export const SKYBOX_RADIUS = 900;

/** PMREM resolution for sky-derived IBL (scene.environment). */
export const ENV_MAP_PMREM_SIZE = 512;

/** Debounce sky color edits before rebuilding the environment map. */
export const ENV_MAP_REBUILD_DEBOUNCE_MS = 100;

/** Max edge length for planar ground mirror render targets. */
export const PLANAR_REFLECTION_MAX_SIZE = 1024;

/** Mip chain on mirror RT — reduces grazing-angle aliasing; small GPU cost per mirror frame. */
export const PLANAR_REFLECTION_GENERATE_MIPMAPS = true;

export const FRUSTUM_SIZE = 8;

export const GROUND_PLANE_SIZE = 5000;

/** Shadow map resolution — 4096² for mm-scale contact shadows in studio mockups. */
export const SHADOW_MAP_SIZE = 4096;
/** One-frame image export — higher shadow map resolution (restored after capture). */
export const SHADOW_MAP_SIZE_EXPORT = 8192;

/** Pre-allocated light slots per type (v2 extra lights; studio rig reserves spot 0 + 1). */
export const LIGHT_POOL_SPOT_COUNT = 10;
export const LIGHT_POOL_DIRECTIONAL_COUNT = 10;
export const LIGHT_POOL_POINT_COUNT = 10;
export const LIGHT_POOL_MAX_SHADOW_CASTERS = 2;
export const LIGHT_POOL_KEY_SPOT_INDEX = 0;
export const LIGHT_POOL_FILL_SPOT_INDEX = 1;
/** Ortho shadow frustum half-size — 2.5 m → 5 m total coverage (directional / pool). */
export const SHADOW_CAMERA_HALF_EXTENT = 2.5;
/** Spot shadow coverage radius at the light target — 5 m diameter around scene center. */
export const SHADOW_COVERAGE_RADIUS = 2.5;
/** Minimum spot shadow coverage radius when fitting to scene content (m). */
export const SHADOW_COVERAGE_RADIUS_MIN = 1.25;
/** Extra margin beyond entity AABB horizontal extent for soft penumbra (m). */
export const SHADOW_COVERAGE_CONTENT_PADDING_M = 0.35;
export const SHADOW_CAMERA_NEAR = 0.1;
/** Past-target margin along the light axis (spot shadow camera far). */
export const SHADOW_CAMERA_FAR_MARGIN = 2;
/** PCF shadow softness — maps to light.shadow.radius (user slider in Lighting panel). */
export const SHADOW_SOFTNESS_MIN = 0;
export const SHADOW_SOFTNESS_MAX = 30;
export const SHADOW_SOFTNESS_DEFAULT = 4;
export const SHADOW_SOFTNESS_STEP = 0.5;
/**
 * Shadow map depth bias. Negative values → Peter Panning (gap under objects on ground).
 */
export const SHADOW_DEPTH_BIAS = 0;
/** World-space normal bias — 0 for floor contact; raise only if print/frame acne appears. */
export const SHADOW_NORMAL_BIAS = 0;

export const CAMERA_TARGET_Y = 0.137;
export const CAMERA_FOV = 45;
export const CAMERA_FOV_MIN = 15;
export const CAMERA_FOV_MAX = 90;
export const CAMERA_ORBIT_MIN_RADIUS = 0.35;
export const CAMERA_ORBIT_MAX_RADIUS = 10;
/** Default orbit distance — matches Default (1) preset for default-scene fabric cloth review. */
export const CAMERA_ORBIT_DEFAULT_RADIUS = 2.237;
/** Default navigation orbit at app start (degrees). */
export const CAMERA_DEFAULT_AZIMUTH_DEG = -18.4;
export const CAMERA_DEFAULT_ELEVATION_DEG = 41.5;
/** Camera sub-panel navigation fields (meters). */
export const CAMERA_NAV_LENGTH_DECIMALS = 3;
export const CAMERA_ORBIT_SENSITIVITY = 0.005;
export const CAMERA_PAN_SENSITIVITY = 0.003;
export const CAMERA_ZOOM_SPEED = 0.08;
export const CAMERA_ORTHO_MIN_ZOOM = 0.25;
export const CAMERA_ORTHO_MAX_ZOOM = 4;

/** Pixels before a pointer down becomes a camera drag instead of a click. */
export const VIEWPORT_CLICK_DRAG_THRESHOLD_PX = 4;

/** Inverted-hull selection outline color (matches --color-accent-text). */
export const SELECTION_OUTLINE_COLOR = 0x4d9fff;
export const SELECTION_OUTLINE_SCALE = 1.03;
export const SELECTION_OUTLINE_RENDER_ORDER = 1000;

export const LIGHT_WIREFRAME_IDLE_OPACITY = 0.3;
export const LIGHT_WIREFRAME_SELECTED_OPACITY = 1;
export const LIGHT_WIREFRAME_SELECTED_SCALE = 1.35;

/** Emissive softbox discs at Key / Fill rigs (world meters). */
export const LIGHT_FIXTURE_DISC_KEY_RADIUS = 0.35;
export const LIGHT_FIXTURE_DISC_FILL_RADIUS = 0.28;
export const LIGHT_FIXTURE_DISC_EMISSIVE_INTENSITY = 1;
export const LIGHT_FIXTURE_DISC_ROUGHNESS = 0.1;

/** Layer for Key/Fill fixture discs — optional exclusion from planar mirror reflector. */
export const FIXTURE_DISC_LAYER = 1;

export const VIEWPORT_HELPER_RENDER_ORDER = 900;
export const VIEWPORT_HELPER_OPACITY = 0.42;
export const VIEWPORT_HELPER_LINE_OPACITY = 0.45;

export const VIEWPORT_GRID_HALF_EXTENT_M = 25;
export const VIEWPORT_GRID_CELL_M = 1;
export const VIEWPORT_GRID_MAJOR_EVERY = 5;

export const VIEWPORT_ORIGIN_AXIS_LENGTH_M = 0.75;
export const VIEWPORT_COMPASS_ARROW_LENGTH_M = 1;
export const VIEWPORT_COMPASS_NORTH_LENGTH_SCALE = 1.35;
export const VIEWPORT_COMPASS_ARROW_HEAD_LENGTH_M = 0.28;
export const VIEWPORT_COMPASS_ARROW_HEAD_WIDTH_M = 0.22;
export const VIEWPORT_COMPASS_ARROW_SHAFT_WIDTH_M = 0.08;
export const VIEWPORT_QUADRANT_SIZE_M = 2;
export const VIEWPORT_QUADRANT_CELL_M = 0.25;
export const VIEWPORT_QUADRANT_LINE_OPACITY = 0.7;
export const VIEWPORT_QUADRANT_LABEL_SIZE_M = 0.6;
export const VIEWPORT_HELPER_GROUND_OFFSET_M = 0.002;

/** Fixed length for SpotLightHelper display (Key/Fill studio distance). */
export const VIEWPORT_SPOT_BEAM_DISPLAY_DISTANCE_M = 8;

export const SIZE_SCALE_MIN = 0.05;
export const SIZE_SCALE_MAX = 5;
export const DEFAULT_SIZE_SCALE = 1;

/** JPEG quality for viewport export (`image/jpeg` second argument to canvas.toBlob). */
export const EXPORT_JPEG_QUALITY = 0.92;

/** CPU matte path (`export-shadow-matte.ts`) — min luminance delta for shadow alpha. */
export const EXPORT_SHADOW_CATCHER_DELTA_MIN = 0.002;

/** CPU matte path — scale for shadow alpha from beauty vs no-shadow luminance delta. */
export const EXPORT_SHADOW_CATCHER_LUMINANCE_SCALE = 1;

