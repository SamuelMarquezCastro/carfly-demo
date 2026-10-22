import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import './style.css';
import 'cesium/Build/Cesium/Widgets/widgets.css';
import { createCar, createCity } from './scene.js';
import { createFlight, stepFlight } from './flight.js';
import { locateCity, loadRealCity } from './maps.js';
import { ROUTE, crossesCheckpoint } from './challenge.js';

const $ = id => document.getElementById(id);
const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY?.trim();
let state = createFlight(), active = false, realCity = null, loading = false, generation = 0;
let paused=false, checkpoint=0, routeTime=0, routeStarted=false, toastUntil=0;
const keys = new Set();
let orbit = 0, elevation = 0.3, pointer = null, elapsed = 0, lastTime = performance.now();
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xb5cbd5);
scene.fog = new THREE.Fog(0xb5cbd5, 450, 2000);
const camera = new THREE.PerspectiveCamera(55, innerWidth / innerHeight, 1, 10000000);
camera.userData.direction = new THREE.Vector3(); camera.userData.up = new THREE.Vector3();
const renderer = (() => {
  try { return new THREE.WebGLRenderer({ antialias: true, alpha: true }); }
  catch { $('fatal').hidden = false; $('fatal').textContent = 'WebGL is niet beschikbaar. Open deze demo in een browser met hardwareversnelling.'; throw new Error('WebGL unavailable'); }
})();
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
renderer.setSize(innerWidth, innerHeight);
renderer.setClearColor(0xb5cbd5, 1);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.95;
renderer.domElement.id = 'three-canvas';
$('world').append(renderer.domElement);
const environment = new RoomEnvironment();
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(environment,0.04).texture;
scene.environmentIntensity = 0.35;
environment.dispose();pmrem.dispose();
scene.add(new THREE.HemisphereLight(0xe1f0ff, 0x8b8272, 1.8));
const sun = new THREE.DirectionalLight(0xffedce, 2.4);sun.position.set(-200,400,150);scene.add(sun);
const city = createCity(); scene.add(city);
const car = createCar();scene.add(car);
const routeGroup=new THREE.Group();scene.add(routeGroup);
const ringGeometry=new THREE.TorusGeometry(22,.65,8,64);
const rings=ROUTE.map((point,index)=>{
  const material=new THREE.MeshBasicMaterial({color:0x91e0ff,transparent:true,opacity:1});
  const ring=new THREE.Mesh(ringGeometry,material);
  ring.position.set(point.x,point.y,point.z);
  const previous=index ? ROUTE[index-1] : {x:0,y:155,z:0};
  ring.lookAt(new THREE.Vector3(point.x*2-previous.x,point.y,point.z*2-previous.z));
  routeGroup.add(ring);
  const marker=new THREE.Mesh(new THREE.OctahedronGeometry(2),new THREE.MeshBasicMaterial({color:0xc3f1ff}));
  marker.position.set(point.x,point.y+29,point.z);routeGroup.add(marker);
  ring.userData.marker=marker;
  return ring;
});
const targetPosition = new THREE.Vector3(), lookTarget = new THREE.Vector3(), lookCurrent = new THREE.Vector3();
const offset = new THREE.Vector3();
camera.position.set(15,162,22);lookCurrent.set(0,155,0);
$('welcome-note').textContent = apiKey ? 'Google 3D wordt geladen na het starten. Beschikbaarheid verschilt per regio.' : 'Demo-modus · conceptstad, geen echte kaartdata. Geen API-sleutel nodig.';

