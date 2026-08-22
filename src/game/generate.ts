/**
 * Dealing a puzzle.
 *
 * The generator does not solve anything. It grows a shape, decides what each cell is, and then
 * reads the numbers off the shape it just drew: a building's number is how many neighbours it
 * actually has, so the shape it came from is by construction a solution to it. What is left is to
 * throw away the shapes that make a dull or unfair puzzle, which is what the checks at the bottom
 * of the attempt loop do.
 */

import {around, key, xy} from "./geometry.js";
import {counts, pid} from "./piece.js";
import {powerState, solved} from "./rules.js";
import {systemRng, type Rng} from "./random.js";
import type {Board, Kind, Key, Piece, Pid, Shape} from "./types.js";

export const MIN_PIECES = 5;
export const MAX_PIECES = 80;

/** The smallest puzzle a power plant fits into and still has something to carry. */
const POWER_FLOOR = 8;

export interface Options {
	/** Sum buildings. */
	special: boolean;
	/** Closed sides. */
	walls: boolean;
	/** Blank buildings. */
	blank: boolean;
	/** Power plants, and the bolts they carry. */
	power: boolean;
	/** Numbers written as a span rather than one value. */
	ranges: boolean;
}

export interface Puzzle {
	pieces: number;
	labels: Board;
	set: Shape;
	kinds: Map<Key, Kind>;
	masks: Map<Key, number>;
	ranges: Map<Key, [number, number]>;
	bag: Pid[];
}

/** Grow a connected blob of the right size by repeatedly budding off a cell already in it. */
function growBlob(pieces: number, rng: Rng): {cells: [number, number][]; set: Set<Key>} | null {
	const cells: [number, number][] = [[0, 0]];
	const set = new Set<Key>([key(0, 0)]);
	let guard = 0;
	while (cells.length < pieces && guard++ < 20000) {
		const [px, py] = cells[rng.int(cells.length)]!;
		const opts = around(px, py).filter(([x, y]) => !set.has(key(x, y)));
		if (!opts.length) continue;
		const [nx, ny] = opts[rng.int(opts.length)]!;
		set.add(key(nx, ny));
		cells.push([nx, ny]);
	}
	return cells.length < pieces ? null : {cells, set};
}

/**
 * A set of cells none of which touch each other. Plants and sum buildings each need one, for
 * different reasons: two plants that touch break each other, and two sums that touch would each be
 * adding up a number that depends on the other.
 */
function independentSet(
	cells: readonly [number, number][],
	target: number,
	taken: ReadonlyMap<Key, Kind> | null,
	rng: Rng,
): Set<Key> {
	const picked = new Set<Key>();
	for (const [x, y] of rng.shuffle(cells)) {
		if (picked.size >= target) break;
		const k = key(x, y);
		if (taken?.has(k)) continue;
		if (around(x, y).some(([a, b]) => picked.has(key(a, b)))) continue;
		picked.add(k);
	}
	return picked;
}

/**
 * Turn a number into a span around it. The slack is stored either side of whatever the shape
 * derives, rather than as a fixed pair, so the range stays valid while a design is still being
 * drawn and the underlying count keeps changing.
 */
export function widen(v: number, r: readonly [number, number] | null, cap: number): {v: number; hi: number} {
	if (!r) return {v, hi: 0};
	const a = Math.max(1, v - (r[0] | 0));
	const b = cap ? Math.min(cap, v + (r[1] | 0)) : v + (r[1] | 0);
	return b > a ? {v: a, hi: b} : {v, hi: 0};
}

/**
 * Read the numbers off a shape: what every cell is, and what number that makes it. This is what
 * the designer previews with too, which is why it takes loose maps rather than a finished puzzle.
 */
export function labelShape(
	set: Shape,
	kinds: ReadonlyMap<Key, Kind>,
	masks: ReadonlyMap<Key, number>,
	ranges: ReadonlyMap<Key, readonly [number, number]>,
): Map<Key, Piece> {
	const kindOf = (k: Key): Kind => kinds.get(k) ?? "n";
	const rangeOf = (k: Key) => ranges.get(k) ?? null;
	const count = (x: number, y: number) => around(x, y).filter(([a, b]) => set.has(key(a, b))).length;
	// A building's number is its count, and a range feeds a sum the count it stands on either way,
	// so what a neighbour feeds a sum is its count whenever it is a kind that counts at all.
	const valOf = (x: number, y: number) => (counts(kindOf(key(x, y))) ? count(x, y) : 0);
	const out = new Map<Key, Piece>();
	for (const k of set) {
		const [x, y] = xy(k);
		const kind = kindOf(k);
		// A blank and a plant have no sides to close and no range to widen.
		const m = kind === "b" || kind === "p" ? 0 : (masks.get(k) ?? 0);
		if (kind === "b") {
			out.set(k, {k: "b", v: 0, hi: 0, m: 0});
			continue;
		}
		if (kind === "p") {
			let demand = 0;
			for (const [a, b] of around(x, y)) {
				if (set.has(key(a, b)) && kindOf(key(a, b)) !== "p") demand++;
			}
			out.set(k, {k: "p", v: demand, hi: 0, m: 0});
			continue;
		}
		if (kind === "s") {
			let t = 0;
			for (const [a, b] of around(x, y)) if (set.has(key(a, b))) t += valOf(a, b);
			const w = widen(t, rangeOf(k), 0);
			out.set(k, {k: "s", v: w.v, hi: w.hi, m});
			continue;
		}
		// Eight is the cap on a count: there are only eight cells to touch.
		const w = widen(count(x, y), rangeOf(k), 8);
		out.set(k, {k: kind, v: w.v, hi: w.hi, m});
	}
	return out;
}

