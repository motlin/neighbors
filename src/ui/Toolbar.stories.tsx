import type {Meta, StoryObj} from "@storybook/react-vite";
import {Toolbar} from "./Toolbar.js";
import "../styles/index.css";

const meta: Meta<typeof Toolbar> = {
	title: "Board/Toolbar",
	component: Toolbar,
	decorators: [
		(Story) => (
			<div style={{maxWidth: 520}}>
				<Story />
			</div>
		),
	],
	args: {onTool: () => {}, warn: false, stopped: false},
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Playing: Story = {
	args: {
		designing: false,
		tool: "place",
		hint: "Pick one, then a cell. Tap a placed piece to take it back.",
		time: 74_300,
	},
};

/** The clock turns cyan and stops on the solve. */
export const Solved: Story = {
	args: {...Playing.args, stopped: true},
};

export const Designing: Story = {
	args: {designing: true, tool: "type", hint: "Tap a building, then choose what it is", time: null},
};

/** A refusal takes over the hint for a couple of seconds, in red. */
export const Refused: Story = {
	args: {designing: true, tool: "type", hint: "Power plants can’t touch each other", warn: true, time: null},
};
