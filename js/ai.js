// TinyML-style acoustic fingerprint classifier (tiny dense layer + softmax, INT8-quantized weights).
// NOTE: weights are hand-initialised placeholders for the web demo. Replace with a model trained on real loopback data
// (export to TF.js / ONNX-web) — the interface stays identical.
const CLASSES=['water','sand','metal','lint'];
const W=[[ 3.0,-1.0,-2.0],[-1.5,2.5,1.0],[ 0.5,-1.0,2.5],[-2.0,1.5,-0.5]].map(r=>r.map(v=>Math.round(v*32)/32)); // INT8-grid
export function classify(f){ // f=[lowRatio,hiRatio,damping]
 const z=W.map(r=>r[0]*f[0]+r[1]*f[1]+r[2]*f[2]);const m=Math.max(...z),e=z.map(v=>Math.exp(v-m)),s=e.reduce((a,b)=>a+b);
 const p=e.map(v=>v/s),i=p.indexOf(Math.max(...p));return{label:CLASSES[i],conf:p[i]}}
export const SIGNATURE={water:[.9,.1,.2],sand:[.2,.9,.4],metal:[.4,.3,.9],lint:[.1,.8,.1]};
export function features(sc,blk,live){const b=SIGNATURE[sc];const j=()=>(Math.random()-.5)*.25*(1-.5*blk);return b.map(v=>Math.max(0,Math.min(1,v+j())))}
