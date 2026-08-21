import type {Meta, StoryObj} from "@storybook/react-vite";
import {DesignPanel} from "./DesignPanel.js";
import {emptyDesign, select, setKind, strokeEnd, strokePaint, strokeStart, type DesignState} from "../game/design.js";
import "../styles/index.css";

/** Draw a block the way a finger would, then hand back the finished design. */
function block(w: number, h: number): DesignState {
	let s = strokeStart(emptyDesign(), 0, 0);
	for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) s = strokePaint(s, x, y);
	return strokeEnd(s);
}

const meta: Meta<typeof DesignPanel> = {
	title: "Panels/DesignPanel",
	component: DesignPanel,
	decorators: [
		(Story) => (
			<div style={{maxWidth: 260}}>
				<Story />
			</div>
		),
	],
	args: {
		tool: "place",
		onPlay: () => {},
		onClear: () => {},
		onKind: () => {},
		onRange: () => {},
		onToggleSide: () => {},
		onRefuse: () => {},
		onLoad: () => true,
	},
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Blank: Story = {
	args: {state: emptyDesign()},
};

/** Under the minimum, so the shape cannot be played yet. */
export const TooSmall: Story = {
	args: {state: block(3, 1)},
};

export const Ready: Story = {
	args: {state: block(4, 3)},
};

/** A plant with nothing to power would sit satisfied whatever the player did. */
export const IdlePlant: Story = {
	args: {state: setKind(select(block(4, 3), 0, 0), "p")},
};

/** The type picker, out over the cell that was tapped. */
export const PickingType: Story = {
	args: {state: select(block(4, 3), 1, 1), tool: "type"},
};

/** The sides picker: the middle square is the cell, the eight around it are its sides. */
export const PickingSides: Story = {
	args: {state: select(block(4, 3), 0, 0), tool: "x"},
};
