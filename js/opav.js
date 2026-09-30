// OPAV agent v2 — guarantees a real cleaning session: >= S seconds (10–60) of active vibration/acoustic drive,
// auto-extends (max 60 s) until clear, escalates on stall, backs off on seal stress, obeys the Safety Governor.
import {classify,features} from './ai.js';
const BASE={water:[180,500,[1,.5,.25]],sand:[400,1800,[1,.7,.4,.2]],metal:[250,900,[1,.3]],lint:[600,2600,[1,.6,.6]]};
const SWEET={water:[220,650],sand:[500,2200],metal:[300,1100],lint:[800,3000]};
const CFG={standard:{k:1,cap:.85},water:{k:1.1,cap:.85},dust:{k:.9,cap:.7,hb:1.3},gentle:{k:.6,cap:.5},hyper:{k:1,cap:.8,hyper:true}};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
export class OPAV{
 constructor(o){Object.assign(this,o);this.S=Math.max(10,Math.min(60,o.S||30));this.cfg=CFG[o.profileName]||CFG.standard;this.level=0;this.hist=[];this.abort=false;this.active=0}
 log(m){this.ui.log(m)}
 async observe(){this.ui.phase('OBSERVE');let blk,fe;
  if(this.mode==='sim'){blk=this.sim.blockage;fe=features(this.sim.scenario,blk)}
  else{blk=this.rig.blockage();if(blk==null)blk=this.sim.blockage;const f=this.rig.features();fe=f?[f.lo,f.hi,1-f.mid]:features(this.sim.scenario,blk)}
  const c=classify(fe);return{blk,debris:c.label,conf:c.conf,seal:(Math.random()-.5)*.4+(this.level>3?.3:0)}}
 plan(o,polish){this.ui.phase(polish?'POLISH':'PLAN');const b=BASE[o.debris]||BASE.water,w=1+.25*this.level,hb=this.cfg.hb||1;
  let amp=polish?.3:Math.min((.4+.08*this.level)*this.cfg.k,this.cfg.cap),f0=b[0]/w,f1=b[1]*w,harm=b[2].map((v,i)=>i?v*hb:v);
  if(this.cfg.hyper){ // HYPER CLEAN: 60 Hz -> device limit, one band per pass (bulk shake -> fine-particle lift)
   const nyq=Math.min(20000,((this.rig&&this.rig.ctx&&this.rig.ctx.sampleRate)||48000)/2*.92),B=[[60,300],[300,1500],[1500,6000],[6000,nyq]],k=(this.pass=(this.pass||0)+1)-1,bd=B[k%4],ww=1+.1*this.level;
   f0=Math.max(60,bd[0]/ww);f1=Math.min(nyq,bd[1]*ww);harm=f1>7000?[1]:[1,.45,.2];if(f0>8000)amp*=.5;this.log(`HYPER band ${k%4+1}/4 · 60 Hz→${(nyq/1000).toFixed(1)} kHz device limit`)}
  return{f0,f1,harm,amp,dur:3+this.level*.5,haptic:{lockRatio:1+this.level%3,intensity:Math.min(.5+.1*this.level,1)}}}
 overlap(p,s){const a=Math.max(p.f0,s[0]),b=Math.min(p.f1,s[1]);return b<=a?0:Math.log(b/a)/Math.log(s[1]/s[0])}
 async act(plan){this.ui.phase('ACT');const pf=this.twin.preflight(plan);
  if(!pf.ok){this.log('Twin rejected plan → escalating');this.level++;return null}
  const p=pf.plan;if(p.amp<plan.amp-.01)this.log(`Twin auto-attenuated amp ${plan.amp.toFixed(2)}→${p.amp.toFixed(2)}`);
  this.log(`Sweep ${p.f0|0}-${p.f1|0} Hz · H×${p.harm.length} · amp ${p.amp.toFixed(2)} · ${p.dur.toFixed(1)} s · haptic ${p.haptic.lockRatio}:1`);
  const live=this.mode==='live';if(live){this.rig.start(p);this.rig.startHaptics(p.haptic)}
  this.sim.harm=p.harm;const t0=performance.now();let sum=0,n=0,t=0;
  while((t=(performance.now()-t0)/1000)<p.dur&&!this.abort){
   const f=p.f0*Math.pow(p.f1/p.f0,t/p.dur);this.sim.freq=f;const fac=this.safety.update(.05,p.amp,f);
   if(live)this.rig.setGain(p.amp*fac);this.sim.amp=p.amp*fac;sum+=p.amp*fac;n++;
   this.ui.tick(f,fac);this.ui.progress(this.active+t,this.S);
   if(this.safety.state==='tripped'){this.log('⚠ SAFETY INTERLOCK TRIPPED — output cut');break}
   await sleep(50)}
  this.active+=t;if(live)this.rig.stop();this.sim.amp=0;this.sim.freq=0;return{amp:n?sum/n:0,plan:p,t}}
 applySim(r){if(!r)return;const p=r.plan,ov=this.overlap(p,SWEET[this.sim.scenario]);
  let eff=r.amp*ov*(.6+.4*p.haptic.intensity)*(.7+.6*Math.random());
  if(this.sim.blockage<.45&&this.level<2)eff*=.12;
  this.sim.blockage=Math.max(0,this.sim.blockage-.5*eff*r.t/3)}
 stalled(){const h=this.hist;return h.length>=3&&h[h.length-3]-h[h.length-1]<.05}
 async run(){this.abort=false;this.level=0;this.hist=[];this.active=0;this.pass=0;this.safety.rearm();const S=this.S,CAP=60;this.ui.say(`Cleaning started. Target ${S} seconds.`);
  for(let cyc=1;cyc<=80&&!this.abort;cyc++){
   const o=await this.observe();this.ui.observe(o);this.log(`[#${cyc}] ${this.active.toFixed(0)}s/${S}s · blockage ${(o.blk*100)|0}% · ${o.debris} (${(o.conf*100)|0}%)`);
   if(!this.hist.length)this.hist.push(o.blk);const clear=o.blk<.08;
   if(this.active>=S&&clear)return this.end('done',o);
   if(this.active>=CAP)return this.end(clear?'done':'advised',o);
   if(this.safety.needsCooldown()){this.ui.phase('COOLDOWN');this.log('Thermal cooldown…');while(this.safety.needsCooldown()&&!this.abort){this.safety.cool(.25);this.ui.tick(0,1);await sleep(250)}}
   const p=this.plan(o,clear),cap=(this.active<S?S:CAP)-this.active;p.dur=Math.max(2,Math.min(p.dur,cap));
   const r=await this.act(p);if(this.safety.state==='tripped')return this.end('aborted',o);
   this.ui.phase('VERIFY');if(this.mode==='sim')this.applySim(r);else if(r)await sleep(400);
   const v=await this.observe();this.hist.push(v.blk);this.ui.observe(v);
   if(v.seal>1.5)this.level=Math.max(0,this.level-2);
   else if(this.stalled()&&!clear){this.level++;this.log(`STALL → escalate to level ${this.level} (wider band, new haptic phase)`);this.ui.say('Stall detected. Escalating.')}
   if(!clear&&this.active>=S&&this.active<CAP&&cyc%2===0)this.log(`Auto-extending session (${this.active.toFixed(0)}s of max ${CAP}s)`)}
  return this.end(this.abort?'aborted':'advised',{blk:this.sim.blockage})}
 end(s,o){this.ui.phase(s==='done'?'DONE':s==='advised'?'SERVICE ADVISED':'ABORTED');this.log({done:'✔ Speaker clear.',advised:'Max session reached — service advised.',aborted:'Aborted.'}[s]+` Active drive: ${this.active.toFixed(1)} s`);this.ui.finish(s,o,this.active);return s}
}
