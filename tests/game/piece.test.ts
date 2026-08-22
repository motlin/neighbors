import {describe, expect, it} from "vitest";
import {contrib, describePiece, high, low, pid, unpid} from "../../src/game/piece.js";

describe("pid and unpid", () => {
	it("round-trips a plain building", () => {
		expect(pid({k: "n", v: 3, hi: 0, m: 0})).toBe("n3");
		expect(unpid("n3")).toEqual({k: "n", v: 3, hi: 0, m: 0});
	});

	it("round-trips a range", () => {
		expect(pid({k: "e", v: 2, hi: 4, m: 0})).toBe("e2~4");
		expect(unpid("e2~4")).toEqual({k: "e", v: 2, hi: 4, m: 0});
	});

	it("round-trips a closed side mask", () => {
		expect(pid({k: "s", v: 7, hi: 0, m: 130})).toBe("s7.130");
		expect(unpid("s7.130")).toEqual({k: "s", v: 7, hi: 0, m: 130});
	});

	it("round-trips a range and a mask together", () => {
		expect(pid({k: "n", v: 1, hi: 3, m: 5})).toBe("n1~3.5");
		expect(unpid("n1~3.5")).toEqual({k: "n", v: 1, hi: 3, m: 5});
	});

	// Anything unparseable becomes the least surprising piece rather than throwing, because ids
	// arrive from saved history and from pasted share codes.
	it("falls back to a plain 1 for nonsense", () => {
		expect(unpid("nope")).toEqual({k: "n", v: 1, hi: 0, m: 0});
	});
});

describe("low and high", () => {
	it("reads a fixed number as its own low and high", () => {
		const p = unpid("n3");
		expect(low(p)).toBe(3);
		expect(high(p)).toBe(3);
	});

	it("reads a range at both ends", () => {
		const p = unpid("n2~5");
		expect(low(p)).toBe(2);
		expect(high(p)).toBe(5);
	});
});

describe("contrib", () => {
	it("feeds a sum with a counting building's own number, whatever it is touching", () => {
		expect(contrib(unpid("n4"), 1)).toBe(4);
		expect(contrib(unpid("e2"), 7)).toBe(2);
	});

	// A range shows no number of its own, so what it feeds a sum is the count it is standing on:
	// a 2 to 4 with three neighbours feeds three.
	it("feeds a sum a range's neighbour count", () => {
		expect(contrib(unpid("n2~4"), 3)).toBe(3);
		expect(contrib(unpid("e1~8"), 0)).toBe(0);
	});

	// A blank, a plant and another sum have no count to give, so all three feed it zero.
	it("feeds a sum zero from the kinds that do not count neighbours", () => {
		expect(contrib(unpid("b0"), 3)).toBe(0);
		expect(contrib(unpid("p3"), 3)).toBe(0);
		expect(contrib(unpid("s6"), 3)).toBe(0);
	});
});

describe("describePiece", () => {
	it("names each kind the way the board reads", () => {
		expect(describePiece(unpid("n3"))).toBe("Building 3");
		expect(describePiece(unpid("n2~4"))).toBe("Building 2 to 4");
		expect(describePiece(unpid("e3"))).toBe("Building 3, needs power");
		expect(describePiece(unpid("s7"))).toBe("Sum building 7");
		expect(describePiece(unpid("p4"))).toBe("Power plant 4");
		expect(describePiece(unpid("b0"))).toBe("Blank building");
	});
});
