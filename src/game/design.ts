/**
 * The level designer, as a value.
 *
 * A design is a shape plus what each cell of it is: nothing here stores a number. Numbers are read
 * off the shape by `labelShape` whenever the design is drawn or played, so a cell's number keeps
 * up while the shape around it is still being drawn.
 *
 * Like `play.ts`, every move returns a new state and returns the old one by identity when the move
 * is refused.
 */

import {around, connectedCount, key, xy} from "./geometry.js";
import {decodeCode, encodeSet} from "./codes.js";
import {labelShape, MAX_PIECES, MIN_PIECES} from "./generate.js";
import {pid} from "./piece.js";
import {powerState} from "./rules.js";
import type {Kind, Key, Pid} from "./types.js";

/** What a cell was before it was erased, so undo can put it back whole. */
interface Erased {
	k: Key;
	kind: Kind;
	mask: number;
	range: [number, number] | null;
}

type DesignMove =
	| {t: "draw"; cells: Key[]; cleared: [Key, number][]}
	| {t: "erase"; removed: Erased[]}
	| {t: "kind"; key: Key; kind: Kind; mask: number; range: [number, number] | null}
	| {t: "side"; key: Key; prev: number}
	| {t: "range"; key: Key; prev: [number, number] | null};

export interface DesignState {
	shape: ReadonlySet<Key>;
	kinds: ReadonlyMap<Key, Kind>;
	masks: ReadonlyMap<Key, number>;
	ranges: ReadonlyMap<Key, [number, number]>;
	history: readonly DesignMove[];
	/** The cell the type and sides pickers are pointed at. */
	sel: Key | null;
	/** Open while a finger is down: which cells this stroke has already visited, and what it does. */
	stroke: {mode: "draw" | "erase"; seen: ReadonlySet<Key>} | null;
}

export function emptyDesign(): DesignState {
	return {
		shape: new Set(),
		kinds: new Map(),
		masks: new Map(),
		ranges: new Map(),
		history: [],
		sel: null,
		stroke: null,
	};
}

export const kindAt = (s: DesignState, k: Key): Kind => s.kinds.get(k) ?? "n";

/** The shape has to be buildable a cell at a time, so every cell must touch what is drawn. */
export function shapeLegal(s: DesignState, x: number, y: number): boolean {
	if (s.shape.has(key(x, y))) return false;
	if (s.shape.size === 0) return true;
	for (const [a, b] of around(x, y)) if (s.shape.has(key(a, b))) return true;
	return false;
}

/** True when a neighbour has closed the side facing this cell, so it must stay empty. */
export function designForbidden(s: DesignState, x: number, y: number): boolean {
	const nb = around(x, y);
	for (let i = 0; i < 8; i++) {
		const cell = nb[i]!;
		const k = key(cell[0], cell[1]);
		if (s.shape.has(k) && ((s.masks.get(k) ?? 0) >> (7 - i)) & 1) return true;
	}
	return false;
}

/**
 * Drawing into a side someone closed off would contradict the design, so that X is dropped rather
 * than left broken. What was dropped rides along in the undo entry.
 */
function clearSidesPointingAt(masks: Map<Key, number>, x: number, y: number): [Key, number][] {
	const cleared: [Key, number][] = [];
	const nb = around(x, y);
	for (let i = 0; i < 8; i++) {
		const cell = nb[i]!;
		const nk = key(cell[0], cell[1]);
		const m = masks.get(nk);
		if (m === undefined) continue;
		const back = 7 - i;
		if ((m >> back) & 1) {
			cleared.push([nk, m]);
			const nm = m & ~(1 << back);
			if (nm) masks.set(nk, nm);
			else masks.delete(nk);
		}
	}
	return cleared;
}

/** The share code for the design as it stands, which the panel shows and the Copy button copies. */
export const designCode = (s: DesignState): string => encodeSet(s.shape, s.kinds, s.masks, s.ranges);

/** The pieces this design would deal, in the order `labelShape` walks the shape. */
export const designBag = (s: DesignState): Pid[] =>
	[...labelShape(s.shape, s.kinds, s.masks, s.ranges).values()].map(pid);

export function select(s: DesignState, x: number, y: number): DesignState {
	const k = key(x, y);
	if (!s.shape.has(k) || s.sel === k) return s;
	return {...s, sel: k};
}

/**
 * A stroke starts on a cell and paints until the finger comes up. Whether it draws or erases is
 * decided once, by what was under the finger when it went down, so dragging across the shape does
 * not flip between adding and removing.
 */
export function strokeStart(s: DesignState, x: number, y: number): DesignState {
	const mode = s.shape.has(key(x, y)) ? "erase" : "draw";
	const opened: DesignState = {
		...s,
		stroke: {mode, seen: new Set()},
		history: [...s.history, mode === "draw" ? {t: "draw", cells: [], cleared: []} : {t: "erase", removed: []}],
	};
	return strokePaint(opened, x, y);
}

