import {DigitalTwin} from './twin.js';
import {Safety} from './safety.js';
import {Rig} from './audio.js';
import {OPAV} from './opav.js';
import {CFD} from './cfd.js';
import {Spectro,simCol,liveCol} from './spectro.js';
import {ahi,makePassport,download} from './passport.js';
import {load,save,clear,forecast,sysinfo,loadProfile,saveProfile} from './store.js';
const $=id=>document.getElementById(id);
const twin=new DigitalTwin('phone'),safety=new Safety(twin),rig=new Rig(),cfd=new CFD($('cfd')),sp=new Spectro($('sp'));
const sim={blockage:.85,scenario:'water',freq:0,amp:0,harm:[1]};let last={blk:.85,debris:'water'},agent=null,running=false,t=0,fr=0,lock=null,live=false;
const zc=$('zc').getContext('2d'),zs=[];
const F=['fName','fAsset','fOwner','fNote'],S=['fIP','fEvt'];
const say=m=>{if($('voice').checked&&'speechSynthesis'in window)speechSynthesis.speak(new SpeechSynthesisUtterance(m))};
const metrics=b=>({thd:1.2+b*9,lin:1-b*.6,spl:1-b*.5});
const rec=()=>{const r={};[...F,...S].forEach(k=>r[k]=$(k).value);return r};
function setAHI(b){const v=ahi(metrics(b));$('ahi').textContent=v;$('ahiArc').style.strokeDashoffset=264*(1-v/100);return v}
function drawZ(){zc.clearRect(0,0,300,80);zc.strokeStyle='#00e5ff';zc.beginPath();zs.forEach((v,i)=>{const y=76-Math.min(72,v*18);i?zc.lineTo(i*5,y):zc.moveTo(0,y)});zc.stroke()}
function drawHist(){const h=load(),c=$('hc').getContext('2d');c.clearRect(0,0,300,70);const f=forecast(h);$('fc').textContent=`${h.length} sessions · ${f.note}`;
 c.strokeStyle='#39ff88';c.beginPath();h.slice(-30).forEach((r,i,a)=>{const x=i*(300/Math.max(1,a.length-1)),y=66-r.ahi*.62;i?c.lineTo(x,y):c.moveTo(x,y)});c.stroke()}
const ui={
 log:m=>{const l=$('log');l.textContent+=new Date().toLocaleTimeString()+'  '+m+'\n';l.scrollTop=l.scrollHeight},
 phase:p=>$('phase').textContent=p,say,
 progress:(a,g)=>{const p=Math.min(100,a/g*100);$('sBar').style.width=p+'%';$('pct').textContent=(p|0)+'%';$('tAct').textContent=a.toFixed(0)},
 tick:f=>{$('freq').textContent=f?(f|0)+' Hz':'— Hz';$('thBar').style.width=Math.min(100,safety.tempN*100)+'%';$('th').textContent=`${safety.T.toFixed(0)}°C est · ${safety.state}`;
  $('exBar').style.width=Math.min(100,safety.xN*100)+'%';$('ex').textContent=`${(safety.x*1000).toFixed(2)} / ${(twin.s.xmax*1000).toFixed(2)} mm`;
  zs.push(twin.gain(f||200)*(1-last.blk*.5));if(zs.length>60)zs.shift();drawZ()},
 observe:o=>{last=o;$('blkBar').style.width=o.blk*100+'%';$('blk').textContent=(o.blk*100|0)+'% obstructed';$('debris').textContent=`Debris: ${o.debris} (${o.conf*100|0}%)`;
  $('seal').textContent=(Math.max(0,1-Math.abs(o.seal)/2)*100|0)+'%';$('sealNote').textContent=live?'barometer not exposed to web':'simulated pressure Δ';cfd.sync(o.blk);setAHI(o.blk)},
 finish:(s,o,act)=>{const b=o.blk,m=metrics(b),v=setAHI(b);
  save({ts:Date.now(),ahi:v,status:s,active:+act.toFixed(1),mode:live?'live':'sim',profile:$('profile').value,...rec()});drawHist();
  if(s==='done'){say('Cleaning complete.');navigator.vibrate&&navigator.vibrate([80,60,80])}}};
