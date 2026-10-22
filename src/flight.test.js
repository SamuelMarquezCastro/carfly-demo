import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createFlight, stepFlight, MIN_ALTITUDE, MAX_ALTITUDE } from './flight.js';
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
