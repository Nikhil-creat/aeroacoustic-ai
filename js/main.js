import {DigitalTwin} from './twin.js';
import {Safety} from './safety.js';
import {Rig} from './audio.js';
import {OPAV} from './opav.js';
import {CFD} from './cfd.js';
import {ahi,makePassport,download} from './passport.js';
const $=id=>document.getElementById(id);
const twin=new DigitalTwin('phone'),safety=new Safety(twin),rig=new Rig(),cfd=new CFD($('cfd'));
const sim={blockage:.85,scenario:'water',freq:0,amp:0};let last={blk:.85,debris:'water'},agent=null,running=false,t=0;
const zc=$('zc').getContext('2d');const zs=[];
const ui={
 log:m=>{const l=$('log');l.textContent+=new Date().toLocaleTimeString()+'  '+m+'\n';l.scrollTop=l.scrollHeight},
 phase:p=>$('phase').textContent=p,
 tick:(f,fac)=>{$('freq').textContent=f?(f|0)+' Hz':'— Hz';
  $('thBar').style.width=Math.min(100,safety.tempN*100)+'%';$('th').textContent=`${safety.T.toFixed(0)}°C est · ${safety.state}`;
  $('exBar').style.width=Math.min(100,safety.xN*100)+'%';$('ex').textContent=`${(safety.x*1000).toFixed(2)} mm / ${(twin.s.xmax*1000).toFixed(2)} mm`;
  zs.push(twin.gain(f||200)*(1-last.blk*.5));if(zs.length>60)zs.shift();drawZ()},
 observe:o=>{last=o;$('blkBar').style.width=o.blk*100+'%';$('blk').textContent=(o.blk*100|0)+'% obstructed';$('debris').textContent=`Debris: ${o.debris} (${o.conf*100|0}%)`;
  const s=Math.max(0,1-Math.abs(o.seal)/2);$('seal').textContent=(s*100|0)+'%';$('sealNote').textContent=$('mode').value==='sim'?'simulated pressure Δ':'barometer not exposed to web';
  cfd.sync(o.blk);setAHI(o.blk)},
 done:o=>setAHI(o.blk)};
function metrics(b){return{thd:1.2+b*9,lin:1-b*.6,spl:1-b*.5}}
function setAHI(b){const v=ahi(metrics(b));$('ahi').textContent=v;$('ahiArc').style.strokeDashoffset=264*(1-v/100)}
function drawZ(){zc.clearRect(0,0,300,80);zc.strokeStyle='#00e5ff';zc.beginPath();zs.forEach((v,i)=>{const x=i*5,y=76-Math.min(72,v*18);i?zc.lineTo(x,y):zc.moveTo(x,y)});zc.stroke()}
function frame(){const dt=.016;t+=dt;if(cfd.p)cfd.step(dt,t,twin,sim.freq||100,sim.amp,last.blk);cfd.draw(sim.freq,sim.amp,t);requestAnimationFrame(frame)}
function reseed(){sim.scenario=$('scenario').value;sim.blockage=.85;last={blk:.85,debris:sim.scenario,conf:0};cfd.seed(sim.scenario==='metal'?'metal':sim.scenario,.85);ui.observe({blk:.85,debris:sim.scenario,conf:.5,seal:0})}
$('scenario').onchange=reseed;$('profile').onchange=e=>{twin.set(e.target.value);safety.reset();ui.log('Twin profile → '+e.target.value+' · Helmholtz f ≈ '+twin.helmholtz().toFixed(0)+' Hz')};
$('start').onclick=async()=>{if(running)return;running=true;const mode=$('mode').value;
 try{if(mode==='live'){await rig.init(true);if(!rig.base){ui.log('Calibrating loopback baseline (clean speaker assumed)…');await rig.calibrate();ui.log('Baseline set.')}}}
 catch(e){ui.log('✖ '+e.message);running=false;return}
 agent=new OPAV({twin,safety,rig,ui,sim,mode});await agent.run();running=false};
$('stop').onclick=()=>{agent&&(agent.abort=true);rig.stop&&rig.ctx&&rig.stop()};
$('cal').onclick=async()=>{try{await rig.init(true);ui.log('Calibrating… place device in a quiet room.');await rig.calibrate();ui.log('Baseline stored (RAM only).')}catch(e){ui.log('✖ '+e.message)}};
$('pass').onclick=async()=>{const m=metrics(last.blk),p=await makePassport({ahi:ahi(m),thdn_pct:+m.thd.toFixed(2),linearity:+m.lin.toFixed(2),spl_ratio:+m.spl.toFixed(2),seal_score:$('seal').textContent,mode:$('mode').value,profile:$('profile').value});download(p);ui.log('Signed passport exported (metrics only).')};
if('serviceWorker' in navigator)navigator.serviceWorker.register('sw.js').catch(()=>{});
reseed();ui.log('AeroAcoustic AI ready · Twin Helmholtz ≈ '+twin.helmholtz().toFixed(0)+' Hz · by NIKHIL CHARY SRIRAMOJU');frame();
