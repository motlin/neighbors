// @vitest-environment jsdom
import {describe, expect, it, vi} from "vitest";
import {fireEvent, render, screen} from "@testing-library/react";
import {BagPanel} from "../../src/ui/BagPanel.js";

describe("BagPanel", () => {
	it("says so when there is nothing left", () => {
		render(<BagPanel bag={{}} selected={null} onPick={null} emptyMessage="Everything placed." />);
		expect(screen.getByText("Everything placed.")).toBeDefined();
	});

	it("shows a tile per piece, with how many are left", () => {
		render(
			<BagPanel bag={{n1: 3, n2: 1}} selected={null} onPick={vi.fn<(id: string) => void>()} emptyMessage="" />,
		);
		expect(screen.getByLabelText("3 of: Building 1")).toBeDefined();
		expect(screen.getByLabelText("1 of: Building 2")).toBeDefined();
	});

	it("hides a piece the bag has run out of", () => {
		render(
			<BagPanel bag={{n1: 0, n2: 1}} selected={null} onPick={vi.fn<(id: string) => void>()} emptyMessage="" />,
		);
		expect(screen.queryByLabelText(/of: Building 1/)).toBeNull();
	});

	// A plant is not a building, and picking one up because it sorted next to a 3 is a bad surprise.
	it("puts the power plants under a label of their own", () => {
		render(
			<BagPanel bag={{n2: 1, p3: 1}} selected={null} onPick={vi.fn<(id: string) => void>()} emptyMessage="" />,
		);
		expect(screen.getByText("Power plants")).toBeDefined();
	});

	it("marks the selected piece", () => {
		const {container} = render(
			<BagPanel bag={{n1: 1, n2: 1}} selected="n2" onPick={vi.fn<(id: string) => void>()} emptyMessage="" />,
		);
		expect(container.querySelector(".tile.on")?.getAttribute("aria-label")).toBe("1 of: Building 2");
	});

	it("reports which piece was picked", () => {
		const onPick = vi.fn<(id: string) => void>();
		render(<BagPanel bag={{n1: 1, n2: 1}} selected={null} onPick={onPick} emptyMessage="" />);
		fireEvent.click(screen.getByLabelText("1 of: Building 2"));
		expect(onPick).toHaveBeenCalledWith("n2");
	});

	// The designer's preview of what a shape would deal is the same panel, but nothing there is
	// pickable, so the tiles are not buttons.
	it("renders inert tiles when nothing can be picked", () => {
		const {container} = render(<BagPanel bag={{n1: 1}} selected={null} onPick={null} emptyMessage="" />);
		expect(container.querySelector("button")).toBeNull();
		expect(container.querySelector(".tile.static")).not.toBeNull();
	});

	it("writes a range and a closed side into the label", () => {
		render(<BagPanel bag={{"n2~4.16": 1}} selected={null} onPick={null} emptyMessage="" />);
		expect(screen.getByLabelText("1 of: Building 2 to 4, sides closed: right")).toBeDefined();
	});
});
