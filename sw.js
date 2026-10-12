const BASE=new URL(self.registration.scope).pathname
const CACHE='bianjing-'+BASE.replace(/\W/g,'')+'-v2'
const local=path=>BASE+path
const art=['overview','hero','bridge','gate','market','river','country'].map(name=>local('art/'+name+'.webp')).concat(Array.from({length:16},(_,i)=>local('art/tile-'+i+'.webp')))
self.addEventListener('install',event=>event.waitUntil((async()=>{
  const cache=await caches.open(CACHE)
  const response=await fetch(local('index.html'),{cache:'reload'})
  if(!response.ok)throw new Error('App shell could not be cached')
  const html=await response.clone().text()
  await cache.put(local('index.html'),response)
  const assets=[...html.matchAll(/(?:src|href)="([^\"]*\/assets\/[^\"]+)"/g)].map(match=>new URL(match[1],self.registration.scope).href)
  await cache.addAll([...assets,...art,...['manifest.webmanifest','icon-192.png','icon-512.png','favicon.svg'].map(local)])
  self.skipWaiting()
})()))
self.addEventListener('activate',event=>event.waitUntil((async()=>{for(const name of await caches.keys())if(name.startsWith('bianjing-'+BASE.replace(/\W/g,'')+'-') && name!==CACHE)await caches.delete(name);await self.clients.claim()})()))
self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET' || new URL(event.request.url).origin!==self.location.origin)return
  event.respondWith((async()=>{
    const cache=await caches.open(CACHE)
    if(event.request.mode==='navigate'){try{const response=await fetch(event.request);if(response.ok)await cache.put(local('index.html'),response.clone());return response}catch{return await cache.match(local('index.html'),{ignoreVary:true})}}
    const cached=await cache.match(event.request,{ignoreVary:true});if(cached)return cached
    const response=await fetch(event.request);if(response.ok)await cache.put(event.request,response.clone());return response
  })())
})
