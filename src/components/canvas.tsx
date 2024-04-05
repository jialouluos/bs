import { useEffect, useRef } from 'react';
// import jsonData from '@/assets/json/chengdu.json';
import { MapEngine } from '@/mapEngine/index';
// import { handleRawDataPipeline } from '@/mapEngine/_pipelines/handleRawDatapipeline';

export const Canvas = () => {
	const isInitFinish = useRef(false);
	const mapEngine = useRef<MapEngine | null>(null);

	const init = async (map: MapEngine) => {
		try {
			// const proxy = handleRawDataPipeline().apply();
			// await proxy.handle(jsonData);
			console.log(map);
			// await map.runPipelines([handleRawDataPipeline(jsonData)]);
			map.startRender();
		} catch (err) {
			console.log(err);
		}
	};
	useEffect(() => {
		if (isInitFinish.current) return;
		const map = (mapEngine.current = new MapEngine('#canvas_root'));
		init(map);
		isInitFinish.current = true;
		return () => {
			if (isInitFinish.current) return;
			mapEngine.current && mapEngine.current.dispose();
			mapEngine.current = null;
		};
	}, [mapEngine.current]);
	return (
		<>
			<div
				id='canvas_root'
				style={{ width: '100%', height: '100%' }}></div>
		</>
	);
};
