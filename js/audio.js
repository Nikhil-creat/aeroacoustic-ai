// Multi-harmonic sweep + haptic pulse sync + mic loopback (RAM only).
export class Rig{
 constructor(){this.ctx=null;this.base=null;this.pulseTimer=null}
 async init(live){this.ctx=this.ctx||new (window.AudioContext||window.webkitAudioContext)();await this.ctx.resume();
  this.master=this.ctx.createGain();this.master.gain.value=0;
  this.lim=this.ctx.createDynamicsCompressor();this.lim.threshold.value=-12;this.lim.ratio.value=20;
  this.master.connect(this.lim).connect(this.ctx.destination);
  if(live&&!this.an){try{const st=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:false,noiseSuppression:false,autoGainControl:false}});
   this.an=this.ctx.createAnalyser();this.an.fftSize=4096;this.ctx.createMediaStreamSource(st).connect(this.an);this.stream=st}catch(e){throw new Error('Mic denied: '+e.message)}}}
 freqNow(){const p=this.plan;if(!p)return 0;const u=Math.min(1,(this.ctx.currentTime-this.t0)/p.dur);return p.f0*Math.pow(p.f1/p.f0,u)}
 start(plan,ceiling=.35){this.plan=plan;this.ceiling=ceiling;const c=this.ctx,t=c.currentTime;this.t0=t;
  const n=plan.harm.length+1,real=new Float32Array(n),imag=new Float32Array(n);plan.harm.forEach((w,i)=>imag[i+1]=w);
  this.osc=c.createOscillator();this.osc.setPeriodicWave(c.createPeriodicWave(real,imag));
  this.osc.frequency.setValueAtTime(plan.f0,t);this.osc.frequency.exponentialRampToValueAtTime(plan.f1,t+plan.dur);
  this.osc.connect(this.master);this.osc.start(t);this.osc.stop(t+plan.dur+.05);
  this.master.gain.setValueAtTime(0,t);}
 setGain(g){this.master.gain.setTargetAtTime(g*this.ceiling,this.ctx.currentTime,.02)}
 // Haptics: Vibration API is coarse (ms-level, Android only); we phase-lock pulse cadence to the sweep's fundamental / lockRatio.
 startHaptics(h){if(!navigator.vibrate)return;const tick=()=>{const f=this.freqNow()||200;navigator.vibrate(Math.round(12+h.intensity*20));
   this.pulseTimer=setTimeout(tick,Math.max(70,1000*h.lockRatio*6/f))};tick()}
 stop(){try{this.osc&&this.osc.stop()}catch(e){}this.master&&this.master.gain.setTargetAtTime(0,this.ctx.currentTime,.01);clearTimeout(this.pulseTimer);navigator.vibrate&&navigator.vibrate(0)}
 // Mic feature extraction: band energies + centroid from loopback spectrum
 features(){if(!this.an)return null;const a=new Float32Array(this.an.frequencyBinCount);this.an.getFloatFrequencyData(a);
  const hz=this.ctx.sampleRate/this.an.fftSize;let lo=0,mid=0,hi=0,tot=0,cs=0;
  a.forEach((db,i)=>{const e=Math.pow(10,db/10),f=i*hz;tot+=e;cs+=e*f;if(f<400)lo+=e;else if(f<1500)mid+=e;else if(f<5000)hi+=e});
  return{lo:lo/tot,mid:mid/tot,hi:hi/tot,centroid:cs/tot,energy:hi+mid}}
 async calibrate(){const p={f0:150,f1:4000,dur:2.5,harm:[1,.4],amp:.3};this.start(p,.25);this.setGain(.8);const es=[];
  for(let i=0;i<20;i++){await new Promise(r=>setTimeout(r,120));const f=this.features();f&&es.push(f.energy)}this.stop();
  this.base=es.length?es.reduce((a,b)=>a+b)/es.length:null;return this.base}
 blockage(){const f=this.features();if(!f||!this.base)return null;return Math.min(1,Math.max(0,1-f.energy/this.base))}
}
