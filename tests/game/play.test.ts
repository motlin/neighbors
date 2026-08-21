import {describe, expect, it} from "vitest";
import {bagLeft, erase, firstAvailable, place, restart, startPuzzle, undo} from "../../src/game/play.js";
import type {PlayState} from "../../src/game/play.js";

const AT = 1_000;

/** A puzzle of two buildings that each want one neighbour: place them touching and it is solved. */
const PAIR = ["n1", "n1"];

function opened(list: string[] = PAIR): PlayState {
	return startPuzzle(list, {origin: "dealt", code: "", id: null});
}

describe("startPuzzle", () => {
	it("puts every piece in the bag and nothing on the board", () => {
		const s = opened();
		expect(bagLeft(s)).toBe(2);
		expect(s.board.size).toBe(0);
		expect(s.won).toBe(false);
	});

	it("selects a piece to start with", () => {
		expect(opened().sel).toBe("n1");
	});

	it("leaves the clock stopped until the first placement", () => {
		expect(opened().startAt).toBe(0);
	});
});

describe("firstAvailable", () => {
	// Plain, then powered, then sum, then plant, then blank; inside a kind, by number.
	it("picks in the order the bag lists", () => {
		expect(firstAvailable({b0: 1, p3: 1, n2: 1, s5: 1, e1: 1})).toBe("n2");
		expect(firstAvailable({b0: 1, p3: 1})).toBe("p3");
		expect(firstAvailable({n3: 1, n1: 1})).toBe("n1");
	});

	it("ignores a piece the bag has run out of", () => {
		expect(firstAvailable({n1: 0, n2: 1})).toBe("n2");
	});

	it("returns nothing from an empty bag", () => {
		expect(firstAvailable({})).toBeNull();
	});
});

describe("place", () => {
	it("puts the selected piece down and takes it out of the bag", () => {
		const s = place(opened(), 0, 0, AT);
		expect(s.board.get("0,0")).toEqual({k: "n", v: 1, hi: 0, m: 0});
		expect(bagLeft(s)).toBe(1);
	});

	it("starts the clock on the first placement only", () => {
		const first = place(opened(), 0, 0, AT);
		expect(first.startAt).toBe(AT);
		expect(place(first, 1, 0, AT + 500).startAt).toBe(AT);
	});

	it("refuses a cell that does not touch what is already down", () => {
		const s = place(opened(), 0, 0, AT);
		expect(place(s, 5, 5, AT)).toBe(s);
	});

	it("refuses to place from an empty bag", () => {
		const s = place(place(opened(), 0, 0, AT), 1, 0, AT);
		expect(place(s, 2, 0, AT)).toBe(s);
	});

	it("wins once the last piece lands and everything agrees", () => {
		const s = place(place(opened(), 0, 0, AT), 1, 0, AT + 2_000);
		expect(s.won).toBe(true);
		expect(s.finishAt).toBe(AT + 2_000);
	});

	// A board that uses every piece but disagrees is not a win, it is a board to take apart.
	it("does not win on a full board that disagrees", () => {
		const s = place(place(opened(["n1", "n2"]), 0, 0, AT), 1, 0, AT);
		expect(bagLeft(s)).toBe(0);
		expect(s.won).toBe(false);
	});

	it("moves the selection on once the selected piece runs out", () => {
		const s = place(opened(["n1", "n2"]), 0, 0, AT);
		expect(s.sel).toBe("n2");
	});
});

describe("erase", () => {
	it("takes a piece back and returns it to the bag", () => {
		const s = erase(place(opened(), 0, 0, AT), 0, 0);
		expect(s.board.size).toBe(0);
		expect(bagLeft(s)).toBe(2);
		expect(s.sel).toBe("n1");
	});

	it("does nothing to an empty cell", () => {
		const s = place(opened(), 0, 0, AT);
		expect(erase(s, 4, 4)).toBe(s);
	});

	it("leaves a won board alone, because the win is the end of it", () => {
		const s = place(place(opened(), 0, 0, AT), 1, 0, AT);
		expect(erase(s, 0, 0)).toBe(s);
	});
});

describe("undo", () => {
	it("takes back a placement", () => {
		const s = undo(place(opened(), 0, 0, AT));
		expect(s.board.size).toBe(0);
		expect(bagLeft(s)).toBe(2);
	});

	it("puts back an erase", () => {
		const s = undo(erase(place(opened(), 0, 0, AT), 0, 0));
		expect(s.board.has("0,0")).toBe(true);
		expect(bagLeft(s)).toBe(1);
	});

	it("does nothing with nothing to undo", () => {
		const s = opened();
		expect(undo(s)).toBe(s);
	});

	// Undoing past the winning move puts you back in the puzzle, clock running again.
	it("restarts the clock when it undoes the win", () => {
		const won = place(place(opened(), 0, 0, AT), 1, 0, AT + 3_000);
		const s = undo(won);
		expect(s.won).toBe(false);
		expect(s.finishAt).toBe(0);
		expect(s.startAt).toBe(AT);
	});
});

describe("restart", () => {
	it("returns every piece to the bag and stops the clock", () => {
		const s = restart(place(place(opened(), 0, 0, AT), 1, 0, AT));
		expect(s.board.size).toBe(0);
		expect(bagLeft(s)).toBe(2);
		expect(s.won).toBe(false);
		expect(s.startAt).toBe(0);
		expect(s.finishAt).toBe(0);
	});

	it("keeps the puzzle it was given, so start over means the same puzzle", () => {
		const before = opened();
		expect(restart(place(before, 0, 0, AT)).start).toEqual(before.start);
	});
});
