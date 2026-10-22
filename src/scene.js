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
  // Sloped windshield and fastback roof: six defined surfaces, rather than a bubble.
  const cabinGeometry = new THREE.BufferGeometry();
  const vertices = [-.94,.06,-1.55, .94,.06,-1.55, .96,.06,1.45, -.96,.06,1.45,
    -.69,.78,-.62, .69,.78,-.62, .71,.7,.74, -.71,.7,.74];
  cabinGeometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));
  cabinGeometry.setIndex([0,4,5,0,5,1, 1,5,6,1,6,2, 2,6,7,2,7,3, 3,7,4,3,4,0, 4,7,6,4,6,5]);
  cabinGeometry.computeVertexNormals();
  part(cabinGeometry, glass, 0,0,0);
  part(new THREE.BoxGeometry(1.45,.06,1.25), dark,0,.76,.07);
  for(const x of [-.81,.81]) {
    const pillar = part(new THREE.BoxGeometry(.055,.8,.055), silver,x,.4,-1.06);
    pillar.rotation.x=.86;
    part(new THREE.BoxGeometry(.04,.07,2.5),silver,x,.1,.03);
    part(new THREE.BoxGeometry(.13,.06,.35),dark,x*1.35,.2,-.6);
  }
  part(new THREE.BoxGeometry(1.6,.04,.45),silver,0,.08,1.8);
  part(new THREE.BoxGeometry(1.7,.06,.14),dark,0,.14,2.05);
  part(new THREE.BoxGeometry(1.6, 0.07, 0.07), blue, 0, -0.12, -2.67);
  part(new THREE.BoxGeometry(1.9, 0.07, 0.07), red, 0, -0.12, 2.33);
  const thrusters=[];
  for (const x of [-1.08, 1.08]) for (const z of [-1.4, 1.35]) {
    const pod = part(new THREE.CylinderGeometry(0.43, 0.36, 0.25, 20), dark, x, -0.4, z);
    pod.rotation.z = 0.12 * Math.sign(x);
    part(new THREE.TorusGeometry(0.3, 0.045, 6, 24), blue, x, -0.55, z).rotation.x = Math.PI / 2;
    const exhaust = part(new THREE.ConeGeometry(.23,1.2,12,1,true),new THREE.MeshBasicMaterial({color:0x8cdfff,transparent:true,opacity:.3,depthWrite:false}),x,-1.1,z);
    exhaust.rotation.z=Math.PI;
    thrusters.push(exhaust);
  }
  part(new THREE.BoxGeometry(1.6, 0.04, 3.2), blue, 0, -0.56, 0);
  car.userData.thrusters=thrusters;
  return car;
}

