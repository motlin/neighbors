import {describe, expect, it} from "vitest";
import {connectedCount} from "../../src/game/geometry.js";
import {generate, labelShape, MAX_PIECES, MIN_PIECES, widen} from "../../src/game/generate.js";
import {counts} from "../../src/game/piece.js";
import {powerState, solved} from "../../src/game/rules.js";
import {seededRng} from "../../src/game/random.js";
import type {Kind, Key} from "../../src/game/types.js";

const ALL_OFF = {special: false, walls: false, blank: false, power: false, ranges: false};

describe("widen", () => {
	it("leaves a number alone when there is no slack", () => {
		expect(widen(4, null, 8)).toEqual({v: 4, hi: 0});
	});

	it("opens a range either side, never below one", () => {
		expect(widen(4, [2, 1], 8)).toEqual({v: 2, hi: 5});
		expect(widen(1, [3, 1], 8)).toEqual({v: 1, hi: 2});
	});

	it("stops at the cap when there is one", () => {
		expect(widen(7, [0, 4], 8)).toEqual({v: 7, hi: 8});
		// A sum has no cap, because there is no ceiling on what neighbours can add up to.
		expect(widen(7, [0, 4], 0)).toEqual({v: 7, hi: 11});
	});
});

describe("labelShape", () => {
	it("gives every cell the count of its neighbours", () => {
		const set = new Set<Key>(["0,0", "1,0", "2,0"]);
		const labels = labelShape(set, new Map(), new Map(), new Map());
		expect(labels.get("0,0")).toEqual({k: "n", v: 1, hi: 0, m: 0});
		expect(labels.get("1,0")).toEqual({k: "n", v: 2, hi: 0, m: 0});
	});

	it("gives a sum the total of the numbers touching it", () => {
		const set = new Set<Key>(["0,0", "1,0", "2,0"]);
		const kinds = new Map<Key, Kind>([["1,0", "s"]]);
		const labels = labelShape(set, kinds, new Map(), new Map());
		expect(labels.get("1,0")).toEqual({k: "s", v: 2, hi: 0, m: 0});
	});

	it("gives a plant the number of buildings it has to carry", () => {
		const set = new Set<Key>(["0,0", "1,0", "2,0"]);
		const kinds = new Map<Key, Kind>([["1,0", "p"]]);
		expect(labelShape(set, kinds, new Map(), new Map()).get("1,0")).toEqual({
			k: "p",
			v: 2,
			hi: 0,
			m: 0,
		});
	});

	it("strips sides and ranges off the kinds that cannot carry them", () => {
		const set = new Set<Key>(["0,0", "1,0"]);
		const kinds = new Map<Key, Kind>([["0,0", "b"]]);
		const labels = labelShape(set, kinds, new Map([["0,0", 8]]), new Map([["0,0", [1, 1]]]));
		expect(labels.get("0,0")).toEqual({k: "b", v: 0, hi: 0, m: 0});
	});

	// The label a shape gives itself is by definition a solution to itself.
	it("labels a shape into a solved board", () => {
		const set = new Set<Key>(["0,0", "1,0", "1,1", "0,1", "2,2"]);
		expect(solved(labelShape(set, new Map(), new Map(), new Map()))).toBe(true);
	});
});

describe("generate", () => {
	it("deals the number of pieces asked for", () => {
		const p = generate(12, ALL_OFF, seededRng(7))!;
		expect(p).not.toBeNull();
		expect(p.bag).toHaveLength(12);
		expect(p.set.size).toBe(12);
	});

	it("deals one connected shape, so it can be built a piece at a time", () => {
		const p = generate(20, ALL_OFF, seededRng(11))!;
		expect(connectedCount(p.set)).toBe(1);
	});

	it("deals a puzzle that its own labels solve", () => {
		const p = generate(14, ALL_OFF, seededRng(3))!;
		expect(solved(p.labels)).toBe(true);
	});

	it("clamps a silly size into the playable range", () => {
		expect(generate(1, ALL_OFF, seededRng(1))!.pieces).toBe(MIN_PIECES);
		expect(generate(500, ALL_OFF, seededRng(1))!.pieces).toBe(MAX_PIECES);
	});

	it("gives a plain puzzle no sums, blanks, plants or ranges", () => {
		const p = generate(16, ALL_OFF, seededRng(5))!;
		for (const piece of p.labels.values()) {
			expect(piece.k).toBe("n");
			expect(piece.hi).toBe(0);
			expect(piece.m).toBe(0);
		}
	});

	it("includes what it is asked to include", () => {
		const p = generate(24, {...ALL_OFF, special: true, power: true, ranges: true}, seededRng(9))!;
		const kinds = [...p.labels.values()].map((q) => q.k);
		expect(kinds).toContain("s");
		expect(kinds).toContain("p");
		expect([...p.labels.values()].some((q) => q.hi > 0)).toBe(true);
	});

	// A plant with nothing to power is a decoration, not a puzzle: it would sit satisfied whatever
	// the player did.
	it("never deals a plant with nothing to power", () => {
		const p = generate(30, {...ALL_OFF, power: true}, seededRng(21))!;
		for (const st of powerState(p.labels).working.values()) expect(st.serves).toBeGreaterThan(0);
	});

	it("deals more than a couple of distinct numbers, so the puzzle is not trivial", () => {
		const p = generate(18, ALL_OFF, seededRng(13))!;
		const plain = [...p.labels.values()].filter((q) => counts(q.k) && !q.hi).map((q) => q.v);
		expect(new Set(plain).size).toBeGreaterThanOrEqual(3);
	});

	// Below the floor a plant has nothing to carry, so the setting is ignored rather than obeyed:
	// obeying it would mean the deal button did nothing at all at that size.
	it("deals a small puzzle without plants even when power is asked for", () => {
		const p = generate(6, {...ALL_OFF, power: true}, seededRng(4))!;
		expect(p).not.toBeNull();
		expect([...p.labels.values()].some((q) => q.k === "p")).toBe(false);
	});

	it("repeats itself given the same seed, and does not given another", () => {
		const a = generate(15, ALL_OFF, seededRng(42))!;
		const b = generate(15, ALL_OFF, seededRng(42))!;
		const c = generate(15, ALL_OFF, seededRng(43))!;
		expect(b.bag).toEqual(a.bag);
		expect(c.bag).not.toEqual(a.bag);
	});
});
