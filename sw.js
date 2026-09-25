/* v7: SW 自我注销，清空所有缓存，直连网络 */
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(names.map((n) => caches.delete(n)))
    ).then(() => self.clients.claim())
     .then(() => self.registration.unregister())
  );
});
self.addEventListener('fetch', (event) => { /* 不再拦截，全部走网络 */ });
