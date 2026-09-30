// Acoustic Digital Twin: Helmholtz chamber + Thiele-Small cone model. Pre-flights every plan.
export const PROFILES={
 phone:{g:{volume_cc:.6,neckArea_mm2:6,neckLen_mm:2,c:343},s:{Re:7.5,Rth:28,tau:2.2,Tmax:105,Ttrip:120,xmax:.45e-3,Bl:.9,fs:780,Q:.9,mms:.12e-3,V:3.8}},
 watch:{g:{volume_cc:.25,neckArea_mm2:2.5,neckLen_mm:1.5,c:343},s:{Re:8,Rth:45,tau:1.6,Tmax:95,Ttrip:110,xmax:.3e-3,Bl:.7,fs:1100,Q:.9,mms:.07e-3,V:3.0}},
 laptop:{g:{volume_cc:3,neckArea_mm2:20,neckLen_mm:3,c:343},s:{Re:4,Rth:18,tau:3.5,Tmax:110,Ttrip:125,xmax:.8e-3,Bl:1.4,fs:450,Q:.8,mms:.35e-3,V:4.5}}};
export class DigitalTwin{
 constructor(p='phone'){this.set(p)}
 set(p){this.g=PROFILES[p].g;this.s=PROFILES[p].s}
 helmholtz(){const{neckArea_mm2:A,neckLen_mm:L,volume_cc:V,c}=this.g;return c/(2*Math.PI)*Math.sqrt(A*1e-6/(V*1e-6*L*1e-3))}
 gain(f){const r=f/this.helmholtz();return 1/Math.hypot(1-r*r,r/2.5)}
 xPerVolt(f){const s=this.s,w=2*Math.PI*f,w0=2*Math.PI*s.fs,k=s.mms*w0*w0,rms=s.mms*w0/s.Q;return(s.Bl/s.Re)/Math.hypot(k-s.mms*w*w,rms*w)}
 // returns {ok, plan} with amplitude auto-attenuated so predicted excursion <= 60% xmax across the band
 preflight(plan){let amp=plan.amp;const s=this.s;
  for(let f=plan.f0;f<=plan.f1;f*=1.05){const x=this.xPerVolt(f)*amp*s.V*(1+plan.harm.length*.15);
   if(x>.6*s.xmax)amp*=.6*s.xmax/x}
  if(plan.f0<60)amp=Math.min(amp,.05);            // sub-bass guard
  return{ok:amp>.04,plan:{...plan,amp}}}
 pressure(y,t,f,amp){return amp*Math.cos(6*y)*Math.sin(2*Math.PI*f*t)}
}
