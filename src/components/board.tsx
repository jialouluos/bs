import { useCallback, useEffect, useMemo, useState } from 'react';
import { MapEngine } from '../mapEngine/index';
import { DigitalScroll } from './DigitalScroll';
import ReactECharts from 'echarts-for-react';
import { Building } from '@/types';
export const DataBoard = ({ map, initFinish }: { map: MapEngine | null; initFinish: boolean }) => {
	const [data, setData] = useState<any>({});
	const [searchValue, setSearchValue] = useState<any>('');
	const [searchUAVValue, setSearchUAVValue] = useState<any>('');
	useEffect(() => {
		if (!map) return;
		map.mapRender.addListener('dataChange', ev => {
			setData({
				...data,
				...ev.data,
			});
		});
	}, [map, data]);
	const highFilterData = useMemo(() => {
		if (!searchValue) return [];
		return (
			(Array.from(data?.highCityInfo ?? {}) as [number, Building][])
				.map(([_, item]) => {
					return item;
				})
				.filter(item => {
					return item.name.includes(searchValue);
				}) ?? ([] as Building[])
		);
	}, [searchValue, data?.highCityInfo]);
	const UAVFilterData = useMemo(() => {
		if (!searchUAVValue) return [];
		return (
			(data?.uavData ?? [])
				.map((_: any, index: number) => `无人机${index+1}号视角`)
				.filter((item: string) => {
					return item.includes(searchUAVValue);
				}) ?? ([] as Building[])
		);
	}, [searchUAVValue, data?.uavData]);
	return (
		<>
			{initFinish ? (
				<div className={'data-board'}>
					<div className={'top'}>大规模城市三维场景的快速构建与可视化系统设计与开发</div>
					<div className={'body'}>
						<div className={'left'}>
							{[
								{
									label: '建筑数量',
									key: 'cityCount',
									valueFn: (data: Record<string, any>) => {
										return (data?.highCityCount ?? 0) + (data?.normalCityCount ?? 0) + (data?.lowCityCount ?? 0);
									},
								},
								{
									label: '高精建筑数量',
									key: 'highCityCount',
								},
								{
									label: '中精度建筑数量',
									key: 'normalCityCount',
								},
								{
									label: '建筑顶点数量',
									key: 'cityPointCount',
									valueFn: (data: Record<string, any>) => {
										return (
											(data?.highCityPointCount ?? 0) +
											(data?.normalCityPointCount ?? 0) +
											(data?.lowCityPointCount ?? 0)
										);
									},
								},

								{
									label: '地理路线总顶点数量',
									key: 'routePointCount',
								},

								{
									label: '河流数量',
									key: 'riverCount',
								},

								{
									label: '河流顶点数量',
									key: 'riverPointCount',
								},
							].map(item => {
								return (
									<div
										style={{ width: '100%', marginLeft: '20px' }}
										key={item.label}>
										<DigitalScroll
											key={item.label}
											title={item.label + ':'}
											val={item.valueFn ? item.valueFn(data) : data[item.key] ?? 0}
											height={'2rem'}
											width={'0.8rem'}
											time={1}
											charStyle={{
												fontSize: '18px',
												color: '#CFE9DA',
											}}
											containerStyle={{
												margin: '4px',
												borderRadius: '5px',
											}}
											titleStyle={{
												justifyContent: 'flex-end',
												width: '150px',
											}}
											labelStyle={{
												fontSize: '18px',
												color: '#FAB728',
											}}
										/>
									</div>
								);
							})}
							<div style={{ width: '100%', padding: '0px 20px', margin: '20px 0px' }}>
								<input
									onChange={e => {
										setSearchValue(e.target.value);
									}}
									type='text'
									placeholder={'高精度建筑模型搜索'}
									style={{
										boxSizing: 'border-box',
										pointerEvents: 'auto',
										outline: 'none',
										background: 'rgb(16 12 36 / 58%)',
										borderBottom: '1px solid #CFE9DA',
										padding: '10px',
										borderRadius: '5px',
										width: '100%',
										color: '#CFE9DA',
									}}
								/>
								<ul
									style={{
										overflow: 'auto',
										height: '260px',
										pointerEvents: 'auto',
										borderBottom: '1px solid #CFE9DA',
									}}
									onClick={(e: any) => {
										if (e.target.nodeName === 'LI') {
											const info = data?.highCityInfo.get(Number(e.target.accessKey));
											if (info) {
												map?.mapRender.emit('boardMessage', {
													type: 'flyTo',
													info,
												});
											}
										}
									}}>
									{highFilterData.map(item => {
										return (
											<li
												key={item.index}
												accessKey={item.drawIndex + ''}
												style={{
													borderBottom: '1px solid #CFE9DA',
													height: '30px',
													fontSize: '18px',
													textAlign: 'center',
													cursor: 'pointer',
												}}>
												{item.name}
											</li>
										);
									})}
								</ul>
							</div>
							<div style={{ width: '100%', padding: '0px 20px', margin: '20px 0px' }}>
								<input
									onChange={e => {
										setSearchUAVValue(e.target.value);
									}}
									type='text'
									placeholder={'无人机视角搜索'}
									style={{
										boxSizing: 'border-box',
										pointerEvents: 'auto',
										outline: 'none',
										background: 'rgb(16 12 36 / 58%)',
										borderBottom: '1px solid #CFE9DA',
										padding: '10px',
										borderRadius: '5px',
										width: '100%',
										color: '#CFE9DA',
									}}
								/>
								<ul
									style={{
										overflow: 'auto',
										height: '120px',
										pointerEvents: 'auto',
										borderBottom: '1px solid #CFE9DA',
									}}
									onClick={(e: any) => {
										if (e.target.nodeName === 'LI') {
											map?.mapRender.emit('boardMessage', {
												type: 'uavCamera',
												index: Number(e.target.accessKey),
											});
										}
									}}>
									{UAVFilterData.map((item, index: number) => {
										return (
											<li
												key={index + 'uavCamera'}
												accessKey={index + ''}
												style={{
													borderBottom: '1px solid #CFE9DA',
													height: '30px',
													fontSize: '18px',
													textAlign: 'center',
													cursor: 'pointer',
												}}>
												{item}
											</li>
										);
									})}
								</ul>
								<button
									onClick={() => {
										map?.mapRender.emit('boardMessage', {
											type: 'cancelUavCamera',
										});
									}}
									style={{
										margin: '20px 0px',
										padding: '0px 20px',
										border: '1px solid #CFE9DA',
										color: '#fff',
										background: 'rgb(16 12 36 / 58%)',
										width: '100%',
										pointerEvents: 'auto',
										height: '30px',
										fontSize: '18px',
										textAlign: 'center',
										cursor: 'pointer',
										borderRadius: '5px',
									}}>
									{'取消跟随'}
								</button>
							</div>
						</div>
						<div className={'right'}>
							<div style={{ width: '100%', padding: '20px', height: '300px', pointerEvents: 'auto' }}>
								<ReactECharts
									option={{
										tooltip: {
											trigger: 'item',
											formatter: '{b}: {c}ms ({d}%)',
										},
										title: {
											text: '加载时间分布图',
											left: 'center',
											textStyle: {
												//文字颜色
												color: '#ccc',
												//字体风格,'normal','italic','oblique'
												fontStyle: 'normal',
												//字体粗细 'normal','bold','bolder','lighter',100 | 200 | 300 | 400...
												fontWeight: 'bold',
												//字体系列
												fontFamily: 'sans-serif',
												//字体大小
												fontSize: 18,
											},
										},
										series: [
											{
												name: 'time table',
												type: 'pie',

												radius: ['45%', '60%'],
												data: [
													{ value: data['cityHandleTime'], name: '建筑数据处理' },
													{ value: data['lowCityBuildTime'], name: 'low级建筑构建' },
													{ value: data['normalCityBuildTime'], name: 'normal级建筑构建' },
													{ value: data['highCityBuildTime'], name: 'high级建筑构建' },
													{ value: data['routeHandleTime'], name: '道路数据处理' },
													{ value: data['routeBuildTime'], name: `道路构建` },
													{ value: data['riverHandleTime'], name: '河流数据处理' },
													{ value: data['riverBuildTime'], name: '河流构建' },
													{ value: data['envRenderTime'], name: '环境渲染' },
												],
												emphasis: {
													itemStyle: {
														shadowBlur: 10,
														shadowOffsetX: 0,
														shadowColor: 'rgba(0, 0, 0, 0.5)',
													},
												},
											},
											{
												name: 'city build table',
												type: 'pie',
												radius: [0, '30%'],
												data: [
													{ value: Number(data['cityBuildTime']) + Number(data['cityHandleTime']), name: '建筑渲染' },
													{ value: Number(data['routeHandleTime']) + Number(data['routeBuildTime']), name: '道路渲染' },
													{ value: Number(data['riverHandleTime']) + Number(data['riverBuildTime']), name: '河流渲染' },
													{ value: Number(data['envRenderTime']), name: '环境渲染' },
												],
												emphasis: {
													itemStyle: {
														shadowBlur: 10,
														shadowOffsetX: 0,
														shadowColor: 'rgba(0, 0, 0, 0.5)',
													},
												},
											},
										],
									}}
								/>
							</div>
							<div style={{ width: '100%', padding: '20px', height: '300px', pointerEvents: 'auto' }}>
								<ReactECharts
									option={{
										tooltip: {
											trigger: 'item',
											formatter: '{b}: {c} ({d}%)',
										},
										title: {
											text: '网格顶点分布图',
											left: 'center',

											textStyle: {
												//文字颜色
												color: '#ccc',
												//字体风格,'normal','italic','oblique'
												fontStyle: 'normal',
												//字体粗细 'normal','bold','bolder','lighter',100 | 200 | 300 | 400...
												fontWeight: 'bold',
												//字体系列
												fontFamily: 'sans-serif',
												//字体大小
												fontSize: 18,
											},
										},
										series: [
											{
												name: 'time table',
												type: 'pie',

												radius: ['45%', '60%'],
												data: [
													{ value: data['lowCityPointCount'], name: 'low级建筑网格顶点' },
													{ value: data['normalCityPointCount'], name: 'normal级建筑网格顶点' },
													{ value: data['highCityPointCount'], name: 'high级建筑网格顶点' },
													{ value: data['routePointCount'], name: '道路网格顶点' },
													{ value: data['riverPointCount'], name: `河流网格顶点` },
												],
												emphasis: {
													itemStyle: {
														shadowBlur: 10,
														shadowOffsetX: 0,
														shadowColor: 'rgba(224, 213, 213, 0.5)',
													},
												},
											},
											{
												name: 'mesh table',
												type: 'pie',
												radius: [0, '30%'],
												data: [
													{
														value:
															Number(data['lowCityPointCount']) +
															Number(data['normalCityPointCount']) +
															Number(data['highCityPointCount']),
														name: '建筑网格顶点数量',
													},
													{
														value: Number(data['routePointCount']),
														name: '道路网格顶点数量',
													},
													{
														value: Number(data['riverPointCount']),
														name: '河流网格顶点数量',
													},
												],
												emphasis: {
													itemStyle: {
														shadowBlur: 10,
														shadowOffsetX: 0,
														shadowColor: 'rgba(0, 0, 0, 0.5)',
													},
												},
											},
										],
									}}
								/>
							</div>
						</div>
					</div>
				</div>
			) : null}
		</>
	);
};
