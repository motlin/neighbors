// @vitest-environment jsdom
import {describe, expect, it, vi} from "vitest";
import {fireEvent, render, screen} from "@testing-library/react";
import {SizePanel} from "../../src/ui/SizePanel.js";
import {MAX_PIECES, MIN_PIECES, type Options} from "../../src/game/generate.js";

const ALL_ON: Options = {special: true, walls: true, blank: true, power: true, ranges: true};

const props = {
	want: 12,
	current: 12,
	options: ALL_ON,
	onWant: vi.fn<(n: number) => void>(),
	onOption: vi.fn<(key: keyof Options, on: boolean) => void>(),
	onDeal: vi.fn<() => void>(),
};

describe("SizePanel", () => {
	// Once the size has moved away from the puzzle on screen, dealing throws that puzzle away, so
	// the button says what it is about to do rather than just "New puzzle".
	it("names the size it would deal once the size has moved", () => {
		const {rerender} = render(<SizePanel {...props} />);
		expect(screen.getByText("New puzzle")).toBeDefined();
		rerender(<SizePanel {...props} want={20} />);
		expect(screen.getByText("Deal 20 buildings")).toBeDefined();
	});

	it("steps the size up and down", () => {
		const onWant = vi.fn<(n: number) => void>();
		render(<SizePanel {...props} onWant={onWant} />);
		fireEvent.click(screen.getByLabelText("More pieces"));
		expect(onWant).toHaveBeenCalledWith(13);
		fireEvent.click(screen.getByLabelText("Fewer pieces"));
		expect(onWant).toHaveBeenCalledWith(11);
	});

	it("stops stepping at the ends", () => {
		const {rerender} = render(<SizePanel {...props} want={MIN_PIECES} />);
		expect(screen.getByLabelText("Fewer pieces").hasAttribute("disabled")).toBe(true);
		rerender(<SizePanel {...props} want={MAX_PIECES} />);
		expect(screen.getByLabelText("More pieces").hasAttribute("disabled")).toBe(true);
	});

	it("reports a setting being switched off", () => {
		const onOption = vi.fn<(key: keyof Options, on: boolean) => void>();
		render(<SizePanel {...props} onOption={onOption} />);
		fireEvent.click(screen.getByLabelText("Include power plants"));
		expect(onOption).toHaveBeenCalledWith("power", false);
	});

	it("deals when asked", () => {
		const onDeal = vi.fn<() => void>();
		render(<SizePanel {...props} onDeal={onDeal} />);
		fireEvent.click(screen.getByText("New puzzle"));
		expect(onDeal).toHaveBeenCalledOnce();
	});
});
