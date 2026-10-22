// Fictional route, only shown over the explicitly labelled concept city.
export const ROUTE = [
  { x: 0, y: 155, z: -220 }, { x: -220, y: 175, z: -420 },
  { x: -430, y: 155, z: -160 }, { x: -250, y: 140, z: 180 },
  { x: 150, y: 170, z: 300 }, { x: 370, y: 190, z: 30 },
  { x: 180, y: 160, z: -220 },
];
export function crossesCheckpoint(from, to, point, radius = 20) {
  const dx=to.x-from.x,dy=to.y-from.y,dz=to.z-from.z;
  const lengthSquared=dx*dx+dy*dy+dz*dz;
  const t=lengthSquared ? Math.max(0,Math.min(1,((point.x-from.x)*dx+(point.y-from.y)*dy+(point.z-from.z)*dz)/lengthSquared)) : 0;
  return Math.hypot(from.x+dx*t-point.x,from.y+dy*t-point.y,from.z+dz*t-point.z) < radius;
}
