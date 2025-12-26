--- /dev/null
+++ c:\Users\santa fe\Desktop\chamados-ti\sw.js
@@ -0,0 +1,36 @@
+const CACHE_NAME = 'chamados-ti-v1';
+const ASSETS_TO_CACHE = [
+  './',
+  './index.html',
+  './login.html',
+  './consulta.html',
+  './css/style.css',
+  './js/index.js',
+  './js/theme-switcher.js',
+  './assets/logo.jpg'
+];
+
+// Instalação: Cache dos arquivos estáticos principais
+self.addEventListener('install', (event) => {
+  event.waitUntil(
+    caches.open(CACHE_NAME).then((cache) => {
+      return cache.addAll(ASSETS_TO_CACHE);
+    })
+  );
+});
+
+// Estratégia: Network First (Tenta a internet, se cair usa o cache)
+self.addEventListener('fetch', (event) => {
+  event.respondWith(
+    fetch(event.request)
+      .then((response) => {
+        // Atualiza o cache com a nova versão se a rede funcionar
+        const responseClone = response.clone();
+        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseClone));
+        return response;
+      })
+      .catch(() => {
+        // Se estiver offline, retorna o que tiver no cache
+        return caches.match(event.request);
+      })
+  );
+});