function pickRanges(set: Shape, density: number, kinds: ReadonlyMap<Key, Kind>, rng: Rng): Map<Key, [number, number]> {
	const out = new Map<Key, [number, number]>();
	for (const k of set) {
		const kind = kinds.get(k) ?? "n";
		if (kind === "b" || kind === "p") continue;
		if (rng.next() > density) continue;
		const down = rng.int(3);
		const up = rng.int(3);
		if (!down && !up) continue;
		out.set(k, [down, up]);
	}
	return out;
}

/** Close off sides that face empty space; closing one that faces the shape would be unbuildable. */
function pickMasks(set: Shape, density: number, kinds: ReadonlyMap<Key, Kind>, rng: Rng): Map<Key, number> {
	const masks = new Map<Key, number>();
	for (const k of set) {
		const kind = kinds.get(k) ?? "n";
		if (kind === "b" || kind === "p") continue;
		if (rng.next() > density) continue;
		const [x, y] = xy(k);
		const nb = around(x, y);
		const cand: number[] = [];
		for (let i = 0; i < 8; i++) {
			const cell = nb[i]!;
			if (!set.has(key(cell[0], cell[1]))) cand.push(i);
		}
		if (!cand.length) continue;
		let m = 0;
		for (const i of rng.shuffle(cand).slice(0, 1 + rng.int(Math.min(2, cand.length)))) m |= 1 << i;
		masks.set(k, m);
	}
	return masks;
}

export function generate(pieces: number, opt: Options, rng: Rng = systemRng): Puzzle | null {
	const want = Math.max(MIN_PIECES, Math.min(MAX_PIECES, pieces | 0));
	// A plant needs a few buildings around it to be carrying anything, so below this the power
	// setting is ignored rather than obeyed: obeying it would mean never dealing a puzzle at all.
	const usePower = opt.power && want >= POWER_FLOOR;
	for (let attempt = 0; attempt < 500; attempt++) {
		const blob = growBlob(want, rng);
		if (!blob) continue;
		const kinds = new Map<Key, Kind>();

		// Plants go first: they decide which buildings end up needing power.
		let plants = new Set<Key>();
		if (usePower) {
			plants = independentSet(blob.cells, Math.max(1, Math.round(want * 0.1)), null, rng);
			for (const k of plants) kinds.set(k, "p");
			for (const k of plants) {
				const [x, y] = xy(k);
				const free = around(x, y).filter(([b, c]) => blob.set.has(key(b, c)) && !kinds.has(key(b, c)));
				if (!free.length) {
					kinds.delete(k);
					plants.delete(k);
					continue;
				}
				for (const [b, c] of rng.shuffle(free).slice(0, 1 + rng.int(Math.min(3, free.length)))) {
					kinds.set(key(b, c), "e");
				}
			}
		}
		if (usePower && plants.size === 0) continue;

		if (opt.special) {
			const sums = independentSet(blob.cells, Math.max(1, Math.round(want * 0.15)), kinds, rng);
			for (const k of sums) if (!kinds.has(k)) kinds.set(k, "s");
			if ([...kinds.values()].every((v) => v !== "s")) continue;
		}
		if (opt.blank) {
			const target = Math.max(1, Math.round(want * 0.1));
			let got = 0;
			for (const [x, y] of rng.shuffle(blob.cells)) {
				if (got >= target) break;
				const k = key(x, y);
				if (kinds.has(k)) continue;
				kinds.set(k, "b");
				got++;
			}
			if (!got) continue;
		}
		const masks = opt.walls ? pickMasks(blob.set, 0.26, kinds, rng) : new Map<Key, number>();
		const ranges = opt.ranges ? pickRanges(blob.set, 0.3, kinds, rng) : new Map<Key, [number, number]>();
		const labels = labelShape(blob.set, kinds, masks, ranges);

		// A puzzle of all the same number would be placed by rote, so insist on some spread.
		const plain = [...labels.values()].filter((p) => counts(p.k) && !p.hi).map((p) => p.v);
		if (new Set(plain).size < (want < 10 ? 2 : 3)) continue;
		// A plant with nothing to power sits satisfied whatever the player does.
		const check = powerState(labels);
		if ([...check.working.values()].some((st) => st.serves === 0)) continue;
		// Asking for ranges and getting none back is a puzzle that ignored the setting.
		if (opt.ranges && ![...labels.values()].some((q) => q.hi)) continue;
		if (!solved(labels)) continue;

		return {
			pieces: want,
			labels,
			set: blob.set,
			kinds,
			masks,
			ranges,
			bag: [...labels.values()].map(pid),
		};
	}
	return null;
}
