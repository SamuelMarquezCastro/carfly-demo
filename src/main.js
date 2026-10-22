import * as THREE from 'three';
import './style.css';
import 'cesium/Build/Cesium/Widgets/widgets.css';
import { createCar, createCity } from './scene.js';
import { createFlight, stepFlight } from './flight.js';
import { locateCity, loadRealCity } from './maps.js';

const $ = id => document.getElementById(id);
const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY?.trim();
let state = createFlight(), active = false, realCity = null, loading = false, generation = 0;
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
renderer.toneMappingExposure = 1.15;
renderer.domElement.id = 'three-canvas';
$('world').append(renderer.domElement);
scene.add(new THREE.HemisphereLight(0xe1f0ff, 0x8b8272, 2.6));
const sun = new THREE.DirectionalLight(0xffedce, 3.2);sun.position.set(-200,400,150);scene.add(sun);
const city = createCity(); scene.add(city);
const car = createCar();scene.add(car);
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
  // A teleport/reset should not leave the chase camera kilometres from the car.
  camera.position.set(state.x,state.y+7,state.z+15);
  lookCurrent.set(state.x,state.y+0.7,state.z);
}
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

const controlKeys = ['KeyW','KeyS','KeyA','KeyD','Space','ShiftLeft','ShiftRight'];
addEventListener('keydown', event => {
  if(!active || /INPUT|BUTTON/.test(document.activeElement.tagName) && event.code==='Space') return;
  if(controlKeys.includes(event.code)) {event.preventDefault();keys.add(event.code);}
  if(event.code==='KeyR') reset();
});
addEventListener('keyup',event=>keys.delete(event.code));
addEventListener('blur',()=>{keys.clear();pointer=null;});
document.addEventListener('visibilitychange',()=>keys.clear());
renderer.domElement.addEventListener('pointerdown',event=>{if(active){pointer={x:event.clientX,y:event.clientY};renderer.domElement.setPointerCapture(event.pointerId);}});
renderer.domElement.addEventListener('pointermove',event=>{if(!pointer)return;orbit-=(event.clientX-pointer.x)*0.005;elevation=THREE.MathUtils.clamp(elevation+(event.clientY-pointer.y)*0.004,-0.08,1.05);pointer={x:event.clientX,y:event.clientY};});
for(const type of ['pointerup','pointercancel','lostpointercapture']) renderer.domElement.addEventListener(type,()=>pointer=null);
for(const button of document.querySelectorAll('[data-key]')) {
  button.addEventListener('pointerdown',e=>{e.preventDefault();keys.add(button.dataset.key);button.setPointerCapture(e.pointerId);});
  for(const type of ['pointerup','pointercancel','lostpointercapture']) button.addEventListener(type,()=>keys.delete(button.dataset.key));
}
addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);});
function frame(now) {
  requestAnimationFrame(frame);
  const dt=Math.min((now-lastTime)/1000,0.05);lastTime=now;elapsed+=dt;
  if(active) stepFlight(state,keys,dt);
  car.position.set(state.x,state.y+Math.sin(elapsed*1.9)*0.16,state.z);
  car.rotation.set(-state.vertical*0.003,state.yaw,state.bank,'YXZ');
  const angle=state.yaw+orbit;
  const distance=active?16:26;
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
  $('altitude').textContent=Math.round(state.y);
  const heading=((THREE.MathUtils.radToDeg(-state.yaw)%360)+360)%360;
  $('heading').textContent=String(Math.round(heading)%360).padStart(3,'0')+'°';
  $('heading-needle').style.transform=`rotate(${-heading}deg)`;
}
requestAnimationFrame(frame);
