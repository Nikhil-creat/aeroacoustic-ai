// Live bio-acoustic waterfall (log-frequency). Live mode = real mic loopback; sim mode = synthesised from the sweep.
export class Spectro{constructor(cv){this.cv=cv;this.c=cv.getContext('2d');this.w=cv.width;this.h=cv.height;this.c.fillStyle='#030611';this.c.fillRect(0,0,this.w,this.h)}
 push(col){const c=this.c,n=col.length,bh=this.h/n;c.drawImage(this.cv,-2,0);for(let i=0;i<n;i++){const v=Math.max(0,Math.min(1,col[i]));c.fillStyle=`hsl(${265-v*215},100%,${6+v*58}%)`;c.fillRect(this.w-2,this.h-(i+1)*bh,2,bh+1)}}}
export function simCol(f,amp,harm,n=48){const col=Array.from({length:n},()=>Math.random()*.07),pos=hz=>Math.log(hz/60)/Math.log(20000/60)*n;
 (harm||[1]).forEach((w,k)=>{const p=pos(f*(k+1));if(f>0&&p>=0&&p<n)for(let d=-1;d<=1;d++){const i=Math.round(p)+d;if(i>=0&&i<n)col[i]+=amp*w*(d?.4:1)*1.6}});return col}
export function liveCol(an,sr,n=48){const a=new Float32Array(an.frequencyBinCount);an.getFloatFrequencyData(a);const hz=sr/an.fftSize,col=[];
 for(let i=0;i<n;i++){const f0=60*Math.pow(333.33,i/n),f1=60*Math.pow(333.33,(i+1)/n);let m=-140;for(let b=Math.floor(f0/hz);b<=Math.ceil(f1/hz);b++)m=Math.max(m,a[b]??-140);col.push((m+100)/60)}return col}
