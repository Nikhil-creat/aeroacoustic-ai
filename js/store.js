// Local-only persistence (metrics & profile fields only — never audio). Predictive wear forecast + device info.
const H='aeroacoustic.history.v2',P='aeroacoustic.profile.v2';
export const load=()=>{try{return JSON.parse(localStorage.getItem(H))||[]}catch(e){return[]}};
export const save=r=>{try{const h=load();h.push(r);localStorage.setItem(H,JSON.stringify(h.slice(-100)))}catch(e){}};
export const clear=()=>{try{localStorage.removeItem(H)}catch(e){}};
export const loadProfile=()=>{try{return JSON.parse(localStorage.getItem(P))||{}}catch(e){return{}}};
export const saveProfile=p=>{try{localStorage.setItem(P,JSON.stringify(p))}catch(e){}};
export function forecast(h){const y=h.map(r=>r.ahi),n=y.length;if(n<3)return{note:'Need 3+ sessions for forecast'};
 const mx=(n-1)/2,my=y.reduce((a,b)=>a+b)/n;let nu=0,de=0;y.forEach((v,i)=>{nu+=(i-mx)*(v-my);de+=(i-mx)**2});const s=nu/de,cur=my+s*(n-1-mx);
 if(s>=-.05)return{slope:s,note:'Stable / improving trend'};return{slope:s,note:cur<=60?'AHI at/below 60 — service advised':`~${Math.round((60-cur)/s)} sessions until AHI 60`}}
export async function sysinfo(){const o={ua:(navigator.userAgent.match(/\(([^)]+)\)/)||[])[1]||'unknown',cores:navigator.hardwareConcurrency||'?',mem:navigator.deviceMemory?navigator.deviceMemory+' GB':'n/a',haptics:!!navigator.vibrate,lang:navigator.language,batt:null,charging:null};
 try{const b=await navigator.getBattery();o.batt=Math.round(b.level*100);o.charging=b.charging}catch(e){}return o}
