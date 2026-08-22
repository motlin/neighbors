import {describe, expect, it} from "vitest";
import {key} from "../../src/game/geometry.js";
import {unpid} from "../../src/game/piece.js";
import {
	blockedHit,
	forbiddenAt,
	isLegal,
	neighbourCount,
	neighbourSum,
	openAround,
	powerState,
	remainingOf,
	solved,
	statusOf,
} from "../../src/game/rules.js";
import type {Board, Key, Piece} from "../../src/game/types.js";

/** Build a board from `"x,y": pid` pairs, which reads closer to the picture than a Map does. */
function board(spec: Record<Key, string>): Map<Key, Piece> {
	const b = new Map<Key, Piece>();
	for (const k in spec) b.set(k, unpid(spec[k]!));
	return b;
}

const EMPTY_BAG = remainingOf({});

function status(b: Board, x: number, y: number, bag: Record<string, number> = {}) {
	return statusOf(b, x, y, remainingOf(bag), powerState(b));
}

describe("neighbourCount", () => {
	it("counts the eight touching cells, corners included", () => {
		const b = board({"0,0": "n1", "1,1": "n1", "1,0": "n2", "5,5": "n0"});
		expect(neighbourCount(b, 0, 0)).toBe(2);
		expect(neighbourCount(b, 5, 5)).toBe(0);
	});
});

describe("neighbourSum", () => {
	it("adds up the numbers touching the cell", () => {
		const b = board({"0,0": "s5", "1,0": "n2", "0,1": "n3"});
		expect(neighbourSum(b, 0, 0)).toBe(5);
	});

	// A range shows no number of its own, so it feeds the sum the count it is standing on. The
	// 2 to 4 here touches the sum, the blank and the plant, so it feeds three.
	it("adds a range in at its own neighbour count", () => {
		const b = board({"0,0": "s9", "1,0": "n2~4", "0,1": "b0", "1,1": "p3"});
		expect(neighbourSum(b, 0, 0)).toBe(3);
	});

	it("counts a blank, a plant and another sum as zero", () => {
		const b = board({"0,0": "s9", "0,1": "b0", "1,1": "p3", "1,0": "s4"});
		expect(neighbourSum(b, 0, 0)).toBe(0);
	});
});

describe("isLegal", () => {
	it("allows the first piece anywhere", () => {
		expect(isLegal(new Map(), 4, 7)).toBe(true);
	});

	it("requires every later piece to touch what is already down", () => {
		const b = board({"0,0": "n1"});
		expect(isLegal(b, 1, 1)).toBe(true);
		expect(isLegal(b, 2, 2)).toBe(false);
	});

	it("refuses an occupied cell", () => {
		expect(isLegal(board({"0,0": "n1"}), 0, 0)).toBe(false);
	});
});

describe("closed sides", () => {
	// Bit 4 is "right", so this piece insists the cell at 1,0 stays empty.
	const RIGHT = 1 << 4;

	it("reports a hit when something sits on a closed side", () => {
		const b = board({"0,0": `n1.${RIGHT}`, "1,0": "n1"});
		expect(blockedHit(b, 0, 0, b.get("0,0")!)).toBe(true);
	});

	it("reports no hit while the closed side is empty", () => {
		const b = board({"0,0": `n1.${RIGHT}`});
		expect(blockedHit(b, 0, 0, b.get("0,0")!)).toBe(false);
	});

	// The cell looks back along the opposite direction to find whoever closed it.
	it("marks the cell on the closed side as forbidden", () => {
		const b = board({"0,0": `n1.${RIGHT}`});
		expect(forbiddenAt(b, 1, 0)).toBe(true);
		expect(forbiddenAt(b, -1, 0)).toBe(false);
	});

	it("does not count a closed side as room to grow into", () => {
		const b = board({"0,0": `n1.${RIGHT}`});
		expect(openAround(b, 0, 0, b.get("0,0")!)).toBe(7);
	});
});

describe("powerState", () => {
	it("powers a bolt next to a plant that can carry it", () => {
		const b = board({"0,0": "p2", "1,0": "e1"});
		const pw = powerState(b);
		expect(pw.working.get("0,0")!.ok).toBe(true);
		expect(pw.powered.has("1,0")).toBe(true);
	});

	// Every building a plant touches is one it has to carry, whether or not that building asked
	// for power.
	it("counts buildings that never asked for power against the plant's number", () => {
		const b = board({"0,0": "p1", "1,0": "e1", "0,1": "n1"});
		const pw = powerState(b);
		expect(pw.working.get("0,0")!.demand).toBe(2);
		expect(pw.working.get("0,0")!.ok).toBe(false);
		expect(pw.powered.has("1,0")).toBe(false);
	});

	it("breaks both plants when two touch", () => {
		const b = board({"0,0": "p3", "1,0": "p3"});
		const pw = powerState(b);
		expect(pw.working.get("0,0")!.clash).toBe(true);
		expect(pw.working.get("1,0")!.clash).toBe(true);
	});

	it("powers nothing at all from a failed plant", () => {
		const b = board({"0,0": "p1", "1,0": "e2", "1,1": "e2", "0,1": "e2"});
		expect(powerState(b).powered.size).toBe(0);
	});
});

