/**
 * The generator's source of randomness, passed in rather than reached for, so a test can hand it a
 * seed and get the same puzzle every time.
 */

export interface Rng {
	/** A float in [0, 1), the shape `Math.random` has. */
	next: () => number;
	/** An integer in [0, n). */
	int: (n: number) => number;
	shuffle: <T>(a: readonly T[]) => T[];
}

function fromFloat(next: () => number): Rng {
	const int = (n: number) => Math.floor(next() * n);
	return {
		next,
		int,
		shuffle: <T>(a: readonly T[]): T[] => {
			const r = a.slice();
			for (let i = r.length - 1; i > 0; i--) {
				const j = int(i + 1);
				[r[i], r[j]] = [r[j]!, r[i]!];
			}
			return r;
		},
	};
}

export const systemRng: Rng = fromFloat(Math.random);

/**
 * A small deterministic generator (mulberry32) for the tests. Not for gameplay: a puzzle dealt
 * from a fixed seed would be the same puzzle every visit.
 */
export function seededRng(seed: number): Rng {
	let a = seed >>> 0;
	return fromFloat(() => {
		a = (a + 0x6d2b79f5) >>> 0;
		let t = a;
		t = Math.imul(t ^ (t >>> 15), t | 1);
		t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	});
}
