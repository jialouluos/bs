import { useState } from 'react';
import { useWebWorker } from '../hooks/useWebWorker';

export const UseWebWorkerDemo = () => {
	const [proxy, _] = useState(() =>
		useWebWorker(() => {
			return {
				name: 'hello worker',
				handleSomeData: (data: any) => {
					console.log(data);
					return { tag: '我是新数据被返回了' };
				},
			};
		})
	);
	const run = async () => {
		console.log(await proxy.name);
		console.log(await proxy.handleSomeData({ tag: '我是老数据' }));
	};

	return (
		<>
			<button onClick={() => run()}>点击我开始工作</button>
		</>
	);
};
