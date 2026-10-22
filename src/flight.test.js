import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createFlight, stepFlight, MIN_ALTITUDE, MAX_ALTITUDE } from './flight.js';
import { crossesCheckpoint } from './challenge.js';
test('forward accelerates, turns bank, release damps', () => {
  const s=createFlight();
  for(let i=0;i<120;i++) stepFlight(s,new Set(['KeyW','KeyA']),1/60);
  assert.ok(s.speed>40 && s.yaw>1 && s.bank<0 && s.x<0);
  for(let i=0;i<600;i++) stepFlight(s,new Set(),1/60);
  assert.ok(Math.abs(s.speed)<0.01 && Math.abs(s.bank)<0.001);
});
test('altitude is constrained and reset restores state', () => {
  const s=createFlight();
  for(let i=0;i<600;i++) stepFlight(s,new Set(['ShiftLeft']),1/60);
  assert.equal(s.y,MIN_ALTITUDE);
  for(let i=0;i<3600;i++) stepFlight(s,new Set(['Space']),1/60);
  assert.equal(s.y,MAX_ALTITUDE);
  assert.deepEqual(createFlight(),{x:0,y:155,z:0,yaw:0,speed:0,vertical:0,bank:0});
});
test('flight distance is stable across frame rates',()=>{
  const a=createFlight(),b=createFlight();
  for(let i=0;i<600;i++)stepFlight(a,new Set(['KeyW']),1/60);
  for(let i=0;i<1200;i++)stepFlight(b,new Set(['KeyW']),1/120);
  assert.ok(Math.abs(a.z-b.z)<0.3);
});
test('boost accelerates faster than cruise, brake slows down and reverse is limited',()=>{
  const s=createFlight();
  for(let i=0;i<180;i++)stepFlight(s,new Set(['KeyW','KeyE']),1/60);
  assert.ok(s.speed>65);
  for(let i=0;i<60;i++)stepFlight(s,new Set(['KeyW','KeyX']),1/60);
  assert.ok(s.speed<1);
  for(let i=0;i<300;i++)stepFlight(s,new Set(['KeyS','KeyE']),1/60);
  assert.ok(s.speed>=-18 && s.speed<-17);
});
test('checkpoints detect a fast crossing but reject a flyby above the ring',()=>{
  const point={x:0,y:155,z:-220};
  assert.equal(crossesCheckpoint({x:0,y:155,z:-170},{x:0,y:155,z:-270},point),true);
  assert.equal(crossesCheckpoint({x:0,y:200,z:-170},{x:0,y:200,z:-270},point),false);
});
