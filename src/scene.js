import * as THREE from 'three';

export function createCar() {
  const car = new THREE.Group();
  const silver = new THREE.MeshStandardMaterial({ color: 0xcbd3d6, metalness: 0.78, roughness: 0.26 });
  const glass = new THREE.MeshStandardMaterial({ color: 0x203745, metalness: 0.6, roughness: 0.14 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x20272b, metalness: 0.65, roughness: 0.4 });
  const blue = new THREE.MeshBasicMaterial({ color: 0x87e5ff });
  const red = new THREE.MeshBasicMaterial({ color: 0xff554c });
  function part(geo, mat, x, y, z) { const mesh = new THREE.Mesh(geo, mat); mesh.position.set(x, y, z); car.add(mesh); return mesh; }
  // The nose faces local -Z; a beveled, tapered silhouette rather than a box.
  const outline = new THREE.Shape();
  outline.moveTo(-1.03, 2.15); outline.lineTo(-1.12, -1.3); outline.lineTo(-0.8, -2.5);
  outline.lineTo(0.8, -2.5); outline.lineTo(1.12, -1.3); outline.lineTo(1.03, 2.15); outline.closePath();
  const body = part(new THREE.ExtrudeGeometry(outline, { depth: 0.42, bevelEnabled: true, bevelSegments: 2, steps: 1, bevelSize: 0.16, bevelThickness: 0.12 }), silver, 0, 0, 0);
  body.rotation.x = Math.PI / 2;
  const cabin = part(new THREE.SphereGeometry(1, 8, 6), glass, 0, 0.35, 0.1); cabin.scale.set(0.9, 0.67, 1.5);
  part(new THREE.BoxGeometry(0.07, 0.08, 2.1), silver, 0, 0.95, 0.1);
  part(new THREE.BoxGeometry(1.6, 0.07, 0.07), blue, 0, -0.12, -2.67);
  part(new THREE.BoxGeometry(1.9, 0.07, 0.07), red, 0, -0.12, 2.33);
  for (const x of [-1.08, 1.08]) for (const z of [-1.4, 1.35]) {
    const pod = part(new THREE.CylinderGeometry(0.43, 0.36, 0.25, 20), dark, x, -0.4, z);
    pod.rotation.z = 0.12 * Math.sign(x);
    part(new THREE.TorusGeometry(0.3, 0.045, 6, 24), blue, x, -0.55, z).rotation.x = Math.PI / 2;
  }
  part(new THREE.BoxGeometry(1.6, 0.04, 3.2), blue, 0, -0.56, 0);
  return car;
}

export function createCity() {
  const city = new THREE.Group();
  let seed = 46;
  const random = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
  const material = color => new THREE.MeshStandardMaterial({ color, roughness: 0.95 });
  const ground = material(0xb1b4a3), road = material(0x727a7c), roof = material(0x685b52), water = new THREE.MeshStandardMaterial({color:0x6d999d, metalness:0.45, roughness:0.24});
  const walls = [0xba9f87,0xc9b7a1,0x9d8474,0xd1c8b7,0xad9180,0xc2aa96].map(material);
  const windowMat = material(0x485b60);
  function box(w,h,d,x,y,z,mat) { const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat);m.position.set(x,y,z);city.add(m);return m; }
  box(3600,2,3600,0,-2,0,ground);
  box(100,0.4,3600,180,0,0,water);
  for(let n=-6;n<=6;n++) {
    box(17,0.4,3000,n*120,0,0,road);
    box(3000,0.4,17,0,0,n*120,road);
    if(n%2===0) box(135,3,16,180,3,n*120,material(0xbcb8a6));
  }
  const windows=[];
  for(let ix=-11;ix<=11;ix++) for(let iz=-11;iz<=11;iz++) {
    const x=ix*56+28, z=iz*56+28;
    if(Math.abs(x-180)<72 || Math.abs(x%120)<20 || Math.abs(z%120)<20 || (Math.abs(x)<90&&Math.abs(z)<85)) continue;
    const w=18+random()*17,d=20+random()*17,h=12+random()*22;
    box(w,h,d,x,h/2,z,walls[Math.floor(random()*walls.length)]);
    const r=new THREE.Mesh(new THREE.CylinderGeometry(0,1,1,4),roof);
    r.rotation.y=Math.PI/4;r.scale.set(w/Math.SQRT2+1,6,d/Math.SQRT2+1);r.position.set(x,h+3,z);city.add(r);
    for(let floor=5;floor<h-1;floor+=5) for(let col=-w/2+4;col<w/2-2;col+=5) {
      windows.push([x+col,floor,z+d/2+0.05]);
      windows.push([x+col,floor,z-d/2-0.05]);
    }
  }
  const instance = new THREE.InstancedMesh(new THREE.BoxGeometry(1.7,2.5,0.12),windowMat,windows.length);
  const matrix=new THREE.Matrix4();windows.forEach((p,i)=>{matrix.makeTranslation(...p);instance.setMatrixAt(i,matrix);});city.add(instance);
  // An abstract historic bell tower; deliberately not a claim of geographic accuracy.
  box(23,76,23,-65,38,-140,walls[3]);box(27,4,27,-65,77,-140,walls[1]);box(19,14,19,-65,86,-140,walls[3]);
  for(const x of [-72,-58]) box(3,8,0.3,x,85,-128.3,windowMat);
  const trees = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(5,1), material(0x647d61),180);
  for(let i=0;i<180;i++){const x=(random()-.5)*1500,z=(random()-.5)*1500;matrix.makeTranslation(x,5,z);if(Math.abs(x-180)<65) matrix.makeTranslation(255,5,z);trees.setMatrixAt(i,matrix);}city.add(trees);
  return city;
}
