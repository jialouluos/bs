const CACHE_NAME = 'harver_bs_version_' + 5;

const cacheList = ['https://unpkg.com/comlink/dist/umd/comlink.js', 'https://www.bs.harver.cn/json/上海全城.js'];
const tacticRules = [
	{
		name: 'image',
		tacticType: 'cacheFirst',
	},
	{
		name: 'style',
		tacticType: 'networkFirst',
	},
	{
		name: 'script',
		tacticType: 'networkFirst',
	},
	{
		name: 'document',
		tacticType: 'networkFirst',
	},
	{
		name: 'manifest',
		tacticType: 'networkFirst',
	},
];
self.addEventListener('install', e => {
	e.waitUntil(
		(async () => {
			const cache = await caches.open(CACHE_NAME); // 创建一个缓存空间
			await cache.addAll(cacheList);
			await self.skipWaiting();
		})()
	);
});
self.addEventListener('activate', e => {
	e.waitUntil(
		(async () => {
			const keys = await caches.keys();
			await Promise.all(
				keys.map(key => {
					if (key !== CACHE_NAME) return caches.delete(key);
					return;
				})
			);
			await self.clients.claim();
		})()
	);
});
const cacheFirstHandle = async request => {
	const cache = await caches.open(CACHE_NAME);
	const responseCache = await cache.match(request);
	if (responseCache) return responseCache;
	return fetch(request.clone())
		.then(async res => {
			if (res.status === 200) {
				const cloneRes = res.clone();
				caches.open(CACHE_NAME).then(async cache => {
					await cache.put(request, cloneRes);
				});
			}
			return res;
		})
		.catch(err => {
			console.log('资源加载失败:', request.url, err?.message);
			return err;
		});
};
const cacheOnlyHandle = async request => {
	const cache = await caches.open(CACHE_NAME);
	return await cache.match(request);
};
const networkFirstHandle = async request => {
	return fetch(request.clone())
		.then(async res => {
			if (res.status === 200) {
				const cloneRes = res.clone();
				caches.open(CACHE_NAME).then(async cache => {
					await cache.put(request, cloneRes);
				});
				return res;
			} else {
				const cacheResponse = await cacheOnlyHandle(request.clone());
				if (cacheResponse) return cacheResponse;
			}
			return res;
		})
		.catch(async err => {
			console.log('资源加载失败:', request.url, err?.message);
			const cacheResponse = await cacheOnlyHandle(request.clone());
			if (cacheResponse) return cacheResponse;
			return err;
		});
};
self.addEventListener('fetch', e => {
	const tactic = tacticRules.find(tactic => tactic.name === e.request.destination);
	const isInCacheList = cacheList.includes(e.request.url);
	if (tactic || isInCacheList) {
		e.respondWith(
			(async () => {
				if (isInCacheList) {
					return cacheFirstHandle(e.request);
				} else if (tactic.tacticType === 'networkFirst') {
					return networkFirstHandle(e.request);
				} else if (tactic.tacticType === 'cacheFirst') {
					return cacheFirstHandle(e.request);
				} else if (tactic.tacticType === 'cacheOnly') {
					return cacheOnlyHandle(e.request);
				}
			})()
		);
	}
});
