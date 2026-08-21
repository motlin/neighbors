import {describe, expect, it} from "vitest";
import {decodeCode, encodeSet} from "../../src/game/codes.js";
import type {Kind, Key} from "../../src/game/types.js";

const shape = (...keys: Key[]) => new Set(keys);

describe("encodeSet", () => {
	it("writes nothing for an empty shape", () => {
		expect(encodeSet(new Set(), new Map(), new Map(), new Map())).toBe("");
	});

	it("stamps the version and the box the shape fits in", () => {
		expect(encodeSet(shape("0,0", "1,0"), new Map(), new Map(), new Map())).toMatch(/^2:2x1-/);
	});

	// A shape with nothing special about it stays two fields long; the mask and range fields only
	// appear when there is something to put in them.
	it("leaves off the fields it does not need", () => {
		const plain = encodeSet(shape("0,0", "1,0"), new Map(), new Map(), new Map());
		expect(plain.split("-")).toHaveLength(3);
		const masked = encodeSet(shape("0,0", "1,0"), new Map(), new Map([["0,0", 4]]), new Map());
		expect(masked.split("-")).toHaveLength(4);
		const ranged = encodeSet(shape("0,0", "1,0"), new Map(), new Map(), new Map([["0,0", [1, 2]]]));
		expect(ranged.split("-")).toHaveLength(5);
	});

	it("normalizes position, so the same shape drawn elsewhere gets the same code", () => {
		const here = encodeSet(shape("0,0", "1,1"), new Map(), new Map(), new Map());
		const there = encodeSet(shape("40,-9", "41,-8"), new Map(), new Map(), new Map());
		expect(there).toBe(here);
	});
});

describe("decodeCode", () => {
	it("round-trips a plain shape", () => {
		const set = shape("0,0", "1,0", "1,1");
		const back = decodeCode(encodeSet(set, new Map(), new Map(), new Map()));
		expect(back).not.toBeNull();
		expect([...back!.set].sort()).toEqual([...set].sort());
	});

	it("round-trips kinds, masks and ranges together", () => {
		const set = shape("0,0", "1,0", "2,0");
		const kinds = new Map<Key, Kind>([
			["0,0", "p"],
			["1,0", "e"],
			["2,0", "s"],
		]);
		const masks = new Map<Key, number>([["2,0", 130]]);
		const ranges = new Map<Key, [number, number]>([["1,0", [1, 2]]]);
		const back = decodeCode(encodeSet(set, kinds, masks, ranges))!;
		expect(back.kinds.get("0,0")).toBe("p");
		expect(back.kinds.get("1,0")).toBe("e");
		expect(back.kinds.get("2,0")).toBe("s");
		expect(back.masks.get("2,0")).toBe(130);
		expect(back.ranges.get("1,0")).toEqual([1, 2]);
	});

	// A blank and a plant have no sides to close and no range to widen, so those fields are
	// dropped on the way back in rather than being trusted.
	it("drops masks and ranges from kinds that cannot carry them", () => {
		const set = shape("0,0", "1,0");
		const kinds = new Map<Key, Kind>([["0,0", "b"]]);
		const back = decodeCode(encodeSet(set, kinds, new Map([["0,0", 8]]), new Map([["0,0", [1, 1]]])))!;
		expect(back.masks.has("0,0")).toBe(false);
		expect(back.ranges.has("0,0")).toBe(false);
	});

	it("reads a code back whatever case it arrives in", () => {
		const code = encodeSet(shape("0,0", "1,1"), new Map(), new Map(), new Map());
		expect(decodeCode(code.toUpperCase())).not.toBeNull();
	});

	it("refuses nonsense rather than guessing", () => {
		expect(decodeCode("")).toBeNull();
		expect(decodeCode("hello")).toBeNull();
		expect(decodeCode("2:2x1-zz-0")).toBeNull();
		// A box far bigger than any playable puzzle is a refusal, not a very long decode.
		expect(decodeCode("2:900x900-0-0")).toBeNull();
	});

	// Codes shared before the kind field existed have no version prefix; a saved link from then
	// still has to open.
	it("still reads a version 1 code", () => {
		// Two cells side by side: shape bits "11", padded to five and read as base32, is "o".
		const back = decodeCode("2x1-o")!;
		expect(back).not.toBeNull();
		expect([...back.set].sort()).toEqual(["0,0", "1,0"]);
		expect(back.kinds.get("0,0")).toBe("n");
	});
});
