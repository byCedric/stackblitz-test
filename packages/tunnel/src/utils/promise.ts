export type PromiseResolve<T> = (value: T | PromiseLike<T>) => void;
export type PromiseReject = (reason?: any) => void;

export function withResolvers<T>(): { resolve: PromiseResolve<T>; reject: PromiseReject; promise: Promise<T> } {
	// @ts-expect-error
	if (typeof Promise.withResolvers === 'function') {
		// @ts-expect-error
		return Promise.withResolvers<T>();
	}

	let resolve!: PromiseResolve<T>;
	let reject!: PromiseReject;

	const promise = new Promise<T>((_resolve, _reject) => {
		resolve = _resolve;
		reject = _reject;
	});

	return {
		resolve,
		reject,
		promise,
	};
}
