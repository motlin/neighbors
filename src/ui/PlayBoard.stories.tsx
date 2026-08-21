import type {Meta, StoryObj} from "@storybook/react-vite";
import {PlayBoard, playCells} from "./PlayBoard.js";
import {place, startPuzzle, type PlayState} from "../game/play.js";
import type {Pid} from "../game/types.js";
import "../styles/index.css";

const AT = 1_000;

/** Play a list of moves onto a puzzle, so a story can describe a board by how it was reached. */
function played(bag: Pid[], moves: [Pid, number, number][]): PlayState {
	let s = startPuzzle(bag);
	for (const [id, x, y] of moves) s = place({...s, sel: id}, x, y, AT);
	return s;
}

const meta: Meta<typeof PlayBoard> = {
	title: "Board/PlayBoard",
	component: PlayBoard,
	decorators: [
		(Story) => (
			<div style={{maxWidth: 520}}>
				<Story />
			</div>
		),
	],
	args: {onPlace: () => {}, onErase: () => {}},
};

export default meta;
type Story = StoryObj<typeof meta>;

/** Nothing placed yet: one open cell in the middle of an empty frame. */
export const Fresh: Story = {
	args: {view: playCells(startPuzzle(["n1", "n2", "n2", "n1"]))},
};

/** Cyan is a number that agrees with its neighbours; plain is one still waiting. */
export const InProgress: Story = {
	args: {
		view: playCells(
			played(
				["n1", "n2", "n3", "n2", "n2"],
				[
					["n2", 0, 0],
					["n3", 1, 0],
					["n2", 2, 0],
				],
			),
		),
	},
};

/** Red means no piece left in the bag can save it, so something has to come back out. */
export const Unfixable: Story = {
	args: {
		view: playCells(
			played(
				["n8", "n1", "n1"],
				[
					["n8", 0, 0],
					["n1", 1, 0],
				],
			),
		),
	},
};

/** A plant is amber while it is working, and the bolts it carries light up. */
export const Powered: Story = {
	args: {
		view: playCells(
			played(
				["p2", "e1", "e1"],
				[
					["p2", 0, 0],
					["e1", 1, 0],
					["e1", -1, 0],
				],
			),
		),
	},
};

/** Solved: nothing on the board is a button any more. */
export const Solved: Story = {
	args: {
		view: playCells(
			played(
				["n1", "n1"],
				[
					["n1", 0, 0],
					["n1", 1, 0],
				],
			),
		),
	},
};
