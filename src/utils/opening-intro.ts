export interface OpeningVisit {
	onHome: boolean;
	enabled: boolean;
	seen: boolean;
	reducedMotion: boolean;
}

export function shouldPlayOpening(visit: OpeningVisit): boolean {
	return (
		visit.onHome && visit.enabled && !visit.seen && !visit.reducedMotion
	);
}