function status(message) { $('status').textContent = message; }
function fallback(message = '') {
  realCity?.destroy(); realCity = null; city.visible = true;
  scene.background = new THREE.Color(0xb5cbd5);scene.fog = new THREE.Fog(0xb5cbd5,450,2000);
  renderer.setClearColor(0xb5cbd5,1);
  $('mode-label').textContent = 'CONCEPTSTAD · GEEN ECHTE KAARTDATA';
  $('demo-mode').hidden = true;
  $('scene-caption').innerHTML = 'CONCEPT CITY <span>·</span> GEEN ECHTE KAARTDATA';
  status(message);
}
function reset() {
  state = createFlight(); orbit = 0;elevation = 0.3;keys.clear();
  checkpoint=0;routeTime=0;routeStarted=false;toastUntil=0;setPaused(false);
  $('checkpoint-toast').textContent='';
  // A teleport/reset should not leave the chase camera kilometres from the car.
  camera.position.set(state.x,state.y+7,state.z+15);
  lookCurrent.set(state.x,state.y+0.7,state.z);
}
function setPaused(value) {
  paused=value;keys.clear();pointer=null;
  $('pause-overlay').hidden=!paused;
  $('pause').setAttribute('aria-pressed',String(paused));
  $('pause').innerHTML=paused?'Verder <kbd>P</kbd>':'Pauze <kbd>P</kbd>';
}
$('pause').addEventListener('click',()=>setPaused(!paused));
$('resume').addEventListener('click',()=>setPaused(false));
$('reset').addEventListener('click', reset);
$('demo-mode').addEventListener('click',()=>{generation++;fallback('Conceptstad actief · geen echte kaartdata.');});
$('change-city').addEventListener('click', () => {
  generation++; realCity?.destroy(); realCity=null; loading=false;
  active=false; reset(); fallback(); $('welcome').hidden=false;$('hud').hidden=true;
  $('start').disabled=false; $('start').innerHTML='Start vlucht <span>↗</span>'; $('city').focus();
});
$('flight-form').addEventListener('submit', async event => {
  event.preventDefault(); if(loading) return;
  const request = ++generation;loading=true;$('start').disabled=true;$('start').textContent='Vlucht voorbereiden…';status('Locatie zoeken…');
  try {
    const location = await Promise.race([locateCity($('city').value),new Promise((_,reject)=>setTimeout(()=>reject(new Error('Locatie zoeken duurt te lang. Probeer opnieuw.')),15000))]);
    if(request!==generation) return;
    reset();active=true;$('welcome').hidden=true;$('hud').hidden=false;
    $('city-name').textContent=location.name;
    fallback(apiKey ? 'Google Photorealistic 3D laden… Je kunt alvast vliegen in de conceptstad.' : 'Demo-modus: dit is een fictieve conceptstad, geen echte weergave van '+location.name+'.');
    if(apiKey) {
      const pending = await loadRealCity($('cesium'),location,apiKey,message=>{
        if(request===generation) {generation++;fallback(message+' Conceptstad actief.');}
      },()=> { if(request===generation) status('Google-tiles ontvangen. Detail en 3D-dekking verschillen per locatie.'); });
      if(request!==generation) {pending?.destroy();return;}
      realCity=pending;city.visible=false;scene.background=null;scene.fog=null;renderer.setClearColor(0x000000,0);
      $('mode-label').textContent='GOOGLE PHOTOREALISTIC 3D TILES';
      $('demo-mode').hidden=false;
      $('scene-caption').textContent='GOOGLE 3D · GEEN GEBOUWCOLLISIES';
      // Make it possible to leave sparse / flat coverage without claiming it is a city mesh.
      status('Google 3D streamt… Geen bruikbare dekking?');
      const button=document.createElement('button');button.textContent='Gebruik conceptstad';button.onclick=()=>{generation++;fallback('Conceptstad actief · geen echte kaartdata.');};$('status').append(button);
    }
  } catch(error) { if(request===generation) {if(active) fallback(error.message+' Conceptstad actief.');else status(error.message);} }
  finally {loading=false;$('start').disabled=false;$('start').innerHTML='Start vlucht <span>↗</span>';}
});

