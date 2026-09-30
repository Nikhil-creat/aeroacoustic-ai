const V='aeroacoustic-v1',F=['./','index.html','style.css','js/main.js','js/twin.js','js/safety.js','js/audio.js','js/opav.js','js/cfd.js','js/ai.js','js/passport.js'];
self.addEventListener('install',e=>e.waitUntil(caches.open(V).then(c=>c.addAll(F))));
self.addEventListener('fetch',e=>e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request))));
