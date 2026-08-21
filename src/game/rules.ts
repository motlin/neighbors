/**
 * What the board says about itself: what each piece has, what it still needs, and whether the
 * whole thing agrees.
 *
 * Nothing here mutates. The board is read, never written, so the same functions serve the played
 * board, the designer's preview and the generator's own check that a shape it built is solvable.
 */

import {around, key, xy} from "./geometry.js";
import {contrib, high, low, unpid} from "./piece.js";
import type {Bag, Board, Key, Piece, Status} from "./types.js";

export function neighbourCount(b: Board, x: number, y: number): number {
	let n = 0;
	for (const [a, c] of around(x, y)) if (b.has(key(a, c))) n++;
	return n;
}

export function neighbourSum(b: Board, x: number, y: number): number {
	let t = 0;
	for (const [a, c] of around(x, y)) {
		const q = b.get(key(a, c));
		if (q) t += contrib(q);
	}
	return t;
}

/** What this piece is counting: a sum adds its neighbours up, everything else counts them. */
const haveFor = (b: Board, x: number, y: number, p: Piece): number =>
	p.k === "s" ? neighbourSum(b, x, y) : neighbourCount(b, x, y);

/** True once something has landed on a side this piece insisted stay empty. */
export function blockedHit(b: Board, x: number, y: number, p: Piece): boolean {
	if (!p.m) return false;
	const nb = around(x, y);
	for (let i = 0; i < 8; i++) {
		const cell = nb[i]!;
		if ((p.m >> i) & 1 && b.has(key(cell[0], cell[1]))) return true;
	}
	return false;
}

/**
 * True when an adjacent piece has closed the side facing this cell, so nothing may be placed here.
 * Direction `i` and `7 - i` are opposites, which is how the cell finds the piece pointing at it.
 */
export function forbiddenAt(b: Board, x: number, y: number): boolean {
	const nb = around(x, y);
	for (let i = 0; i < 8; i++) {
		const cell = nb[i]!;
		const q = b.get(key(cell[0], cell[1]));
		if (q?.m && (q.m >> (7 - i)) & 1) return true;
	}
	return false;
}

/** How many of this piece's own sides are still empty and still allowed to be filled. */
export function openAround(b: Board, x: number, y: number, p: Piece): number {
	const nb = around(x, y);
	let c = 0;
	for (let i = 0; i < 8; i++) {
		const cell = nb[i]!;
		if (!((p.m >> i) & 1) && !b.has(key(cell[0], cell[1]))) c++;
	}
	return c;
}

/** The puzzle is built one piece at a time out from the first, so every placement must touch it. */
export function isLegal(b: Board, x: number, y: number): boolean {
	if (b.has(key(x, y))) return false;
	if (b.size === 0) return true;
	for (const [a, c] of around(x, y)) if (b.has(key(a, c))) return true;
	return false;
}

export interface PlantState {
	/** Whether this plant is working: no clash, and not asked to carry more than its number. */
	ok: boolean;
	/** Whether it is touching another plant, which breaks both. */
	clash: boolean;
	/** How many buildings it has to carry, which is everything touching it that is not a plant. */
	demand: number;
	/** How many of those actually asked for power. A plant serving none of them is idle. */
	serves: number;
}

export interface Power {
	working: ReadonlyMap<Key, PlantState>;
	powered: ReadonlySet<Key>;
}

/**
 * Every piece a plant touches is a building it has to carry; only other plants are exempt. A plant
 * fails if it touches another plant, or if more buildings want carrying than its number allows,
 * and a failed plant powers nothing at all -- not even the ones it could have managed.
 */
export function powerState(b: Board): Power {
	const working = new Map<Key, PlantState>();
	const powered = new Set<Key>();
	for (const [k, p] of b) {
		if (p.k !== "p") continue;
		const [x, y] = xy(k);
		let clash = false;
		let demand = 0;
		let serves = 0;
		for (const [a, c] of around(x, y)) {
			const q = b.get(key(a, c));
			if (!q) continue;
			if (q.k === "p") {
				clash = true;
				continue;
			}
			demand++;
			if (q.k === "e") serves++;
		}
		working.set(k, {ok: !clash && demand <= p.v, clash, demand, serves});
	}
	for (const [k, st] of working) {
		if (!st.ok) continue;
		const [x, y] = xy(k);
		for (const [a, c] of around(x, y)) {
			const nk = key(a, c);
			const q = b.get(nk);
			if (q?.k === "e") powered.add(nk);
		}
	}
	return {working, powered};
}

export interface Remaining {
	/** How many pieces are left to place. */
	n: number;
	/**
	 * Running totals of what the bag could still feed a sum, biggest first: `pre[i]` is the most
	 * `i` more pieces could add. A sum is starved once even the best of them fall short.
	 */
	pre: number[];
	/** How many plants are left, which decides whether an unpowered bolt is still fixable. */
	plants: number;
}

export function remainingOf(bag: Bag): Remaining {
	const contribs: number[] = [];
	let n = 0;
	let plants = 0;
	for (const id in bag) {
		const p = unpid(id);
		for (let i = 0; i < bag[id]!; i++) {
			contribs.push(contrib(p));
			n++;
			if (p.k === "p") plants++;
		}
	}
	contribs.sort((a, b) => b - a);
	const pre = [0];
	for (let i = 0; i < contribs.length; i++) pre.push(pre[i]! + contribs[i]!);
	return {n, pre, plants};
}

/**
 * How a placed piece is doing, given what is left in the bag and who has power.
 *
 * The distinction that matters is `short` against everything else red: `short` means the bag could
 * still fix it, and the red statuses mean nothing can.
 */
export function statusOf(b: Board, x: number, y: number, rem: Remaining, pw: Power): Status {
	const k = key(x, y);
	const p = b.get(k)!;
	if (p.k === "b") return "met";
	if (blockedHit(b, x, y, p)) return "blocked";
	if (p.k === "p") {
		const st = pw.working.get(k)!;
		if (st.clash) return "clash";
		if (st.demand > p.v) return "overload";
		return "met";
	}
	const have = haveFor(b, x, y, p);
	if (have > high(p)) return "over";
	const open = openAround(b, x, y, p);
	const room = Math.min(open, rem.n);
	const maxAdd = p.k === "s" ? rem.pre[room]! : room;
	if (have + maxAdd < low(p)) return "starved";
	if (p.k === "e" && !pw.powered.has(k)) {
		// Only a plant arriving can fix this, and one can only arrive if a side is still open and
		// a plant is still in the bag.
		if (open > 0 && rem.plants > 0) return "short";
		return "unpowered";
	}
	return have >= low(p) && have <= high(p) ? "met" : "short";
}

/** The statuses that no later placement can undo, which is what earns the red fill. */
export const RED: ReadonlySet<Status> = new Set<Status>([
	"over",
	"starved",
	"blocked",
	"clash",
	"overload",
	"unpowered",
]);

/**
 * Whether every piece on the board agrees with its neighbours. An empty board passes, so the
 * caller checks the bag is empty too before calling a puzzle won.
 */
export function solved(b: Board): boolean {
	const pw = powerState(b);
	for (const [k, p] of b) {
		if (p.k === "b") continue;
		const [x, y] = xy(k);
		if (blockedHit(b, x, y, p)) return false;
		if (p.k === "p") {
			if (!pw.working.get(k)!.ok) return false;
			continue;
		}
		const got = haveFor(b, x, y, p);
		if (got < low(p) || got > high(p)) return false;
		if (p.k === "e" && !pw.powered.has(k)) return false;
	}
	return true;
}