export function createCity() {
  const city = new THREE.Group();
  let seed = 46;
  const random = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
  const materials = new Map();
  const material = color => {
    if(!materials.has(color)) materials.set(color,new THREE.MeshStandardMaterial({ color, roughness: 0.9 }));
    return materials.get(color);
  };
  const ground = material(0xa6ae93), road = material(0x616c70), roof = material(0x7e5140), water = new THREE.MeshStandardMaterial({color:0x427d89, metalness:0.3, roughness:0.3});
  const walls = [0xb17b62,0xc6aa8c,0x966b59,0xd4ccba,0xa77965,0xc0a48a].map(material);
  const windowMat = material(0x485b60);
  const boxGeometry=new THREE.BoxGeometry(1,1,1), batches=new Map();
  function box(w,h,d,x,y,z,mat) {
    if(!batches.has(mat))batches.set(mat,[]);
    const matrix=new THREE.Matrix4().compose(new THREE.Vector3(x,y,z),new THREE.Quaternion(),new THREE.Vector3(w,h,d));
    batches.get(mat).push(matrix);
  }
  box(3600,2,3600,0,-2,0,ground);
  box(100,0.4,3600,180,0,0,water);
  for(let n=-9;n<=9;n++) {
    box(17,0.4,3000,n*120,0,0,road);
    box(1625,0.4,17,-687.5,0,n*120,road);
    box(1265,0.4,17,867.5,0,n*120,road);
    if(n%2===0) {
      box(135,3,16,180,3,n*120,material(0xbcb8a6));
      for(const side of [-1,1])box(135,1,1,180,5,n*120+side*7,material(0x8f9189));
    }
  }
  // Quays, a pedestrian square and a continuous river through the town.
  for(const x of [125,235])box(9,.8,2400,x,.2,0,material(0xc3bba8));
  box(160,.8,155,-20,.2,-5,material(0xc8bda8));
  const roofGeometry=new THREE.BufferGeometry();
  roofGeometry.setAttribute('position',new THREE.Float32BufferAttribute([
    -.5,0,.5,.5,0,.5,0,1,.5, -.5,0,-.5,0,1,-.5,.5,0,-.5,
    -.5,0,-.5,-.5,0,.5,0,1,.5, -.5,0,-.5,0,1,.5,0,1,-.5,
    .5,0,.5,.5,0,-.5,0,1,-.5, .5,0,.5,0,1,-.5,0,1,.5,
  ],3));roofGeometry.computeVertexNormals();
  const roofs=[];
  const windows=[];
  for(let ix=-17;ix<=17;ix++) for(let iz=-17;iz<=17;iz++) {
    const x=ix*56+28, z=iz*56+28;
    const streetDistance = v => Math.abs(v-Math.round(v/120)*120);
    if(Math.abs(x-180)<72 || streetDistance(x)<27 || streetDistance(z)<27 || (Math.abs(x)<90&&Math.abs(z)<85)) continue;
    const w=19+random()*14,d=20+random()*14,h=13+random()*19;
    box(w,h,d,x,h/2,z,walls[Math.floor(random()*walls.length)]);
    roofs.push(new THREE.Matrix4().compose(new THREE.Vector3(x,h,z),new THREE.Quaternion(),new THREE.Vector3(w+1,6+random()*4,d+1)));
    box(2.2,6,2.2,x+w*.24,h+6,z,material(0x8b6c59));
    box(w+2,.7,d+2,x,.5,z,material(0xc5bdac));
    for(let floor=5;floor<h-1;floor+=5) for(let col=-w/2+4;col<w/2-2;col+=5) {
      windows.push([x+col,floor,z+d/2+0.05]);
      windows.push([x+col,floor,z-d/2-0.05]);
    }
  }
  const roofInstances=new THREE.InstancedMesh(roofGeometry,roof,roofs.length);
  roofs.forEach((m,i)=>roofInstances.setMatrixAt(i,m));city.add(roofInstances);
  const instance = new THREE.InstancedMesh(new THREE.BoxGeometry(1.7,2.5,0.12),windowMat,windows.length);
  const matrix=new THREE.Matrix4();windows.forEach((p,i)=>{matrix.makeTranslation(...p);instance.setMatrixAt(i,matrix);});city.add(instance);
  // An abstract historic bell tower; deliberately not a claim of geographic accuracy.
  box(23,76,23,-65,38,-140,walls[3]);box(27,4,27,-65,77,-140,walls[1]);box(19,14,19,-65,86,-140,walls[3]);
  for(const x of [-72,-58]) box(3,8,0.3,x,85,-128.3,windowMat);
  // Clock faces on the fictional belfry.
  const face=new THREE.Mesh(new THREE.CircleGeometry(4,24),material(0xe7debf));face.position.set(-65,66,-128.3);city.add(face);
  box(.45,4,.25,-65,67,-128,windowMat);box(3,.45,.25,-63.7,66,-128,windowMat);
  const trees = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(5,1), material(0x647d61),180);
  for(let i=0;i<180;i++){
    let x=(random()-.5)*1800,z=(random()-.5)*1800;
    if(i<80){x=i%2?112:248;z=Math.floor(i/2)*44-860;}
    if(Math.abs(x-180)<65)x=255;
    matrix.makeTranslation(x,5,z);trees.setMatrixAt(i,matrix);
  }city.add(trees);
  for(const [mat,transforms] of batches) {
    const mesh=new THREE.InstancedMesh(boxGeometry,mat,transforms.length);
    transforms.forEach((m,i)=>mesh.setMatrixAt(i,m));city.add(mesh);
  }
  return city;
}
