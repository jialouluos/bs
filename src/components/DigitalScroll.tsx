import { useEffect, useMemo, useRef } from 'react';

export const DigitalScroll = ({
	val,
	height,
	width,
	time,
	labelStyle,
	containerStyle,
	titleStyle,
	title,
	charStyle,
}: {
	val: number;
	height: string;
	width: string;
	time: number;
	charStyle?: React.CSSProperties;
	labelStyle?: React.CSSProperties;
	titleStyle?: React.CSSProperties;
	containerStyle?: React.CSSProperties;
	title?: string;
}) => {
	const N2S = (num: number) => {
		let numStr = num.toString();
		if (!numStr.includes('.')) numStr += '.';
		return numStr.replace(/(\d)(?=(\d{3})+\.)/g, '$1,').replace(/\.$/, '');
	};
	const str = N2S(val ?? 0).split('');
	return (
		<div style={{ width: 'max-content', display: 'flex' }}>
			<span style={{ display: 'flex', alignItems: 'center', marginRight: '4px', ...(titleStyle ?? {}) }}> {title}</span>

			{str.map((item, index) => {
				return Number.isNaN(Number(item)) ? (
					<ExtraChar
						val={item}
						key={index}
						height={height}
						width={width}
						labelStyle={charStyle}
						containerStyle={containerStyle}
					/>
				) : (
					<ScrollNumber
						key={index}
						val={Number(item)}
						height={height}
						width={width}
						time={time}
						labelStyle={labelStyle}
						containerStyle={containerStyle}
					/>
				);
			})}
		</div>
	);
};
const ExtraChar = ({
	val,
	height,

	labelStyle,
	containerStyle,
}: {
	val: string;
	height: string;
	width: string;

	labelStyle?: React.CSSProperties;
	containerStyle?: React.CSSProperties;
}) => {
	return (
		<div
			style={{
				overflow: 'hidden',
				...(containerStyle ?? {}),
				height: height,
			}}>
			<div
				style={{
					display: 'flex',
					alignItems: 'flex-start',
					justifyContent: 'flex-start',
				}}>
				<span
					style={{
						display: 'flex',
						justifyContent: 'center',
						alignItems: 'center',
						userSelect: 'none',
						...(labelStyle ?? {}),
						height,
					}}>
					{val}
				</span>
			</div>
		</div>
	);
};
const ScrollNumber = ({
	val,
	height,
	width,
	time,
	labelStyle,
	containerStyle,
}: {
	val: number;
	height: string;
	width: string;
	time: number;
	labelStyle?: React.CSSProperties;
	containerStyle?: React.CSSProperties;
}) => {
	const ref = useRef<HTMLDivElement>(null);
	useEffect(() => {
		setTimeout(() => {
			//创建时也需要数字滚动
			if (ref.current) {
				ref.current.style.transform = `translateY(calc(${-val} * ${height})
				)`;
			}
		});
	}, [val, height]);

	const NumberSpan = useMemo(() => {
		return Array.from({ length: 10 }).map((_, index) => (
			<span
				key={index}
				style={{
					display: 'flex',
					justifyContent: 'center',
					alignItems: 'center',
					userSelect: 'none',
					...(labelStyle ?? {}),
					width,
					height,
				}}>
				{index}
			</span>
		));
	}, [height, width, labelStyle]);

	return (
		<div
			style={{
				overflow: 'hidden',
				...(containerStyle ?? {}),
				height: height,
			}}>
			<div
				ref={ref}
				style={{
					display: 'flex',
					alignItems: 'flex-start',
					justifyContent: 'flex-start',
					flexDirection: 'column',
					transition: `transform ${time}s`,
				}}>
				{NumberSpan}
			</div>
		</div>
	);
};
