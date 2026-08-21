import {describe, expect, it} from "vitest";
import {
	clearDesign,
	designCode,
	designStatus,
	emptyDesign,
	kindBlocked,
	loadDesign,
	nudgeRange,
	select,
	setKind,
	shapeLegal,
	strokeEnd,
	strokePaint,
	strokeStart,
	toggleSide,
	undoDesign,
} from "../../src/game/design.js";
import type {DesignState} from "../../src/game/design.js";

/** Draw a row of cells the way a finger would: one stroke, left to right. */
function row(n: number, from: DesignState = emptyDesign()): DesignState {
	let s = strokeStart(from, 0, 0);
	for (let x = 1; x < n; x++) s = strokePaint(s, x, 0);
	return strokeEnd(s);
}

const RIGHT = 1 << 4;

describe("shapeLegal", () => {
	it("allows the first cell anywhere", () => {
		expect(shapeLegal(emptyDesign(), 3, 3)).toBe(true);
	});

	it("requires every later cell to touch the shape", () => {
		const s = row(1);
		expect(shapeLegal(s, 1, 1)).toBe(true);
		expect(shapeLegal(s, 4, 4)).toBe(false);
	});
});

describe("strokes", () => {
	it("draws every cell the stroke passes over", () => {
		expect(row(4).shape.size).toBe(4);
	});

	// The whole stroke undoes in one step. Undoing a drag one cell at a time would be unusable.
	it("undoes a whole stroke at once", () => {
		expect(undoDesign(row(4)).shape.size).toBe(0);
	});

	it("erases when the stroke starts on a cell that is already drawn", () => {
		const drawn = row(3);
		const s = strokeEnd(strokePaint(strokeStart(drawn, 0, 0), 1, 0));
		expect(s.shape.size).toBe(1);
		expect(undoDesign(s).shape.size).toBe(3);
	});

	it("ignores a cell the stroke cannot reach", () => {
		const s = strokeEnd(strokePaint(strokeStart(emptyDesign(), 0, 0), 9, 9));
		expect(s.shape.size).toBe(1);
	});

	it("leaves no history behind for a stroke that drew nothing", () => {
		const s = strokeEnd(strokeStart(row(2), 8, 8));
		expect(s.history).toHaveLength(1);
	});
});

describe("setKind", () => {
	it("changes what the selected cell is", () => {
		const s = setKind(select(row(3), 1, 0), "s");
		expect(s.kinds.get("1,0")).toBe("s");
	});

	it("does nothing without a selection", () => {
		const s = row(3);
		expect(setKind(s, "s")).toBe(s);
	});

	// Two sums that touch would each be adding up a number that depends on the other; two plants
	// that touch break each other.
	it("refuses to put two sums or two plants next to each other", () => {
		const s = setKind(select(row(3), 0, 0), "s");
		expect(kindBlocked(s, "1,0", "s")).toBe("Two sum buildings can’t touch each other");
		expect(setKind(select(s, 1, 0), "s").kinds.get("1,0")).toBeUndefined();

		const p = setKind(select(row(3), 0, 0), "p");
		expect(kindBlocked(p, "1,0", "p")).toBe("Power plants can’t touch each other");
	});

	it("drops the sides and range when a cell becomes something that cannot have them", () => {
		// Side 1 is "top", which is empty above a row; side 4 would face the next cell along.
		let s = toggleSide(select(row(3), 0, 0), 1);
		s = nudgeRange(s, "u", 1);
		expect(s.masks.has("0,0")).toBe(true);
		expect(s.ranges.has("0,0")).toBe(true);
		s = setKind(s, "b");
		expect(s.masks.has("0,0")).toBe(false);
		expect(s.ranges.has("0,0")).toBe(false);
	});

	it("undoes back to what the cell was", () => {
		const s = setKind(select(row(3), 1, 0), "s");
		expect(undoDesign(s).kinds.get("1,0")).toBeUndefined();
	});
});

