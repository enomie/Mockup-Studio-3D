/** Dynamic Rapier systems driven by world physics Start / Reset / tick. */
export interface WorldPhysicsDynamicParticipant {
  spawnSessionDynamics(): void;
  clearSessionDynamics(): void;
  setAllSleeping(sleeping: boolean): void;
  syncEntityTransformsFromPhysics(): void;
}
