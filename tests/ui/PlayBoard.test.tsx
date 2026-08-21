// @vitest-environment jsdom
import {describe, expect, it, vi} from "vitest";
import {fireEvent, render, screen} from "@testing-library/react";
import {place, startPuzzle} from "../../src/game/play.js";
import {PlayBoard, playCells} from "../../src/ui/PlayBoard.js";

const AT = 1_000;

/** Two buildings that each want one neighbour: place them touching and the puzzle is solved. */
const pair = () => startPuzzle(["n1", "n1"]);

describe("playCells", () => {
	it("frames the board with one ring of room to grow into", () => {
		const view = playCells(place(pair(), 0, 0, AT));
		expect(view.box).toEqual({x0: -1, x1: 1, y0: -1, y1: 1});
		expect(view.cells).toHaveLength(9);
	});

	it("counts what is left, what is satisfied and what is beyond saving", () => {
		const one = place(pair(), 0, 0, AT);
		expect(playCells(one).tally).toEqual({left: 1, met: 0, dead: 0});
		expect(playCells(place(one, 1, 0, AT)).tally).toEqual({left: 0, met: 2, dead: 0});
	});

	it("counts a piece the bag can no longer save as unfixable", () => {
		// An 8 wants every side filled, and one piece left cannot get it there.
		const stuck = place(startPuzzle(["n8", "n8"]), 0, 0, AT);
		expect(playCells(stuck).tally.dead).toBe(1);
	});
});

describe("PlayBoard", () => {
	it("places on an open cell and takes a piece back on a placed one", () => {
		const onPlace = vi.fn<(x: number, y: number) => void>();
		const onErase = vi.fn<(x: number, y: number) => void>();
		const {rerender} = render(<PlayBoard view={playCells(pair())} onPlace={onPlace} onErase={onErase} />);
		fireEvent.click(screen.getAllByLabelText("Open cell")[0]!);
		expect(onPlace).toHaveBeenCalled();

		rerender(<PlayBoard view={playCells(place(pair(), 0, 0, AT))} onPlace={onPlace} onErase={onErase} />);
		fireEvent.click(screen.getByLabelText("Building 1, still short. Tap to take it back"));
		expect(onErase).toHaveBeenCalledWith(0, 0);
	});

	// A won board is a picture, not a puzzle: nothing on it is a button any more.
	it("offers nothing to tap once the puzzle is won", () => {
		const won = place(place(pair(), 0, 0, AT), 1, 0, AT);
		const {container} = render(
			<PlayBoard
				view={playCells(won)}
				onPlace={vi.fn<(x: number, y: number) => void>()}
				onErase={vi.fn<(x: number, y: number) => void>()}
			/>,
		);
		expect(container.querySelectorAll("button")).toHaveLength(0);
	});

	it("marks a cell a neighbour needs empty", () => {
		// Bit 4 is "right", so this piece insists the cell to its right stays empty.
		const closed = `n1.${1 << 4}`;
		const s = place({...startPuzzle([closed, "n1"]), sel: closed}, 0, 0, AT);
		render(
			<PlayBoard
				view={playCells(s)}
				onPlace={vi.fn<(x: number, y: number) => void>()}
				onErase={vi.fn<(x: number, y: number) => void>()}
			/>,
		);
		expect(screen.getByLabelText("Closed cell, a neighbour needs this empty")).toBeDefined();
	});
});
