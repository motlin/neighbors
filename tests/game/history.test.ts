import {describe, expect, it} from "vitest";
import {fmt} from "../../src/game/clock.js";
import {HIST_MAX, parseHistory, recordSolve, removeEntry, serializeHistory} from "../../src/game/history.js";
import type {HistoryEntry} from "../../src/game/history.js";

const entry = (id: string, over: Partial<HistoryEntry> = {}): HistoryEntry => ({
	id,
	n: 2,
	bag: ["n1", "n1"],
	origin: "dealt",
	code: "",
	tally: {n: 2},
	solved: true,
	...over,
});

describe("fmt", () => {
	it("writes a time as minutes, seconds and a tenth", () => {
		expect(fmt(0)).toBe("0:00.0");
		expect(fmt(1_500)).toBe("0:01.5");
		expect(fmt(83_400)).toBe("1:23.4");
	});

	it("floors a negative time rather than writing a minus sign", () => {
		expect(fmt(-5)).toBe("0:00.0");
	});
});

describe("recordSolve", () => {
	it("logs a puzzle the first time it is solved", () => {
		const {history, id} = recordSolve(
			[],
			{bag: ["n1", "n1"], origin: "dealt", code: "", histId: null},
			4_000,
			"abc",
		);
		expect(history).toHaveLength(1);
		expect(id).toBe("abc");
		expect(history[0]!.best).toBe(4_000);
		expect(history[0]!.tally).toEqual({n: 2});
	});

	it("keeps a faster time and reports it as a new best", () => {
		const first = recordSolve([], {bag: ["n1", "n1"], origin: "dealt", code: "", histId: null}, 9_000, "abc");
		const again = recordSolve(
			first.history,
			{bag: ["n1", "n1"], origin: "dealt", code: "", histId: "abc"},
			4_000,
			"z",
		);
		expect(again.history[0]!.best).toBe(4_000);
		expect(again.newBest).toBe(true);
		expect(again.prevBest).toBe(9_000);
	});

	it("keeps the earlier best when the new time is slower", () => {
		const first = recordSolve([], {bag: ["n1", "n1"], origin: "dealt", code: "", histId: null}, 4_000, "abc");
		const again = recordSolve(
			first.history,
			{bag: ["n1", "n1"], origin: "dealt", code: "", histId: "abc"},
			9_000,
			"z",
		);
		expect(again.history[0]!.best).toBe(4_000);
		expect(again.newBest).toBe(false);
	});

	it("moves a re-solved puzzle back to the top of the list", () => {
		const older = [entry("first"), entry("second")];
		const {history} = recordSolve(
			older,
			{bag: ["n1", "n1"], origin: "dealt", code: "", histId: "second"},
			1_000,
			"z",
		);
		expect(history.map((e) => e.id)).toEqual(["second", "first"]);
	});

	it("keeps the list to its cap", () => {
		const full = Array.from({length: HIST_MAX}, (_, i) => entry(`e${i}`));
		const {history} = recordSolve(full, {bag: ["n1", "n1"], origin: "dealt", code: "", histId: null}, 0, "new");
		expect(history).toHaveLength(HIST_MAX);
		expect(history[0]!.id).toBe("new");
	});
});

describe("removeEntry", () => {
	it("drops just the one asked for", () => {
		expect(removeEntry([entry("a"), entry("b")], "a").map((e) => e.id)).toEqual(["b"]);
	});
});

describe("parseHistory", () => {
	it("reads back what it wrote", () => {
		const list = [entry("a"), entry("b")];
		expect(parseHistory(serializeHistory(list))).toEqual(list);
	});

	// Saved history is whatever is in the browser, which may be from an older version or from
	// nothing at all, so anything unreadable comes back as an empty list rather than throwing.
	it("survives nonsense", () => {
		expect(parseHistory(null)).toEqual([]);
		expect(parseHistory("")).toEqual([]);
		expect(parseHistory("{not json")).toEqual([]);
		expect(parseHistory('{"a":1}')).toEqual([]);
	});

	it("drops entries that were never solved, and entries with an unreadable bag", () => {
		const raw = JSON.stringify([entry("kept"), {...entry("open"), solved: false}, {...entry("junk"), bag: ["!!"]}]);
		expect(parseHistory(raw).map((e) => e.id)).toEqual(["kept"]);
	});

	// The oldest saved lists wrote a bag of plain numbers, before pieces had kinds.
	it("reads a bag of bare numbers as plain buildings", () => {
		const raw = JSON.stringify([{...entry("old"), bag: [1, 2]}]);
		expect(parseHistory(raw)[0]!.bag).toEqual(["n1", "n2"]);
	});
});
