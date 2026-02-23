// Service Worker minimo — basta che esista e sia registrato
self.addEventListener('install', (e) => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(clients.claim()));

// Fetch passthrough — non cacchiamo nulla, lasciamo tutto a Next.js
self.addEventListener('fetch', (e) => {
  e.respondWith(fetch(e.request));
});