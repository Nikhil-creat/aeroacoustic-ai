// CFD-style particle visualizer: Twin pressure field -> radiation force on water/dust particles across a mesh grill.
export class CFD{
 constructor(cv){this.cv=cv;this.x=cv.getContext('2d');this.p=[];this.holes=[];this.meshY=.42;this.ej=0;this.trail=0
  for(let i=0;i<16;i++)this.holes.push({x:.1+i*.052,r:.016})}
 seed(kind,blk){this.kind=kind;const n=Math.round(blk*260);this.p=[];this.ej=0
  for(let i=0;i<n;i++)this.p.push({x:Math.random(),y:.5+Math.random()*.45,vx:0,vy:0,m:kind==='water'?1.4:.7,stuck:false})}
 sync(blk){const t=Math.round(blk*260);while(this.p.length>t)this.p.splice(Math.random()*this.p.length|0,1)}
 step(dt,t,twin,f,amp,blk){const vf=Math.min(f/40,25);
  for(const q of this.p){const pr=twin.pressure(q.y,t,vf*6.283/6.283,1)*amp;
   q.vy-=(Math.max(0,pr)*2.2+amp*.6*Math.random())/q.m*dt;q.vx+=(Math.random()-.5)*amp*1.2*dt;
   if(this.kind==='water'){q.vx+=(.5-q.x)*.02*dt}
   q.vy+=(.12+blk*.35)*dt;q.vx*=1-1.6*dt;q.vy*=1-1.6*dt;q.x+=q.vx*dt;q.y+=q.vy*dt;
   q.x=Math.max(0,Math.min(1,q.x));
   if(q.y<this.meshY+.01&&q.y>this.meshY-.03){const h=this.holes.some(o=>Math.abs(q.x-o.x)<o.r);if(!h){q.y=this.meshY+.012;q.vy=Math.abs(q.vy)*.2}}
   if(q.y>.98){q.y=.98;q.vy*=-.3}}
  const before=this.p.length;this.p=this.p.filter(q=>q.y>0);this.ej+=before-this.p.length;}
 draw(f,amp,t){const c=this.x,W=this.cv.width,H=this.cv.height;c.fillStyle='rgba(3,6,17,.35)';c.fillRect(0,0,W,H);
  // acoustic wavefronts
  c.strokeStyle='rgba(0,229,255,'+(.08+amp*.25)+')';for(let i=0;i<7;i++){const r=((t*60*(0.5+amp)+i*40)%280);c.beginPath();c.arc(W/2,H*.98,r,Math.PI,2*Math.PI);c.stroke()}
  // mesh
  c.fillStyle='#2a3a6a';c.fillRect(0,H*this.meshY-2,W,4);c.fillStyle='#030611';this.holes.forEach(o=>c.fillRect((o.x-o.r)*W,H*this.meshY-3,2*o.r*W,6));
  c.globalCompositeOperation='lighter';
  for(const q of this.p){c.fillStyle=this.kind==='water'?'rgba(70,170,255,.7)':this.kind==='metal'?'rgba(200,200,230,.7)':'rgba(230,190,110,.7)';
   c.beginPath();c.arc(q.x*W,q.y*H,this.kind==='water'?3.2:1.8,0,6.283);c.fill()}
  c.globalCompositeOperation='source-over';c.fillStyle='#8fa6d6';c.font='11px monospace';c.fillText('ejected: '+this.ej+'  in-chamber: '+this.p.length,10,H-8)}
}
