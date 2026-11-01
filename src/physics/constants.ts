/** 1 Three unit = 1 meter. */
export const STANDARD_GRAVITY_Y_MPS2 = -9.81;

export const GRAVITY = { x: 0, y: STANDARD_GRAVITY_Y_MPS2, z: 0 };

/** Physics-only outward collider shell (0.5 cm per face). Not applied to mass or render meshes. */
export const PHYSICS_COLLIDER_MARGIN_M = 0.005;

export const FIXED_TIMESTEP = 1 / 60;

/** Thin collider — top surface aligns with visual ground plane at y = 0. */
export const GROUND_HALF_THICKNESS = 0.05;

/** Rapier friction on the always-on ground collider (rigid fall test + future props). */
export const GROUND_COLLIDER_FRICTION = 0.65;

/** No bounce on ground — mockup contact, not rubber ball. */
export const GROUND_COLLIDER_RESTITUTION = 0;

export const RIGID_DYNAMIC_FRICTION = 0.8;
export const RIGID_DYNAMIC_RESTITUTION = 0;

/** All session dynamic rigid bodies (block, fabric plane, rigid test, future cylinder). */
export const PHYSICS_DYNAMIC_LINEAR_DAMPING = 0.4;
export const PHYSICS_DYNAMIC_ANGULAR_DAMPING = 0.55;

/** Fixed grid cell size for fabric cloth sim mesh (~1.25 cm); not user-tunable. */
export const FABRIC_CLOTH_SIM_CELL_SIZE_M = 0.0125;

/** PlaneGeometry segment counts (cells per axis). */
export const FABRIC_CLOTH_SIM_MIN_SEGMENTS_PER_AXIS = 2;
/** Cap subdivisions on large cloth panels (requirements-assets-fabric-cloth.md). */
export const FABRIC_CLOTH_SIM_MAX_SEGMENTS_PER_AXIS = 64;

/** World-physics cloth sync: recompute normals every N simulation ticks (positions every tick). */
export const FABRIC_CLOTH_SYNC_NORMALS_EVERY_N_FRAMES = 1;
export const FABRIC_CLOTH_SYNC_BOUNDS_EVERY_N_FRAMES = 2;

/** Catmull-Rom upsampling per axis when baking fabric cloth (smooth folds between sim vertices). */
export const FABRIC_CLOTH_BAKE_SUBDIV_FACTOR = 3;
/** Cap baked cloth vertices; the factor is lowered until the dense grid fits. */
export const FABRIC_CLOTH_BAKE_MAX_VERTICES = 65536;

