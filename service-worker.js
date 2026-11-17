const CACHE='mysemester-admin-v8';
const ASSETS=['./','./index.html','./config.js','./assets/style.css','./assets/app.js','./manifest.json'];
self.addEventListener('install',e=>{self.skipWaiting();e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)));});
self.addEventListener('activate',e=>e.waitUntil(
  caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())
));
// Network-first so updated app.js / config.js are never hidden by a stale cache.
self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET'||new URL(e.request.url).origin!==location.origin)return;
  e.respondWith(
    fetch(e.request).then(res=>{const copy=res.clone();caches.open(CACHE).then(c=>c.put(e.request,copy));return res;})
      .catch(()=>caches.match(e.request).then(c=>c||caches.match('./index.html')))
  );
});
