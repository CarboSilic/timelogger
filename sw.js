self.addEventListener('install', (ev) => {
    // console.log('Installing sw ...', ev);
});

self.addEventListener('activate', (ev) => {
    // console.log('Activating sw ...');
    return self.clients.claim();
});

self.addEventListener('fetch', (ev) => {
    // console.log('Fetching ', ev.request);
    ev.respondWith(fetch(ev.request));
});