// Thermal & Excursion Governor. Model-based (no public voice-coil sensors exist). Runs at ~20 Hz.
export class Safety{
 constructor(twin){this.twin=twin;this.reset()}
 reset(){this.T=30;this.Tamb=30;this.x=0;this.state='nominal';this.factor=1;this.tempN=0;this.xN=0}
 update(dt,gain,f){const s=this.twin.s;if(this.state==='tripped')return 0;
  const V=gain*s.V,P=V*V/s.Re;
  this.T+=(P*s.Rth-(this.T-this.Tamb))/s.tau*dt;
  this.x=this.twin.xPerVolt(f)*V*Math.min(this.twin.gain(f),2.5);
  this.tempN=Math.max(0,(this.T-this.Tamb)/(s.Tmax-this.Tamb));this.xN=this.x/s.xmax;
  const margin=Math.min(1-this.tempN,1-this.xN);
  if(this.T>s.Ttrip||this.x>1.3*s.xmax){this.state='tripped';this.factor=0;return 0}
  this.factor=margin<.3?Math.max(0,margin/.3)**2:1;this.state=this.factor<1?'limiting':'nominal';return this.factor}
 cool(dt){const s=this.twin.s;this.T+=(this.Tamb-this.T)/s.tau*dt}
 needsCooldown(){return this.T>this.twin.s.Tmax-12}
 rearm(){if(this.state==='tripped'){this.state='nominal';this.T=this.Tamb}}
}