export function strokePaint(s: DesignState, x: number, y: number): DesignState {
	if (!s.stroke) return s;
	const k = key(x, y);
	if (s.stroke.seen.has(k)) return s;
	const seen = new Set(s.stroke.seen).add(k);
	const move = s.history[s.history.length - 1]!;

	if (s.stroke.mode === "draw") {
		if (!shapeLegal(s, x, y) || move.t !== "draw") return {...s, stroke: {...s.stroke, seen}};
		const masks = new Map(s.masks);
		const cleared = clearSidesPointingAt(masks, x, y);
		const shape = new Set(s.shape).add(k);
		return {
			...s,
			shape,
			masks,
			stroke: {...s.stroke, seen},
			history: [
				...s.history.slice(0, -1),
				{t: "draw", cells: [...move.cells, k], cleared: [...move.cleared, ...cleared]},
			],
		};
	}

	if (!s.shape.has(k) || move.t !== "erase") return {...s, stroke: {...s.stroke, seen}};
	const shape = new Set(s.shape);
	shape.delete(k);
	const kinds = new Map(s.kinds);
	const masks = new Map(s.masks);
	const ranges = new Map(s.ranges);
	const removed: Erased = {
		k,
		kind: kindAt(s, k),
		mask: s.masks.get(k) ?? 0,
		range: s.ranges.get(k) ?? null,
	};
	kinds.delete(k);
	masks.delete(k);
	ranges.delete(k);
	return {
		...s,
		shape,
		kinds,
		masks,
		ranges,
		sel: s.sel === k ? null : s.sel,
		stroke: {...s.stroke, seen},
		history: [...s.history.slice(0, -1), {t: "erase", removed: [...move.removed, removed]}],
	};
}

/** Close the stroke. A stroke that touched nothing leaves no undo step behind. */
export function strokeEnd(s: DesignState): DesignState {
	if (!s.stroke) return s;
	const move = s.history[s.history.length - 1];
	const empty = !move || (move.t === "draw" ? !move.cells.length : move.t === "erase" && !move.removed.length);
	return {...s, stroke: null, history: empty ? s.history.slice(0, -1) : s.history};
}

/** Why this kind cannot go on this cell, or null if it can. */
export function kindBlocked(s: DesignState, k: Key, kind: Kind): string | null {
	const [x, y] = xy(k);
	if (kind === "s" && around(x, y).some(([a, b]) => s.shape.has(key(a, b)) && kindAt(s, key(a, b)) === "s")) {
		return "Two sum buildings can’t touch each other";
	}
	if (kind === "p" && around(x, y).some(([a, b]) => s.shape.has(key(a, b)) && kindAt(s, key(a, b)) === "p")) {
		return "Power plants can’t touch each other";
	}
	return null;
}

export function setKind(s: DesignState, kind: Kind): DesignState {
	if (!s.sel || !s.shape.has(s.sel)) return s;
	if (kindBlocked(s, s.sel, kind)) return s;
	const was = kindAt(s, s.sel);
	if (was === kind) return s;
	const kinds = new Map(s.kinds);
	kinds.set(s.sel, kind);
	const masks = new Map(s.masks);
	const ranges = new Map(s.ranges);
	const wasMask = s.masks.get(s.sel) ?? 0;
	const wasRange = s.ranges.get(s.sel) ?? null;
	// A blank and a plant have neither sides to close nor a range to widen.
	if (kind === "b" || kind === "p") {
		masks.delete(s.sel);
		ranges.delete(s.sel);
	}
	return {
		...s,
		kinds,
		masks,
		ranges,
		history: [...s.history, {t: "kind", key: s.sel, kind: was, mask: wasMask, range: wasRange}],
	};
}

export function toggleSide(s: DesignState, dir: number): DesignState {
	if (!s.sel) return s;
	const kind = kindAt(s, s.sel);
	if (kind === "b" || kind === "p") return s;
	const [x, y] = xy(s.sel);
	const cell = around(x, y)[dir]!;
	// A side with something on it is not a side that can be insisted stay empty.
	if (s.shape.has(key(cell[0], cell[1]))) return s;
	const m = s.masks.get(s.sel) ?? 0;
	const nm = m ^ (1 << dir);
	const masks = new Map(s.masks);
	if (nm) masks.set(s.sel, nm);
	else masks.delete(s.sel);
	return {...s, masks, history: [...s.history, {t: "side", key: s.sel, prev: m}]};
}

/** How far a range may open either side of the number the shape gives the cell. */
const RANGE_MAX = 4;

export function nudgeRange(s: DesignState, end: "d" | "u", by: number): DesignState {
	if (!s.sel || !s.shape.has(s.sel)) return s;
	const kind = kindAt(s, s.sel);
	if (kind === "b" || kind === "p") return s;
	const was = s.ranges.get(s.sel) ?? null;
	const r: [number, number] = was ? [was[0], was[1]] : [0, 0];
	const i = end === "d" ? 0 : 1;
	r[i] = Math.max(0, Math.min(RANGE_MAX, r[i] + by));
	if (was ? r[0] === was[0] && r[1] === was[1] : !r[0] && !r[1]) return s;
	const ranges = new Map(s.ranges);
	if (!r[0] && !r[1]) ranges.delete(s.sel);
	else ranges.set(s.sel, r);
	return {...s, ranges, history: [...s.history, {t: "range", key: s.sel, prev: was}]};
}

