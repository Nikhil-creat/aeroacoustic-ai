const V='aeroacoustic-v2',F=['./','index.html','style.css','icons/icon.svg','js/main.js','js/twin.js','js/safety.js','js/audio.js','js/opav.js','js/cfd.js','js/ai.js','js/passport.js','js/store.js','js/spectro.js'];
self.addEventListener('install',e=>{self.skipWaiting();e.waitUntil(caches.open(V).then(c=>c.addAll(F)))});
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==V).map(x=>caches.delete(x))))));
self.addEventListener('fetch',e=>e.respondWith(fetch(e.request).catch(()=>caches.match(e.request))));
