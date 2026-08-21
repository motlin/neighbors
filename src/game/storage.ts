/**
 * Where the recent puzzles live between visits.
 *
 * The game was authored as a Claude artifact, where the host provided a `window.storage` object.
 * Off that host there is `localStorage`, which is the same idea with a narrower failure mode: it
 * throws rather than returns when the browser has site data switched off, or when the page is in a
 * private window that has run out of room. Every call is wrapped, because a browser that will not
 * remember anything should still play.
 */

export interface Store {
	get: (key: string) => string | null;
	set: (key: string, value: string) => void;
}

export const HISTORY_KEY = "history";

export const browserStore: Store = {
	get(key) {
		try {
			return globalThis.localStorage.getItem(key);
		} catch {
			return null;
		}
	},
	set(key, value) {
		try {
			globalThis.localStorage.setItem(key, value);
		} catch {
			// Nothing to do and nothing to say: the game plays either way.
		}
	},
};

/** A store that remembers nothing, for tests and for Storybook. */
export function memoryStore(initial: Record<string, string> = {}): Store {
	const held = new Map(Object.entries(initial));
	return {
		get: (key) => held.get(key) ?? null,
		set: (key, value) => void held.set(key, value),
	};
}
