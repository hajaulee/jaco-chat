var cacheStorageName = 'JacoChat-v1.0.10';
var indexPage = 'index.html';
var offlinePage = 'offline.html';
var fontUrl = 'https://hajaulee.github.io/Houf-Jaco-Regular-Script/new_fonts/ttf/HoufRegularScript-Light.ttf';
var cacheUrls = [offlinePage, fontUrl];
var neverCacheUrls = [/\/index.html/, /\/sw.js/];

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
	if (e.request.mode === 'navigate' && !navigator.onLine) {
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
	}
});

// Push
self.addEventListener('push', async (e) => {
	console.log('PWA sw push event', e);
	const tabActive = await getData('PAGE_ACTIVE');
	
	if (!tabActive && e.data) {
		const payload = e.data.json();
		const notificationTitle = payload.notification.title;
		const notificationOptions = {
			body: payload.notification.body,
			icon: 'img/fav-72.png'
		};

		self.registration.showNotification(notificationTitle, notificationOptions);
	}
});


self.addEventListener('message', async (event) => {
	console.log('PWA sw message event', event);

	if (event.data.type === 'PAGE_ACTIVE') {
		saveData('PAGE_ACTIVE', event.data.value);
	}
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

	// Check request url from inside domain.
	if (new URL(e.request.url).origin !== location.origin) {
		if (e.request.url != fontUrl){
			return;
		}
	}

	// Check request url http or https
	if (!e.request.url.match(/^(http|https):\/\//i)) return;

	// Show offline page for POST requests
	if (e.request.method !== 'GET') {
		return caches.match(offlinePage);
	}

	return true;
}


// Open IndexedDB database
function openDatabase() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open("SwDatabase", 1);

        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            
            // Create object stores for different types of data
            if (!db.objectStoreNames.contains('SwStore')) {
                db.createObjectStore('SwStore');
            }
        };

        request.onsuccess = (event) => resolve(event.target.result);
        request.onerror = (event) => reject(event.target.error);
    });
}

// Lưu dữ liệu vào cơ sở dữ liệu
async function saveData(key, value) {
	const db = await openDatabase();
    return new Promise((resolve, reject) => {
        
		const transaction = db.transaction('SwStore', 'readwrite');
		const store = transaction.objectStore('SwStore');
		store.put(value, key);

		request.onsuccess = () => resolve(request.result);
		request.onerror = () => reject(request.error);
    });
}

// Lấy dữ liệu từ cơ sở dữ liệu
async function getData(key) {
	const db = await openDatabase();
	
	return new Promise((resolve, reject) => {
		const transaction = db.transaction('SwStore', 'readonly');
		const store = transaction.objectStore('SwStore');
		const request = store.get(key);

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
	})
}