describe("remainingOf", () => {
	it("totals the bag and sorts what it could feed a sum, biggest first", () => {
		const rem = remainingOf({n3: 2, b0: 1, p4: 1});
		expect(rem.n).toBe(4);
		expect(rem.plants).toBe(1);
		// The running total of the best 0, 1, 2... pieces a sum could still gain.
		expect(rem.pre).toEqual([0, 3, 6, 6, 6]);
	});
});

describe("statusOf", () => {
	it("calls a blank met wherever it lands", () => {
		expect(status(board({"0,0": "b0"}), 0, 0)).toBe("met");
	});

	it("calls a building met once its number matches", () => {
		expect(status(board({"0,0": "n1", "1,0": "n1"}), 0, 0)).toBe("met");
	});

	it("calls it short while pieces are left that could still reach it", () => {
		expect(status(board({"0,0": "n2", "1,0": "n1"}), 0, 0, {n1: 1})).toBe("short");
	});

	it("calls it over once too many neighbours have arrived", () => {
		expect(status(board({"0,0": "n1", "1,0": "n1", "0,1": "n1"}), 0, 0)).toBe("over");
	});

	it("calls it starved when the bag can no longer reach its number", () => {
		expect(status(board({"0,0": "n5"}), 0, 0, {})).toBe("starved");
	});

	it("calls it blocked when a closed side is occupied", () => {
		const b = board({"0,0": `n1.${1 << 4}`, "1,0": "n1"});
		expect(status(b, 0, 0)).toBe("blocked");
	});

	it("takes a range anywhere inside it", () => {
		expect(status(board({"0,0": "n1~3", "1,0": "n1", "0,1": "n1"}), 0, 0, {})).toBe("met");
	});

	it("calls a bolt short while a plant is still in the bag and a side is open", () => {
		expect(status(board({"0,0": "e1", "1,0": "n1"}), 0, 0, {p2: 1})).toBe("short");
	});

	it("calls a bolt unpowered once no plant can reach it", () => {
		expect(status(board({"0,0": "e1", "1,0": "n1"}), 0, 0, {})).toBe("unpowered");
	});

	it("calls a plant overloaded past its number, and clashing beside another", () => {
		expect(status(board({"0,0": "p1", "1,0": "n1", "0,1": "n1"}), 0, 0)).toBe("overload");
		expect(status(board({"0,0": "p3", "1,0": "p3"}), 0, 0)).toBe("clash");
	});
});

describe("solved", () => {
	it("accepts a board where every piece agrees with its neighbours", () => {
		expect(solved(board({"0,0": "n1", "1,0": "n1"}))).toBe(true);
	});

	it("rejects a board with a number still unmet", () => {
		expect(solved(board({"0,0": "n2", "1,0": "n1"}))).toBe(false);
	});

	it("rejects a bolt with no working plant next door", () => {
		expect(solved(board({"0,0": "e1", "1,0": "n1"}))).toBe(false);
	});

	it("accepts a sum whose neighbours add up", () => {
		expect(solved(board({"0,0": "s3", "1,0": "n2", "0,1": "n2"}))).toBe(false);
		expect(solved(board({"0,0": "s4", "1,0": "n2", "0,1": "n2"}))).toBe(true);
	});

	it("ignores blanks entirely", () => {
		expect(solved(board({"0,0": "b0", "1,0": "n1"}))).toBe(true);
	});

	it("counts the empty board as solved, which is why the caller checks the bag too", () => {
		expect(solved(new Map())).toBe(true);
	});
});

describe("remaining bag with nothing left", () => {
	it("offers no room and no plants", () => {
		expect(EMPTY_BAG).toEqual({n: 0, pre: [0], plants: 0});
	});
});

describe("statusOf with a sum still reachable", () => {
	it("uses the biggest pieces left to decide whether the sum can still be made", () => {
		const b = board({[key(0, 0)]: "s9", "1,0": "n2"});
		expect(status(b, 0, 0, {n7: 1})).toBe("short");
		expect(status(b, 0, 0, {n1: 1})).toBe("starved");
	});

	// The sum has every side but its right one closed, so nothing new can ever touch it. The
	// 1 to 4 beside it stands on one neighbour and so feeds it one, but two pieces from the bag
	// can still land beside that range and grow what it feeds to three.
	it("waits for a range beside it to grow instead of calling the sum starved", () => {
		const b = board({"0,0": `s3.${255 - (1 << 4)}`, "1,0": "n1~4"});
		expect(status(b, 0, 0, {n1: 2})).toBe("short");
	});

	it("still starves the sum when the range beside it cannot grow that far", () => {
		const b = board({"0,0": `s8.${255 - (1 << 4)}`, "1,0": "n1~4"});
		expect(status(b, 0, 0, {n1: 2})).toBe("starved");
	});

	it("calls the sum met once the range beside it stands on the right count", () => {
		const b = board({"0,0": "s3", "1,0": "n1~4", "2,0": "b0", "2,1": "b0"});
		expect(status(b, 0, 0, {})).toBe("met");
	});
});
