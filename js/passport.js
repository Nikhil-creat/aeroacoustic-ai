// Acoustic Health Index + locally-signed (ECDSA P-256) passport. Metrics only — never audio.
export const ahi=({thd,lin,spl})=>Math.round(100*(.4*(1-Math.min(thd/10,1))+.35*lin+.25*spl));
export async function makePassport(m){const kp=await crypto.subtle.generateKey({name:'ECDSA',namedCurve:'P-256'},true,['sign','verify']);
 const body={app:'AeroAcoustic AI',author:'NIKHIL CHARY SRIRAMOJU',...m,ts:new Date().toISOString()};
 const data=new TextEncoder().encode(JSON.stringify(body));
 const sig=await crypto.subtle.sign({name:'ECDSA',hash:'SHA-256'},kp.privateKey,data);
 const pub=await crypto.subtle.exportKey('jwk',kp.publicKey);
 const b64=b=>btoa(String.fromCharCode(...new Uint8Array(b)));
 return{...body,sig:b64(sig),publicKey:pub}}
export function download(obj){const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify(obj,null,2)],{type:'application/json'}));a.download='aeroacoustic-health-passport.json';a.click()}
