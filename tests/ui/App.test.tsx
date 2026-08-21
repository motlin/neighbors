// @vitest-environment jsdom
import {describe, expect, it} from "vitest";
import {fireEvent, render, screen} from "@testing-library/react";

import {App} from "../../src/ui/App.js";
import {memoryStore} from "../../src/game/storage.js";
import {serializeHistory} from "../../src/game/history.js";

/** The line under the board, whose numbers are split across their own elements. */
const readout = (container: HTMLElement) => container.querySelector("section .readout")?.textContent;

describe("App", () => {
	it("opens on a dealt puzzle with everything still in the bag", () => {
		const {container} = render(<App store={memoryStore()} />);
		expect(screen.getByText("Neighbors")).toBeDefined();
		expect(screen.getByText("this puzzle")).toBeDefined();
		expect(readout(container)).toBe("12 left to place · 0 satisfied");
	});

	it("swaps the sidebar and the tools when the designer opens", () => {
		render(<App store={memoryStore()} />);
		expect(screen.queryByText("Your design")).toBeNull();

		fireEvent.click(screen.getByText("Design a level"));
		expect(screen.getByText("Your design")).toBeDefined();
		expect(screen.getByText("Draw")).toBeDefined();
		// The size panel and the bag belong to the puzzle, not to the design.
		expect(screen.queryByText("Puzzle size")).toBeNull();

		fireEvent.click(screen.getByText("Back to playing"));
		expect(screen.getByText("Puzzle size")).toBeDefined();
	});

	it("says what the tool out in the designer does", () => {
		render(<App store={memoryStore()} />);
		fireEvent.click(screen.getByText("Design a level"));
		expect(screen.getByText("Draw next to your shape, tap one to remove it")).toBeDefined();
		fireEvent.click(screen.getByText("Type"));
		expect(screen.getByText("Tap a building, then choose what it is")).toBeDefined();
	});

	// A saved entry's size is recounted from its bag rather than trusted, so a nine written next to
	// a two piece bag comes back as a two.
	it("lists a solved puzzle that was saved on an earlier visit", () => {
		const store = memoryStore({
			history: serializeHistory([
				{id: "old", n: 9, bag: ["n1", "n1"], origin: "made", code: "", tally: {n: 2}, solved: true},
			]),
		});
		render(<App store={store} />);
		expect(screen.getByLabelText("Play the 2 piece puzzle again")).toBeDefined();
		expect(screen.getByText("you made it")).toBeDefined();
	});

	it("deals a puzzle of the size asked for", () => {
		const {container} = render(<App store={memoryStore()} />);
		fireEvent.change(screen.getByLabelText("Pieces per puzzle"), {target: {value: "7"}});
		fireEvent.click(screen.getByText("Deal 7 buildings"));
		expect(readout(container)).toBe("7 left to place · 0 satisfied");
	});

	it("has nothing to undo on a fresh puzzle", () => {
		render(<App store={memoryStore()} />);
		expect(screen.getByText("Undo").hasAttribute("disabled")).toBe(true);
	});
});
