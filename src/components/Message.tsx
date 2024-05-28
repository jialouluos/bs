import { Root, createRoot } from 'react-dom/client';
import style from './index.scss';
import React, { useState, useImperativeHandle, Ref } from 'react';
interface IProps {
	text: React.ReactElement | string;
	duration?: number;
	type: MessageType;
}
enum MessageType {
	SUCCESS = 'success',
	ERROR = 'error',
	INFO = 'info',
	WARNING = 'warning',
}
const styleEnum = {
	[MessageType.SUCCESS]: 'msg_success',
	[MessageType.ERROR]: 'msg_error',
	[MessageType.INFO]: 'msg_info',
	[MessageType.WARNING]: 'msg_warning',
};

let rootRef: Root | null = null;
class Task {
	el: React.ReactElement | null = null;
	disposed: boolean = false;
	ref = React.createRef<HTMLElement & { setShow: React.Dispatch<React.SetStateAction<boolean>> }>();
	constructor(private type: MessageType, private options: Omit<IProps, 'type'>) {}
	handleOnClick!: () => void;
	render() {
		if (this.disposed) return <></>;
		if (this.el) return this.el;
		setTimeout(() => {
			this.dispose();
		}, this.options.duration ?? 3000);
		this.el = (
			<Modal
				onRef={this.ref}
				type={this.type}
				text={this.options.text}
				onAnimationEnd={show => this.onAnimationEnd(show)}
				key={Math.random().toString()}
			/>
		);
		return this.el;
	}
	onAnimationEnd(show: boolean) {
		if (show) return;
		this.disposed = true;
		this.el = null;
		renderList();
	}
	dispose() {
		this.ref.current && this.ref.current.setShow(false);
	}
}

const Modal = ({
	text,
	type,
	onRef,
	onAnimationEnd,
}: IProps & { onRef: Ref<unknown> | undefined; onAnimationEnd: (show: boolean) => void }) => {
	const [show, setShow] = useState(true);
	useImperativeHandle(onRef, () => {
		return {
			setShow,
		};
	});
	return (
		<div
			className={`message_modal ${styleEnum[type]} ${show ? 'show' : 'hidden'}`}
			onAnimationEnd={() => onAnimationEnd(show)}>
			<span>{text}</span>
		</div>
	);
};

let taskQueue: Task[] = [];

const renderList = () => {
	if (!rootRef) return;

	taskQueue = taskQueue.filter(item => {
		return !item.disposed;
	});

	const MsgList = (
		<>
			{taskQueue.map(item => {
				return item.render();
			})}
		</>
	);

	rootRef.render(MsgList);
};
const create = (type: MessageType, options: Omit<IProps, 'type'> | string) => {
	if (typeof window === 'undefined') {
		if (typeof options === 'string') {
			return console.log(options);
		} else {
			return console.log(options?.text);
		}
	}

	if (!rootRef) {
		const div = document.createElement('div');
		document.body.appendChild(div);
		div.classList.add('msg_root');
		rootRef = createRoot(div);
	}

	if (typeof options === 'string') {
		taskQueue.push(
			new Task(type, {
				text: options,
			})
		);
	} else {
		taskQueue.push(new Task(type, options));
	}

	renderList();
};

export const message = {
	[MessageType.SUCCESS]: (options: Omit<IProps, 'type'> | string) => create(MessageType.SUCCESS, options),
	[MessageType.ERROR]: (options: Omit<IProps, 'type'> | string) => create(MessageType.ERROR, options),
	[MessageType.INFO]: (options: Omit<IProps, 'type'> | string) => create(MessageType.INFO, options),
	[MessageType.WARNING]: (options: Omit<IProps, 'type'> | string) => create(MessageType.WARNING, options),
};