function frame(){t+=.016;cfd.step(.016,t,twin,sim.freq||100,sim.amp,last.blk);cfd.draw(sim.freq,sim.amp,t);
 if(++fr%2===0)sp.push(live&&rig.an?liveCol(rig.an,rig.ctx.sampleRate):simCol(sim.freq,sim.amp,sim.harm));requestAnimationFrame(frame)}
function reseed(){sim.scenario=$('scenario').value;sim.blockage=.85;cfd.seed(sim.scenario,.85);ui.observe({blk:.85,debris:sim.scenario,conf:.5,seal:0})}
$('scenario').onchange=reseed;
$('sLen').oninput=e=>{$('sLbl').textContent=e.target.value+' s';$('tGoal').textContent=e.target.value};
$('profile').onchange=e=>{twin.set(e.target.value);safety.reset();ui.log('Twin → '+e.target.value+' · Helmholtz ≈ '+twin.helmholtz().toFixed(0)+' Hz')};
[...F,...S].forEach(k=>$(k).onchange=()=>saveProfile(rec()));
$('start').onclick=async()=>{if(running)return;live=$('mode').value==='live';
 const si=await sysinfo();if(live){if(si.batt!=null&&si.batt<15&&!si.charging){ui.log('✖ Battery under 15% — connect charger for live mode.');return}
  if(!confirm('Live mode plays audible sweeps and vibrates the device for '+$('sLen').value+' s. Volume low, device away from ears. Continue?'))return}
 running=true;$('sBar').style.width='0%';
 try{if(live){await rig.init(true);if(!rig.base){ui.log('Calibrating baseline (assumes clean speaker)…');await rig.calibrate();ui.log('Baseline set.')}}}catch(e){ui.log('✖ '+e.message);running=false;return}
 try{lock=await navigator.wakeLock?.request('screen')}catch(e){}
 agent=new OPAV({twin,safety,rig,ui,sim,mode:live?'live':'sim',S:+$('sLen').value,profileName:$('cprof').value});
 const st=await agent.run();try{lock&&lock.release()}catch(e){}running=false};
$('stop').onclick=()=>{agent&&(agent.abort=true);try{rig.ctx&&rig.stop()}catch(e){}};
$('cal').onclick=async()=>{try{await rig.init(true);ui.log('Calibrating… keep the room quiet.');await rig.calibrate();ui.log('Baseline stored (RAM only).')}catch(e){ui.log('✖ '+e.message)}};
$('pass').onclick=async()=>{const m=metrics(last.blk),p=await makePassport({ahi:ahi(m),thdn_pct:+m.thd.toFixed(2),linearity:+m.lin.toFixed(2),spl_ratio:+m.spl.toFixed(2),seal_score:$('seal').textContent,active_seconds:+$('tAct').textContent,mode:$('mode').value,speaker_profile:$('profile').value,asset:rec(),history:load().slice(-10)});download(p);ui.log('Signed passport exported (metrics only).')};
$('clr').onclick=()=>{clear();drawHist();ui.log('History cleared.')};
if('serviceWorker'in navigator)navigator.serviceWorker.register('sw.js').catch(()=>{});
const pr=loadProfile();[...F,...S].forEach(k=>{if(pr[k])$(k).value=pr[k]});
sysinfo().then(o=>$('sys').innerHTML=`${o.ua}<br>${o.cores} cores · RAM ${o.mem}<br>Battery ${o.batt??'n/a'}${o.batt!=null?'%':''}${o.charging?' ⚡':''} · Haptics ${o.haptics?'yes':'no'}`);
reseed();drawHist();ui.log('AeroAcoustic AI v2 ready · Helmholtz ≈ '+twin.helmholtz().toFixed(0)+' Hz · by NIKHIL CHARY SRIRAMOJU');frame();
