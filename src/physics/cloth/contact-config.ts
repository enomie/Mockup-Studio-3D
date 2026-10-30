/** Cloth half-thickness (m) used for contact clearance (rendered mesh is a single plane). */
export const SHELL_HALF_THICKNESS = 0.0006;

/** Contact distance from the cloth centerline to collider surfaces. */
export const CONTACT_D_HAT = 2 * SHELL_HALF_THICKNESS + 0.004;

/** Vertices within this distance (m) of the contact surface count as touching it (friction). */
export const CONTACT_SLOP = 0.001;
