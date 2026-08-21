import {describe, expect, it} from "vitest";
import {around, bounds, connectedCount, DIRNAME, key, xy} from "../../src/game/geometry.js";

describe("key and xy", () => {
	it("round-trips a coordinate", () => {
		expect(key(3, -4)).toBe("3,-4");
		expect(xy("3,-4")).toEqual([3, -4]);
	});
});

describe("around", () => {
	it("lists the eight neighbours in reading order", () => {
		expect(around(0, 0)).toEqual([
			[-1, -1],
			[0, -1],
			[1, -1],
			[-1, 0],
			[1, 0],
			[-1, 1],
			[0, 1],
			[1, 1],
		]);
	});

	it("names every direction it lists", () => {
		expect(DIRNAME).toHaveLength(8);
		expect(DIRNAME[0]).toBe("top left");
		expect(DIRNAME[7]).toBe("bottom right");
	});

	// The mask code reads direction i and 7-i as opposites, so the order must stay symmetric.
	it("puts opposite directions at i and 7-i", () => {
		const n = around(0, 0);
		for (let i = 0; i < 8; i++) {
			const here = n[i]!;
			const there = n[7 - i]!;
			expect([here[0] + there[0], here[1] + there[1]]).toEqual([0, 0]);
		}
	});
});

describe("bounds", () => {
	it("frames the keys with a one cell margin", () => {
		expect(bounds(["0,0", "2,3"])).toEqual({x0: -1, x1: 3, y0: -1, y1: 4});
	});

	it("returns a single cell frame when there is nothing to frame", () => {
		expect(bounds([])).toEqual({x0: 0, x1: 0, y0: 0, y1: 0});
	});
});

describe("connectedCount", () => {
	it("counts one part for a shape that touches itself", () => {
		expect(connectedCount(new Set(["0,0", "1,1", "2,2"]))).toBe(1);
	});

	it("counts separate parts", () => {
		expect(connectedCount(new Set(["0,0", "5,5"]))).toBe(2);
	});

	it("counts nothing as nothing", () => {
		expect(connectedCount(new Set())).toBe(0);
	});
});
