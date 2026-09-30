// Observe-Plan-Act-Verify agent. Detects stalled debris removal and escalates sweep/haptic strategy.
import {classify,features} from './ai.js';
const BASE={water:[180,500,[1,.5,.25]],sand:[400,1800,[1,.7,.4,.2]],metal:[250,900,[1,.3]],lint:[600,2600,[1,.6,.6]]};
const SWEET={water:[220,650],sand:[500,2200],metal:[300,1100],lint:[800,3000]};   // sim ground truth
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
export class OPAV{
 constructor(o){Object.assign(this,o);this.level=0;this.hist=[];this.abort=false;this.cycles=0}
 log(m){this.ui.log(m)}
 async observe(){this.ui.phase('OBSERVE');let blk,fe;
  if(this.mode==='sim'){blk=this.sim.blockage;fe=features(this.sim.scenario,blk)}
  else{blk=this.rig.blockage();if(blk==null)blk=this.sim.blockage;const f=this.rig.features();fe=f?[f.lo,f.hi,1-f.mid]:features(this.sim.scenario,blk)}
  const c=classify(fe);const seal=(Math.random()-.5)*.4+(this.level>3?.3:0);
  return{blk,debris:c.label,conf:c.conf,seal}}
 plan(o){this.ui.phase('PLAN');const b=BASE[o.debris]||BASE.water,w=1+.25*this.level;
  return{f0:b[0]/w,f1:b[1]*w,harm:b[2],amp:Math.min(.4+.08*this.level,.85),dur:3+this.level*.5,
   haptic:{lockRatio:1+this.level%3,intensity:Math.min(.5+.1*this.level,1)}}}
 overlap(p,s){const a=Math.max(p.f0,s[0]),b=Math.min(p.f1,s[1]);return b<=a?0:Math.log(b/a)/Math.log(s[1]/s[0])}
 async act(plan){this.ui.phase('ACT');const pf=this.twin.preflight(plan);
  if(!pf.ok){this.log('Twin rejected plan (excursion envelope) → escalating');this.level++;return null}
  const p=pf.plan;if(p.amp<plan.amp-.01)this.log(`Twin auto-attenuated amp ${plan.amp.toFixed(2)}→${p.amp.toFixed(2)}`);
  this.log(`Sweep ${p.f0|0}-${p.f1|0} Hz · H×${p.harm.length} · amp ${p.amp.toFixed(2)} · haptic lock ${p.haptic.lockRatio}:1`);
  const live=this.mode==='live';if(live){this.rig.start(p);this.rig.startHaptics(p.haptic)}
  const t0=performance.now();let sum=0,n=0,t=0;this.sim.freq=p.f0;
  while((t=(performance.now()-t0)/1000)<p.dur&&!this.abort){
   const u=t/p.dur,f=p.f0*Math.pow(p.f1/p.f0,u);this.sim.freq=f;
   const fac=this.safety.update(.05,p.amp,f);
   if(live)this.rig.setGain(p.amp*fac);
   this.sim.amp=p.amp*fac;sum+=p.amp*fac;n++;
   this.ui.tick(f,fac);
   if(this.safety.state==='tripped'){this.log('⚠ SAFETY INTERLOCK TRIPPED — output cut');break}
   await sleep(50)}
  if(live)this.rig.stop();this.sim.amp=0;
  return{amp:n?sum/n:0,plan:p}}
 applySim(r){if(!r)return;const p=r.plan,ov=this.overlap(p,SWEET[this.sim.scenario]);
  let eff=r.amp*ov*(.6+.4*p.haptic.intensity)*(.7+.6*Math.random());
  if(this.sim.blockage<.45&&this.level<2)eff*=.12;   // wedged residue needs a strategy change
  this.sim.blockage=Math.max(0,this.sim.blockage-.5*eff*p.dur/3)}
 stalled(){const h=this.hist;return h.length>=3&&h[h.length-3]-h[h.length-1]<.02}
 async run(){this.abort=false;this.level=0;this.hist=[];this.safety.rearm();
  for(this.cycles=1;this.cycles<=14&&!this.abort;this.cycles++){
   const o=await this.observe();this.ui.observe(o);
   this.log(`[#${this.cycles}] blockage ${(o.blk*100)|0}% · ${o.debris} (${(o.conf*100)|0}%) · Δseal ${o.seal.toFixed(2)} hPa`);
   if(this.hist.length===0)this.hist.push(o.blk);
   if(o.blk<.08){this.finish(o);return true}
   if(this.safety.needsCooldown()){this.log('Thermal cooldown…');this.ui.phase('COOLDOWN');while(this.safety.needsCooldown()&&!this.abort){this.safety.cool(.25);this.ui.tick(0,1);await sleep(250)}}
   const r=await this.act(this.plan(o));
   if(this.safety.state==='tripped'){this.ui.phase('ABORTED');return false}
   this.ui.phase('VERIFY');if(this.mode==='sim')this.applySim(r);else if(r)await sleep(400);
   const v=await this.observe();this.hist.push(v.blk);this.ui.observe(v);
   if(v.seal>1.5)this.level=Math.max(0,this.level-2);          // seal stress: back off
   else if(this.stalled()){this.level++;this.log(`STALL detected → escalate to level ${this.level} (wider band, new haptic phase)`)}
  }
  this.ui.phase(this.abort?'ABORTED':'SERVICE ADVISED');this.log(this.abort?'Aborted by user.':'Max cycles reached — manual service recommended.');return false}
 finish(o){this.ui.phase('DONE');this.log('✔ Speaker clear. Issuing Health Passport.');this.ui.done(o)}
}
