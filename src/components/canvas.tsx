import { useEffect, useRef, useState } from 'react';

import { MapEngine } from '@/mapEngine/index';
import { handleBuildingPipeline } from '@/mapEngine/_pipelines/handleBuildingPipeline';
import { handleRoutePipeline } from '@/mapEngine/_pipelines/handleRoutePipeline';
import { handleRiverPipeline } from '@/mapEngine/_pipelines/handleRiverPipeline';

import './index.scss';
import { runTaskStream, timeInfoEnd, timeInfoStart } from '@/utils/tools';
import { DataBoard } from './board';
const path = import.meta.env.PROD ? '../json' : '/json';

export const Canvas = () => {
	const isInitFinish = useRef(false);
	const [isLoad, setLoad] = useState(true);

	const [mapState, setMapState] = useState<MapEngine | null>(null);
	const init = async (map: MapEngine) => {
		try {
			// worker
			runTaskStream([
				() => {
					timeInfoStart('城市渲染(all)', '#ff0000');
				},
				// async () => {
				// 	timeInfoStart('处理建筑数据', '#ff0000');
				// 	const cityBuffer = useEncodeBuffer(cityData);
				// 	const cityProxy = handleBuildingPipeline('workerThread', [cityBuffer.buffer]);
				// 	return cityProxy.handle(cityBuffer.buffer).then(buffer => {
				// 		return buffer;
				// 	});
				// },
				async () => {
					timeInfoStart('处理建筑数据', '#ff0000');

					const cityData = (await import(`${path}/上海全城.js`)).default;

					const cityProxy = handleBuildingPipeline('mainThread');
					return cityProxy.handle(cityData).then(buffer => {
						return buffer;
					});
				},
				buffer => {
					const time = timeInfoEnd('处理建筑数据', '#ff0000');
					map.mapRender.emit('dataChange', {
						type: 'cityData',
						data: {
							cityHandleTime: time.toFixed(2),
						},
					});
					return buffer;
					// return useDecodeBuffer(buffer);
				},
				citySources => {
					return map.renderCity(citySources);
				},
				// async () => {
				// 	timeInfoStart('处理道路数据', '#ff0000');
				// 	const routeBuffer = useEncodeBuffer(routeData);
				// 	const routeProxy = handleRoutePipeline('workerThread', [routeBuffer.buffer]);
				// 	return routeProxy.handle(routeBuffer.buffer).then(buffer => buffer);
				// },
				async () => {
					timeInfoStart('处理道路数据', '#ff0000');
					const routeData = (await import(`${path}/路2.js`)).default;
					const routeProxy = handleRoutePipeline('mainThread');
					return routeProxy.handle(routeData).then(buffer => buffer);
				},
				buffer => {
					const time = timeInfoEnd('处理道路数据', '#ff0000');
					map.mapRender.emit('dataChange', {
						type: 'routeData',
						data: {
							routeHandleTime: time.toFixed(2),
						},
					});
					return buffer;
					// return useDecodeBuffer(buffer);
				},
				routeSources => {
					return map.renderRoute(routeSources);
				},
				// async () => {
				// 	timeInfoStart('处理河流数据', '#ff0000');
				// 	const riverBuffer = useEncodeBuffer(riverData);
				// 	const riverProxy = handleRiverPipeline('workerThread', [riverBuffer.buffer]);
				// 	return riverProxy.handle(riverBuffer.buffer).then(buffer => {
				// 		return buffer;
				// 	});
				// },
				// buffer => {
				// 	const time = timeInfoEnd('处理河流数据', '#ff0000');
				// 	map.mapRender.emit('dataChange', {
				// 		type: 'riverData',
				// 		data: {
				// 			riverHandleTime: time.toFixed(2),
				// 		},
				// 	});
				// 	return useDecodeBuffer(buffer);
				// },
				async () => {
					timeInfoStart('处理河流数据', '#ff0000');
					const riverData = (await import(`${path}/黄浦江.js`)).default;
					const riverProxy = handleRiverPipeline('mainThread');
					return riverProxy.handle(riverData).then(buffer => {
						return buffer;
					});
				},
				buffer => {
					const time = timeInfoEnd('处理河流数据', '#ff0000');
					map.mapRender.emit('dataChange', {
						type: 'riverData',
						data: {
							riverHandleTime: time.toFixed(2),
						},
					});
					return buffer;
				},
				riverSources => {
					return map.renderRiver(riverSources);
				},
				() => {
					return map.renderScene();
				},
				() => {
					setLoad(false);

					timeInfoEnd('城市渲染(all)', '#ff0000');
				},
				() => {
					map.startRender();
					setInterval(() => {
						map.eventEngine.loadEvent();
					}, 12000);
				},
			]);
		} catch (err) {
			console.log(err);
		}
	};
	useEffect(() => {
		// if ('serviceWorker' in navigator) {
		// 	navigator.serviceWorker.getRegistrations().then(swList => {
		// 		for (const sw of swList) {
		// 			sw.unregister();
		// 		}
		// 		navigator.serviceWorker.register('/mysw.js', { scope: '/' });
		// 	});
		// }

		if (isInitFinish.current) return;
		setMapState(() => new MapEngine('#canvas_root'));

		isInitFinish.current = true;

		return () => {
			if (isInitFinish.current) return;
		};
	}, []);
	useEffect(() => {
		mapState && init(mapState);
		return () => {
			if (isInitFinish.current) return;
			mapState && mapState.dispose();
			setMapState(null);
		};
	}, [mapState]);
	const LoadFirst = () => {
		return (
			<div className={'load_style_box_1'}>
				<span></span>
				<span></span>
				<span></span>
				<span></span>
				<span></span>
				<span></span>
				<span></span>
				<span></span>
				<span></span>
			</div>
		);
	};
	return (
		<>
			{isLoad ? <LoadFirst /> : null}
			<div
				id='canvas_root'
				style={{ width: '100%', height: '100%' }}></div>
			<DataBoard
				map={mapState}
				initFinish={!isLoad}
			/>
		</>
	);
};
