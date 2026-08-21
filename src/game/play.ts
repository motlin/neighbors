/**
 * The played puzzle, as a value.
 *
 * Every move here returns a new state, and returns the state it was given, unchanged and by
 * identity, when the move is not allowed. React can then hold one of these in `useState` and the
 * illegal taps cost nothing: setting the same object back is not a render.
 */

import {key} from "./geometry.js";
import {KORDER, pid, unpid} from "./piece.js";
import {isLegal, solved} from "./rules.js";
import type {Bag, Board, Key, Pid} from "./types.js";

export type Origin = "dealt" | "made";

interface Move {
	t: "place" | "erase";
	x: number;
	y: number;
	p: Pid;
}

export interface PlayState {
	/** How many pieces the puzzle was dealt with. */
	pieces: number;
	/** The dealt bag, kept so `restart` can put it all back. */
	start: Pid[];
	bag: Bag;
	board: Board;
	history: Move[];
	/** The cell just placed, which the board animates. */
	just: Key | null;
	sel: Pid | null;
	won: boolean;
	/** Set while the player has pushed the win panel aside to look at the finished board. */
	peek: boolean;
	origin: Origin;
	/** The share code this puzzle came from, if it came from one. */
	code: string;
	/** Which history entry this puzzle is, once it has been solved at least once. */
	histId: string | null;
	/** When the first piece landed. The clock does not start on the deal, so the puzzle can be read. */
	startAt: number;
	finishAt: number;
}

export interface StartOptions {
	origin?: Origin;
	code?: string;
	id?: string | null;
}

export function bagFrom(list: readonly Pid[]): Bag {
	const b: Record<Pid, number> = {};
	for (const p of list) b[p] = (b[p] ?? 0) + 1;
	return b;
}

export function bagLeft(s: PlayState): number {
	let t = 0;
	for (const k in s.bag) t += s.bag[k]!;
	return t;
}

/** The piece the bag offers next: plain, then powered, then sum, then plant, then blank. */
export function firstAvailable(bag: Bag): Pid | null {
	const keys = Object.keys(bag).filter((p) => bag[p]! > 0);
	keys.sort((a, b) => {
		const A = unpid(a);
		const B = unpid(b);
		return KORDER[A.k] - KORDER[B.k] || A.v - B.v || A.m - B.m;
	});
	return keys[0] ?? null;
}

export function startPuzzle(list: readonly Pid[], opt: StartOptions = {}): PlayState {
	const bag = bagFrom(list);
	return {
		pieces: list.length,
		start: list.slice(),
		bag,
		board: new Map(),
		history: [],
		just: null,
		sel: firstAvailable(bag),
		won: false,
		peek: false,
		origin: opt.origin ?? "dealt",
		code: opt.code ?? "",
		histId: opt.id ?? null,
		startAt: 0,
		finishAt: 0,
	};
}

/**
 * A puzzle is won when the bag is empty and the board agrees with itself. `solved` passes an empty
 * board, so the bag is checked first: that is the difference between finished and not yet started.
 */
function settle(s: PlayState, now: number): PlayState {
	if (s.won || bagLeft(s) > 0 || s.board.size === 0 || !solved(s.board)) return s;
	return {...s, won: true, peek: false, finishAt: s.startAt ? now : 0};
}

export function place(s: PlayState, x: number, y: number, now: number): PlayState {
	if (s.won || !s.sel || !s.bag[s.sel]) return s;
	if (!isLegal(s.board, x, y)) return s;
	const board = new Map(s.board);
	board.set(key(x, y), unpid(s.sel));
	const bag = {...s.bag, [s.sel]: s.bag[s.sel]! - 1};
	const next: PlayState = {
		...s,
		board,
		bag,
		history: [...s.history, {t: "place", x, y, p: s.sel}],
		just: key(x, y),
		startAt: s.startAt || now,
		sel: bag[s.sel] ? s.sel : firstAvailable(bag),
	};
	return settle(next, now);
}

export function erase(s: PlayState, x: number, y: number): PlayState {
	const k = key(x, y);
	const piece = s.board.get(k);
	if (s.won || !piece) return s;
	const id = pid(piece);
	const board = new Map(s.board);
	board.delete(k);
	const bag = {...s.bag, [id]: (s.bag[id] ?? 0) + 1};
	return {
		...s,
		board,
		bag,
		history: [...s.history, {t: "erase", x, y, p: id}],
		just: null,
		sel: !s.sel || !s.bag[s.sel] ? id : s.sel,
	};
}

export function undo(s: PlayState): PlayState {
	if (!s.history.length) return s;
	const history = s.history.slice();
	const a = history.pop()!;
	const k = key(a.x, a.y);
	const board = new Map(s.board);
	const bag = {...s.bag};
	if (a.t === "place") {
		board.delete(k);
		bag[a.p] = (bag[a.p] ?? 0) + 1;
	} else {
		board.set(k, unpid(a.p));
		bag[a.p] = bag[a.p]! - 1;
	}
	return {
		...s,
		board,
		bag,
		history,
		sel: bag[a.p] ? a.p : firstAvailable(bag),
		just: null,
		won: false,
		peek: false,
		// Undoing past the winning move puts you back in the puzzle, so the clock runs again from
		// where it was: the start is left alone and only the finish is dropped.
		finishAt: 0,
	};
}

export function restart(s: PlayState): PlayState {
	const bag = bagFrom(s.start);
	return {
		...s,
		bag,
		board: new Map<Key, never>(),
		history: [],
		just: null,
		won: false,
		peek: false,
		sel: firstAvailable(bag),
		startAt: 0,
		finishAt: 0,
	};
}
