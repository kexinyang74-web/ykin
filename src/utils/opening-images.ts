/** Wait for decoding, failure or a deadline. Cancellation must never open a late scene. */
export async function prepareOpeningImages(
	sources: readonly string[],
	timeoutMs: number,
	signal: AbortSignal,
): Promise<string[]> {
	const results = await Promise.all(
		sources.map(
			(source) =>
				new Promise<string | null>((resolve) => {
					if (signal.aborted) {
						resolve(source);
						return;
					}
					const image = new Image();
					let settled = false;
					const finish = (loaded: boolean) => {
						if (settled) return;
						settled = true;
						clearTimeout(timer);
						signal.removeEventListener("abort", abort);
						image.onload = null;
						image.onerror = null;
						resolve(loaded ? null : source);
					};
					const abort = () => finish(false);
					const timer = setTimeout(() => finish(false), timeoutMs);
					signal.addEventListener("abort", abort, { once: true });
					image.onload = () => {
						void image.decode().then(() => finish(true), () => finish(false));
					};
					image.onerror = () => finish(false);
					image.src = source;
				}),
		),
	);
	return results.filter((source): source is string => source !== null);
}
