/** Cloth half-thickness (m) used for contact clearance (rendered mesh is a single plane). */
export const SHELL_HALF_THICKNESS = 0.0006;

/** Contact distance from the cloth centerline to collider surfaces. */
export const CONTACT_D_HAT = 2 * SHELL_HALF_THICKNESS + 0.004;

/** Conservative bound scale on clearance (OGC Eq. 27 style, α < 0.5). */
export const CONTACT_BOUND_ALPHA = 0.35;

/** Inertial slack added to per-vertex displacement bound. */
export const CONTACT_BOUND_BETA = 1.0;

/** Extra SDF-only projection passes after constraint iterations per substep. */
export const CONTACT_EXTRA_PROJECTION_PASSES = 2;