const controlKeys = ['KeyW','KeyS','KeyA','KeyD','Space','ShiftLeft','ShiftRight','KeyE','KeyX'];
addEventListener('keydown', event => {
  if(!active || /INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)) return;
  if(event.code==='KeyP' && !event.repeat) {event.preventDefault();setPaused(!paused);return;}
  if(event.code==='KeyR' && !event.repeat) {reset();return;}
  if(event.code==='KeyC') {orbit=0;elevation=.3;return;}
  if(paused) return;
  if(event.code==='Space' && document.activeElement.tagName==='BUTTON')document.activeElement.blur();
  if(controlKeys.includes(event.code)) {event.preventDefault();keys.add(event.code);}
});
addEventListener('keyup',event=>keys.delete(event.code));
addEventListener('blur',()=>{keys.clear();pointer=null;if(active)setPaused(true);});
document.addEventListener('visibilitychange',()=>{if(document.hidden && active)setPaused(true);});
renderer.domElement.addEventListener('pointerdown',event=>{if(active && !paused){document.activeElement.blur();pointer={x:event.clientX,y:event.clientY};renderer.domElement.setPointerCapture(event.pointerId);}});
renderer.domElement.addEventListener('pointermove',event=>{if(!pointer)return;orbit-=(event.clientX-pointer.x)*0.005;elevation=THREE.MathUtils.clamp(elevation+(event.clientY-pointer.y)*0.004,-0.08,1.05);pointer={x:event.clientX,y:event.clientY};});
for(const type of ['pointerup','pointercancel','lostpointercapture']) renderer.domElement.addEventListener(type,()=>pointer=null);
for(const button of document.querySelectorAll('[data-key]')) {
  button.addEventListener('pointerdown',e=>{e.preventDefault();if(paused)return;keys.add(button.dataset.key);button.setPointerCapture(e.pointerId);});
  for(const type of ['pointerup','pointercancel','lostpointercapture']) button.addEventListener(type,()=>keys.delete(button.dataset.key));
}
addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);});
function frame(now) {
  requestAnimationFrame(frame);
  const dt=Math.min((now-lastTime)/1000,0.05);lastTime=now;if(!paused)elapsed+=dt;
  if(active && !paused) {
    const previous={x:state.x,y:state.y,z:state.z};
    stepFlight(state,keys,dt);
    if(!realCity && checkpoint<ROUTE.length) {
      if(Math.abs(state.speed)>.5 || Math.abs(state.vertical)>.5)routeStarted=true;
      if(routeStarted)routeTime+=dt;
      if(crossesCheckpoint(previous,state,ROUTE[checkpoint])) {
        checkpoint++;
        $('checkpoint-toast').textContent=checkpoint===ROUTE.length?'Route voltooid! ↗ Druk op R voor een nieuwe vlucht.':`CHECKPOINT ${checkpoint} / ${ROUTE.length} ✓`;
        toastUntil=elapsed+3;
      }
    }
  }
  routeGroup.visible=active && !realCity;
  $('route').hidden=!active || !!realCity;
  rings.forEach((ring,i)=>{
    ring.visible=i>=checkpoint;
    ring.material.opacity=i===checkpoint ? .88+Math.sin(elapsed*2)*.12 : .13;
    ring.userData.marker.visible=routeGroup.visible && i===checkpoint;
    ring.userData.marker.rotation.y=elapsed;
  });
  if(elapsed>toastUntil)$('checkpoint-toast').textContent='';
  const next=ROUTE[checkpoint];
  $('route-count').textContent=`${String(Math.min(checkpoint+1,ROUTE.length)).padStart(2,'0')} / 07`;
  $('route-progress').style.width=`${checkpoint/ROUTE.length*100}%`;
  $('route-time').textContent=`${String(Math.floor(routeTime/60)).padStart(2,'0')}:${String(Math.floor(routeTime%60)).padStart(2,'0')}`;
  $('route-title').textContent=next?'Vlieg door de blauwe ring':'Tweede verdieping bereikt.';
  if(next) {
    $('route-distance').textContent=`${Math.round(Math.hypot(next.x-state.x,next.y-state.y,next.z-state.z))} m`;
    $('route-altitude').textContent=`${next.y} m hoogte`;
    const targetYaw=Math.atan2(-(next.x-state.x),-(next.z-state.z));
    const delta=Math.atan2(Math.sin(targetYaw-state.yaw),Math.cos(targetYaw-state.yaw));
    $('route-direction').textContent=Math.abs(delta)<.2?'Rechtdoor ↑':delta>0?'← Links aanhouden':'Rechts aanhouden →';
  } else {$('route-distance').textContent='7 ringen gehaald';$('route-altitude').textContent='';$('route-direction').textContent='R · opnieuw';}
  car.position.set(state.x,state.y+Math.sin(elapsed*1.9)*0.16,state.z);
  car.rotation.set(-state.vertical*0.003,state.yaw,state.bank,'YXZ');
  const boosting=keys.has('KeyE') && keys.has('KeyW') && !paused;
  for(const plume of car.userData.thrusters){plume.scale.y=(boosting?1.8:1)+Math.sin(elapsed*15)*.08;plume.material.opacity=boosting ? .65 : .25;}
  const angle=state.yaw+orbit;
  const distance=active?16+Math.abs(state.speed)*.035:26;
  offset.set(Math.sin(angle)*Math.cos(elevation)*distance,Math.sin(elevation)*distance+2,Math.cos(angle)*Math.cos(elevation)*distance);
  targetPosition.copy(car.position).add(offset);
  if(!active) targetPosition.x+=9;
  camera.position.lerp(targetPosition,1-Math.exp(-dt*5));
  lookTarget.copy(car.position);lookTarget.y+=0.7;
  if(!active) lookTarget.x-=6;
  lookCurrent.lerp(lookTarget,1-Math.exp(-dt*8));camera.lookAt(lookCurrent);camera.updateMatrixWorld();
  if(realCity) {try {realCity.render(camera);}catch {generation++;fallback('Kaartweergave onderbroken. Conceptstad actief.');}}
  renderer.render(scene,camera);
  $('speed').textContent=Math.round(Math.abs(state.speed)*3.6);
  $('speed-bar').style.width=`${Math.min(100,Math.abs(state.speed)/72*100)}%`;
  $('flight-state').textContent=paused?'PAUZE':keys.has('KeyX')?'REMMEN':boosting?'BOOST':state.y<=120?'MIN. HOOGTE':Math.abs(state.speed)<1?'HOVER':'CRUISE';
  $('altitude').textContent=Math.round(state.y);
  const heading=((THREE.MathUtils.radToDeg(-state.yaw)%360)+360)%360;
  $('heading').textContent=String(Math.round(heading)%360).padStart(3,'0')+'°';
  $('heading-needle').style.transform=`rotate(${-heading}deg)`;
}
requestAnimationFrame(frame);