export function undoDesign(s: DesignState): DesignState {
	if (!s.history.length) return s;
	const history = s.history.slice();
	const a = history.pop()!;
	const shape = new Set(s.shape);
	const kinds = new Map(s.kinds);
	const masks = new Map(s.masks);
	const ranges = new Map(s.ranges);
	if (a.t === "draw") {
		for (const k of a.cells) {
			shape.delete(k);
			kinds.delete(k);
			masks.delete(k);
			ranges.delete(k);
		}
		for (const [k, m] of a.cleared) masks.set(k, m);
	} else if (a.t === "erase") {
		for (const r of a.removed) {
			shape.add(r.k);
			if (r.kind !== "n") kinds.set(r.k, r.kind);
			if (r.mask) masks.set(r.k, r.mask);
			if (r.range) ranges.set(r.k, r.range);
		}
	} else if (a.t === "kind") {
		if (a.kind === "n") kinds.delete(a.key);
		else kinds.set(a.key, a.kind);
		if (a.mask) masks.set(a.key, a.mask);
		else masks.delete(a.key);
		if (a.range) ranges.set(a.key, a.range);
		else ranges.delete(a.key);
	} else if (a.t === "side") {
		if (a.prev) masks.set(a.key, a.prev);
		else masks.delete(a.key);
	} else {
		if (a.prev) ranges.set(a.key, a.prev);
		else ranges.delete(a.key);
	}
	const sel = s.sel && shape.has(s.sel) ? s.sel : null;
	return {...s, shape, kinds, masks, ranges, history, sel};
}

export function clearDesign(s: DesignState): DesignState {
	return {...emptyDesign(), stroke: s.stroke};
}

/** Read a pasted share code into a fresh design, or null if the code is not one. */
export function loadDesign(s: DesignState, code: string): DesignState | null {
	const d = decodeCode(code);
	if (!d?.set.size) return null;
	const kinds = new Map<Key, Kind>();
	for (const [k, v] of d.kinds) if (v !== "n") kinds.set(k, v);
	return {
		...clearDesign(s),
		shape: d.set,
		kinds,
		masks: d.masks,
		ranges: d.ranges,
	};
}

export type DesignStatus =
	| {ok: false; reason: "empty"}
	| {ok: false; reason: "split"; n: number; parts: number}
	| {ok: false; reason: "tooFew"; n: number}
	| {ok: false; reason: "tooMany"; n: number}
	| {ok: false; reason: "idlePlants"; idle: number}
	| {ok: true; buildings: number; plants: number};

/**
 * Whether the design can be played, and what stands in the way if not. The reasons come back
 * structured rather than as a sentence, so the panel decides the wording and the tests do not
 * depend on it.
 */
export function designStatus(s: DesignState): DesignStatus {
	const n = s.shape.size;
	if (n === 0) return {ok: false, reason: "empty"};
	const parts = connectedCount(s.shape);
	if (parts > 1) return {ok: false, reason: "split", n, parts};
	if (n < MIN_PIECES) return {ok: false, reason: "tooFew", n};
	if (n > MAX_PIECES) return {ok: false, reason: "tooMany", n};
	const labels = labelShape(s.shape, s.kinds, s.masks, s.ranges);
	const pw = powerState(labels);
	// A plant with nothing to power sits satisfied whatever the player does, so it is not a puzzle.
	const idle = [...pw.working.values()].filter((st) => st.serves === 0).length;
	if (idle) return {ok: false, reason: "idlePlants", idle};
	let plants = 0;
	for (const p of labels.values()) if (p.k === "p") plants++;
	return {ok: true, buildings: n - plants, plants};
}

const plural = (n: number, word: string): string => `${n} ${word}${n === 1 ? "" : "s"}`;

/** The wording for a status, kept here so the panel and its story cannot drift apart. */
export function statusMessage(st: DesignStatus): string {
	if (st.ok) {
		const bits = [plural(st.buildings, "building")];
		if (st.plants > 0) bits.push(plural(st.plants, "power plant"));
		return `${bits.join(" and ")}. Ready to play.`;
	}
	if (st.reason === "empty") return "Tap a cell to start drawing. Every building you add must touch the shape.";
	if (st.reason === "split") {
		return (
			`${plural(st.n, "building")} in ${plural(st.parts, "separate piece")}. ` +
			`Join them, or the shape can't be built one at a time.`
		);
	}
	if (st.reason === "tooFew") return `${plural(st.n, "building")}. Needs at least ${MIN_PIECES} to play.`;
	if (st.reason === "tooMany") {
		return `${plural(st.n, "building")}. ${MAX_PIECES} is the most that fits on screen.`;
	}
	return `${plural(st.idle, "plant")} with nothing to power. Put a building that needs power next to each one.`;
}