describe("toggleSide", () => {
	it("closes and reopens a side", () => {
		const closed = toggleSide(select(row(1), 0, 0), 4);
		expect(closed.masks.get("0,0")).toBe(RIGHT);
		expect(toggleSide(closed, 4).masks.has("0,0")).toBe(false);
	});

	it("refuses a side that already has something on it", () => {
		const s = select(row(2), 0, 0);
		expect(toggleSide(s, 4)).toBe(s);
	});

	it("refuses on a kind that has no sides", () => {
		const s = setKind(select(row(2), 1, 0), "p");
		expect(toggleSide(s, 4)).toBe(s);
	});

	// Drawing into a side someone closed off would contradict the design, so that X is dropped.
	it("drops a closed side that a later stroke draws into", () => {
		const closed = toggleSide(select(row(1), 0, 0), 4);
		const drawn = strokeEnd(strokeStart(closed, 1, 0));
		expect(drawn.masks.has("0,0")).toBe(false);
		// And undoing the stroke brings the X back.
		expect(undoDesign(drawn).masks.get("0,0")).toBe(RIGHT);
	});
});

describe("nudgeRange", () => {
	it("opens a range either side and closes it again", () => {
		let s = nudgeRange(select(row(3), 1, 0), "d", 1);
		expect(s.ranges.get("1,0")).toEqual([1, 0]);
		s = nudgeRange(s, "u", 1);
		expect(s.ranges.get("1,0")).toEqual([1, 1]);
		s = nudgeRange(nudgeRange(s, "d", -1), "u", -1);
		expect(s.ranges.has("1,0")).toBe(false);
	});

	it("stops at the ends rather than running away", () => {
		let s = select(row(3), 1, 0);
		for (let i = 0; i < 10; i++) s = nudgeRange(s, "u", 1);
		expect(s.ranges.get("1,0")).toEqual([0, 4]);
	});

	it("refuses on a kind that cannot take one", () => {
		const s = setKind(select(row(3), 1, 0), "b");
		expect(nudgeRange(s, "u", 1)).toBe(s);
	});
});

describe("designStatus", () => {
	it("asks for a first cell", () => {
		expect(designStatus(emptyDesign())).toEqual({ok: false, reason: "empty"});
	});

	it("refuses a shape in two parts", () => {
		const one = row(2);
		const two = strokeEnd(strokeStart({...one, shape: new Set([...one.shape, "9,9"])}, 9, 8));
		expect(designStatus(two)).toMatchObject({ok: false, reason: "split"});
	});

	it("refuses a shape that is too small to play", () => {
		expect(designStatus(row(3))).toEqual({ok: false, reason: "tooFew", n: 3});
	});

	it("refuses a plant with nothing to power", () => {
		const s = setKind(select(row(6), 0, 0), "p");
		expect(designStatus(s)).toMatchObject({ok: false, reason: "idlePlants", idle: 1});
	});

	it("accepts a shape that is ready, counting buildings apart from plants", () => {
		let s = setKind(select(row(6), 0, 0), "p");
		s = setKind(select(s, 1, 0), "e");
		expect(designStatus(s)).toEqual({ok: true, buildings: 5, plants: 1});
	});
});

describe("loadDesign and clearDesign", () => {
	it("loads a shape from its own share code", () => {
		const made = setKind(select(row(6), 2, 0), "s");
		const back = loadDesign(emptyDesign(), designCode(made));
		expect(back).not.toBeNull();
		expect(back!.shape.size).toBe(6);
		expect(back!.kinds.get("2,0")).toBe("s");
	});

	it("refuses a code it cannot read", () => {
		expect(loadDesign(emptyDesign(), "not a code")).toBeNull();
	});

	it("clears everything, including what could be undone", () => {
		const s = clearDesign(setKind(select(row(4), 1, 0), "s"));
		expect(s.shape.size).toBe(0);
		expect(s.history).toHaveLength(0);
		expect(s.sel).toBeNull();
	});
});
