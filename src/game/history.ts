/**
 * Recent puzzles.
 *
 * Nothing is logged until a puzzle is actually cleared, so the list is a record of what was solved
 * rather than of what was dealt. Each entry keeps the bag it was solved from, which is enough to
 * deal exactly that puzzle again.
 */

import type {Origin} from "./play.js";
import type {Kind, Pid} from "./types.js";

export const HIST_MAX = 20;

export interface HistoryEntry {
	id: string;
	/** How many pieces it had, shown big on the row. */
	n: number;
	bag: Pid[];
	origin: Origin;
	/** The share code, when the puzzle came from one. */
	code: string;
	/** How many of each kind, so the row can say "2 plants" without unpacking the bag again. */
	tally: Partial<Record<Kind, number>>;
	solved: true;
	/** The fastest solve so far, in milliseconds. */
	best?: number;
}

/** A bag saved by an old version wrote plain numbers, before pieces had kinds. */
function normalizeBag(b: unknown): Pid[] | null {
	if (!Array.isArray(b)) return null;
	const out = b.map((x) => (typeof x === "number" ? `n${x}` : String(x)));
	return out.length && out.every((p) => /^[nsbpe]\d+(~\d+)?(\.\d+)?$/.test(p)) ? out : null;
}

function tallyOf(bag: readonly Pid[]): Partial<Record<Kind, number>> {
	const t: Partial<Record<Kind, number>> = {};
	for (const p of bag) {
		const k = p[0] as Kind;
		t[k] = (t[k] ?? 0) + 1;
	}
	return t;
}

/**
 * What comes back out of storage is whatever the browser held: an older version's shape, a
 * half-written value, or nothing. Anything unreadable becomes an empty list rather than an error.
 */
export function parseHistory(raw: string | null): HistoryEntry[] {
	if (!raw) return [];
	let parsed: unknown;
	try {
		parsed = JSON.parse(raw);
	} catch {
		return [];
	}
	if (!Array.isArray(parsed)) return [];
	const out: HistoryEntry[] = [];
	for (const e of parsed) {
		if (!e || typeof e !== "object") continue;
		const entry = e as Partial<HistoryEntry> & {bag?: unknown};
		const bag = normalizeBag(entry.bag);
		if (!bag || entry.solved !== true || typeof entry.id !== "string") continue;
		out.push({
			id: entry.id,
			n: bag.length,
			bag,
			origin: entry.origin === "made" ? "made" : "dealt",
			code: typeof entry.code === "string" ? entry.code : "",
			tally: entry.tally ?? tallyOf(bag),
			solved: true,
			...(typeof entry.best === "number" ? {best: entry.best} : {}),
		});
	}
	return out;
}

export const serializeHistory = (list: readonly HistoryEntry[]): string => JSON.stringify(list.slice(0, HIST_MAX));

export interface SolveInput {
	bag: readonly Pid[];
	origin: Origin;
	code: string;
	/** Which entry this puzzle already is, when it has been solved before. */
	histId: string | null;
}

export interface SolveResult {
	history: HistoryEntry[];
	/** The entry this solve belongs to, which the puzzle holds on to for its next solve. */
	id: string;
	/** The best time before this solve, for the win panel to compare against. */
	prevBest: number;
	newBest: boolean;
}

/**
 * Log a solve. A puzzle solved again keeps its entry, moves back to the top of the list and keeps
 * the faster of the two times; the first solve of a puzzle makes a new entry.
 */
export function recordSolve(history: readonly HistoryEntry[], s: SolveInput, ms: number, newId: string): SolveResult {
	const found = history.find((h) => h.id === s.histId);
	if (found) {
		const prevBest = found.best ?? 0;
		const best = ms && (!found.best || ms < found.best) ? ms : found.best;
		const moved: HistoryEntry = {...found, solved: true, ...(best ? {best} : {})};
		return {
			history: [moved, ...history.filter((h) => h.id !== found.id)].slice(0, HIST_MAX),
			id: moved.id,
			prevBest,
			// A first time is not a new best: there was nothing to beat.
			newBest: Boolean(prevBest && ms && ms < prevBest),
		};
	}
	const entry: HistoryEntry = {
		id: newId,
		n: s.bag.length,
		bag: [...s.bag],
		origin: s.origin,
		code: s.code,
		tally: tallyOf(s.bag),
		solved: true,
		...(ms ? {best: ms} : {}),
	};
	return {
		history: [entry, ...history].slice(0, HIST_MAX),
		id: entry.id,
		prevBest: 0,
		newBest: false,
	};
}

export const removeEntry = (history: readonly HistoryEntry[], id: string): HistoryEntry[] =>
	history.filter((h) => h.id !== id);
