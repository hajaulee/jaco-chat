var cacheStorageName = 'JacoChat';
var indexPage = 'index.html';
var offlinePage = 'offline.html';
var fontUrl = 'https://hajaulee.github.io/Houf-Jaco-Regular-Script/new_fonts/ttf/HoufRegularScript-Light.ttf';
var cacheUrls = [offlinePage, fontUrl];
var neverCacheUrls = [/\/index.html/];

// Install 
self.addEventListener('install', (e) => {
	console.log('PWA sw installation');
	e.waitUntil(caches.open(cacheStorageName).then((cache) => {
		console.log('PWA sw caching first urls');
		cacheUrls.map(async (url) => {
			return cache.add(url).catch((res) => {
				return console.log('PWA: ' + String(res) + ' ' + url);
			});
		});
	}));
});

// Activate
self.addEventListener('activate', (e) => {
	console.log('PWA sw activation');
	e.waitUntil(caches.keys().then((kl) => {
		return Promise.all(kl.map((key) => {
			if (key !== cacheStorageName) {
				console.log('PWA old cache removed', key);
				return caches.delete(key);
			}
		}));
	}));
	return self.clients.claim();
});

// Fetch
self.addEventListener('fetch', (e) => {

	if (!checkFetchRules(e)) return;

	// Strategy for online user
	if (e.request.mode === 'navigate' && navigator.onLine) {
		e.respondWith(fetch(e.request).then(async (response) => {
			return caches.open(cacheStorageName).then((cache) => {
				if (neverCacheUrls.every(checkNeverCacheUrls, e.request.url) && e.request.method === 'GET') {
					cache.put(e.request, response.clone());
				}
				return response;
			});
		}));
		return;
	}

	// Strategy for offline user
	e.respondWith(caches.match(e.request).then((response) => {
		return response || fetch(e.request).then(async (response) => {
			return caches.open(cacheStorageName).then((cache) => {
				if (neverCacheUrls.every(checkNeverCacheUrls, e.request.url) && e.request.method === 'GET') {
					cache.put(e.request, response.clone());
				}
				return response;
			});
		});
	}).catch(() => {
		return caches.match(offlinePage);
	}));
});

// Push
self.addEventListener('push', (e) => {
	e.waitUntil(
		clients.matchAll().then(clientList => {
			let status = "Background Message";
			if (clientList.length > 0) {
				// Có ít nhất một cửa sổ hoặc tab đang mở
				status = "Foreground Message";
			} else {
				// Không có cửa sổ hoặc tab nào đang mở
			}

			if (e.data) {
				const payload = e.data.json();
				const notificationTitle = payload.notification.title + ' ' + status;
				const notificationOptions = {
					body: payload.notification.body,
					icon: 'img/fav-72.png'
				};
		
				self.registration.showNotification(notificationTitle, notificationOptions);
			}
		})
	);
	
});

// Check never cache urls 
function checkNeverCacheUrls(url) {
	if (this.match(url)) {
		return false;
	}
	return true;
}

// Fetch Rules
function checkFetchRules(e) {

	// Check request url http or https
	if (!e.request.url.match(/^(http|https):\/\//i)) return;

	// Show offline page for POST requests
	if (e.request.method !== 'GET') {
		return caches.match(offlinePage);
	}

	return true;
}