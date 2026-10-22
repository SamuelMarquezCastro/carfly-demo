export const MIN_ALTITUDE = 120;
export const MAX_ALTITUDE = 900;
export function createFlight() {
  return { x: 0, y: 155, z: 0, yaw: 0, speed: 0, vertical: 0, bank: 0 };
}
export function stepFlight(state, keys, dt) {
  dt = Math.min(dt, 0.05);
  const forward = Number(keys.has('KeyW')) - Number(keys.has('KeyS'));
  const turn = Number(keys.has('KeyA')) - Number(keys.has('KeyD'));
  const climb = Number(keys.has('Space')) - Number(keys.has('ShiftLeft') || keys.has('ShiftRight'));
  state.speed += ((forward * 46) - state.speed) * (1 - Math.exp(-dt * 1.4));
  state.vertical += (climb * 20 - state.vertical) * (1 - Math.exp(-dt * 3));
  state.yaw += turn * dt * 0.7;
  state.bank += (-turn * 0.18 - state.bank) * (1 - Math.exp(-dt * 5));
  state.x -= Math.sin(state.yaw) * state.speed * dt;
  state.z -= Math.cos(state.yaw) * state.speed * dt;
  state.y = Math.max(MIN_ALTITUDE, Math.min(MAX_ALTITUDE, state.y + state.vertical * dt));
  if (state.y === MIN_ALTITUDE || state.y === MAX_ALTITUDE) state.vertical = 0;
  return state;
}
