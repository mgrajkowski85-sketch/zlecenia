/* Tryb offline dla Dziennika zleceń.
   Aplikacja ma się otwierać w serwerowni bez zasięgu, więc trzymamy jej kopię
   w telefonie. Dane zleceń tu NIE trafiają — te siedzą w localStorage.
   Po każdej zmianie w aplikacji podbij WERSJA, żeby telefon pobrał nową kopię. */
const WERSJA = 'zlecenia-17';
const PLIKI = [
  './',
  './index.html',
  './manifest.webmanifest',
  './ikona-192.png',
  './ikona-512.png'
];

self.addEventListener('install', (zdarzenie) => {
  zdarzenie.waitUntil(
    caches.open(WERSJA)
      .then((magazyn) => magazyn.addAll(PLIKI))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (zdarzenie) => {
  zdarzenie.waitUntil(
    caches.keys()
      .then((klucze) => Promise.all(
        klucze.filter((k) => k !== WERSJA).map((k) => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (zdarzenie) => {
  const zadanie = zdarzenie.request;
  if (zadanie.method !== 'GET') return;

  // Strona: najpierw sieć (żeby złapać nowszą wersję), przy braku zasięgu kopia z telefonu.
  if (zadanie.mode === 'navigate') {
    zdarzenie.respondWith(
      fetch(zadanie)
        .then((odp) => {
          const kopia = odp.clone();
          caches.open(WERSJA).then((m) => m.put('./index.html', kopia));
          return odp;
        })
        .catch(() => caches.match('./index.html').then((m) => m || caches.match('./')))
    );
    return;
  }

  // Reszta: z kopii, a jak jej nie ma — z sieci i do kopii.
  // Biblioteka od kodów QR jest obca, ale trzymamy ją, żeby kod dał się narysować bez zasięgu.
  const swoje = new URL(zadanie.url).origin === location.origin;
  const bibliotekaQr = zadanie.url.indexOf('cdnjs.cloudflare.com/ajax/libs/qrcodejs/') !== -1;

  zdarzenie.respondWith(
    caches.match(zadanie).then((zKopii) => zKopii || fetch(zadanie).then((odp) => {
      if (odp.ok && (swoje || bibliotekaQr)) {
        const kopia = odp.clone();
        caches.open(WERSJA).then((m) => m.put(zadanie, kopia));
      }
      return odp;
    }).catch(() => zKopii))
  );
});
