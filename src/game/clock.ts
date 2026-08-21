/**
 * The clock. It starts on the first placement rather than on the deal, so the puzzle can be read
 * before it counts; it stops on the solve, and runs again if the win is undone.
 */

export function fmt(ms: number): string {
	const t = Math.max(0, ms | 0);
	const m = Math.floor(t / 60000);
	const s = Math.floor((t % 60000) / 1000);
	const tenth = Math.floor((t % 1000) / 100);
	return `${m}:${String(s).padStart(2, "0")}.${tenth}`;
}

/** How long the puzzle has been going: nothing before the first piece, frozen after the win. */
export function elapsed(startAt: number, finishAt: number, now: number): number {
	if (!startAt) return 0;
	return (finishAt || now) - startAt;
}
