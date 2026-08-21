// @vitest-environment jsdom
import {describe, expect, it, vi} from "vitest";
import {fireEvent, render, screen} from "@testing-library/react";
import {HistoryPanel} from "../../src/ui/HistoryPanel.js";
import type {HistoryEntry} from "../../src/game/history.js";

const entry = (over: Partial<HistoryEntry> = {}): HistoryEntry => ({
	id: "a",
	n: 12,
	bag: [],
	origin: "dealt",
	code: "",
	tally: {},
	solved: true,
	...over,
});

const noop = vi.fn<(id: string) => void>();
const noopClear = vi.fn<() => void>();

describe("HistoryPanel", () => {
	it("invites a first solve when the list is empty", () => {
		render(<HistoryPanel history={[]} currentId={null} onReplay={noop} onDelete={noop} onClear={noopClear} />);
		expect(screen.getByText("Solve a puzzle and it lands here.")).toBeDefined();
	});

	it("hides the clear button while there is nothing to clear", () => {
		render(<HistoryPanel history={[]} currentId={null} onReplay={noop} onDelete={noop} onClear={noopClear} />);
		expect(screen.queryByText("Clear")).toBeNull();
	});

	it("summarises a row by where it came from, its plants and its best time", () => {
		render(
			<HistoryPanel
				history={[entry({tally: {p: 2}, best: 61_200, origin: "made"})]}
				currentId={null}
				onReplay={noop}
				onDelete={noop}
				onClear={noopClear}
			/>,
		);
		expect(screen.getByText("you made it · 2 plants · 1:01.2")).toBeDefined();
	});

	it("plays a puzzle again when its row is tapped", () => {
		const onReplay = vi.fn<(id: string) => void>();
		render(
			<HistoryPanel
				history={[entry({id: "x"})]}
				currentId={null}
				onReplay={onReplay}
				onDelete={noop}
				onClear={noopClear}
			/>,
		);
		fireEvent.click(screen.getByLabelText("Play the 12 piece puzzle again"));
		expect(onReplay).toHaveBeenCalledWith("x");
	});

	it("marks the row for the puzzle on screen", () => {
		const {container} = render(
			<HistoryPanel
				history={[entry({id: "x"}), entry({id: "y"})]}
				currentId="y"
				onReplay={noop}
				onDelete={noop}
				onClear={noopClear}
			/>,
		);
		expect(container.querySelectorAll(".hrow.cur")).toHaveLength(1);
	});

	// Clearing the list has no undo, so the button asks twice.
	it("asks twice before clearing the whole list", () => {
		const onClear = vi.fn<() => void>();
		render(<HistoryPanel history={[entry()]} currentId={null} onReplay={noop} onDelete={noop} onClear={onClear} />);
		fireEvent.click(screen.getByText("Clear"));
		expect(onClear).not.toHaveBeenCalled();
		fireEvent.click(screen.getByText("Tap again"));
		expect(onClear).toHaveBeenCalledOnce();
	});

	// Removing one row is a smaller thing and asks once.
	it("removes a single row on one tap", () => {
		const onDelete = vi.fn<(id: string) => void>();
		render(
			<HistoryPanel
				history={[entry({id: "x"})]}
				currentId={null}
				onReplay={noop}
				onDelete={onDelete}
				onClear={noopClear}
			/>,
		);
		fireEvent.click(screen.getByLabelText("Remove the 12 piece puzzle from this list"));
		expect(onDelete).toHaveBeenCalledWith("x");
	});
});
