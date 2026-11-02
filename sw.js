// Service worker (trabalhador em segundo plano): guarda uma cópia dos arquivos
// do app no celular para ele abrir mesmo com internet fraca ou sem internet.
// Ao mudar o app, aumente o número da versão em CACHE para atualizar a cópia.
const CACHE = "amigos-da-vila-franca-v23";
const ARQUIVOS = ["./", "index.html", "style.css", "app.js", "quiz-perguntas.js", "db.js", "config.js", "manifest.json", "privacidade.html", "icons/icon-192.png", "vendor/leaflet/leaflet.js", "vendor/leaflet/leaflet.css", "vendor/leaflet/images/marker-icon.png", "vendor/leaflet/images/marker-icon-2x.png", "vendor/leaflet/images/marker-shadow.png", "vendor/fonts/fonts.css", "vendor/fonts/fredoka-latin-600-normal.woff2", "vendor/fonts/fredoka-latin-700-normal.woff2", "vendor/fonts/nunito-latin-400-normal.woff2", "vendor/fonts/nunito-latin-700-normal.woff2", "vendor/fonts/nunito-latin-800-normal.woff2", "img/logo.png", "img/banner.jpg", "img/nuvens.svg", "img/cat-cao.png", "img/cat-gato.png", "img/cat-ave.png"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ARQUIVOS)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
// Busca primeiro na internet (sempre atualizado); se falhar, usa a cópia guardada.
self.addEventListener("fetch", e => {
  if (e.request.method !== "GET" || !e.request.url.startsWith(self.location.origin)) return;
  e.respondWith(
    fetch(e.request).then(r => { const copia = r.clone(); caches.open(CACHE).then(c => c.put(e.request, copia)); return r; })
      .catch(() => caches.match(e.request))
  );
});
