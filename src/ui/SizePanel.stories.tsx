import type {Meta, StoryObj} from "@storybook/react-vite";
import {SizePanel} from "./SizePanel.js";
import "../styles/index.css";

const meta: Meta<typeof SizePanel> = {
	title: "Panels/SizePanel",
	component: SizePanel,
	decorators: [
		(Story) => (
			<div style={{maxWidth: 260}}>
				<Story />
			</div>
		),
	],
	args: {
		options: {special: true, walls: true, blank: true, power: true, ranges: true},
		onWant: () => {},
		onOption: () => {},
		onDeal: () => {},
	},
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Matching: Story = {
	args: {want: 12, current: 12},
};

/** Once the size has moved, dealing throws away the puzzle on screen, so the button says so. */
export const Pending: Story = {
	args: {want: 24, current: 12},
};

export const PlainPuzzles: Story = {
	args: {
		want: 12,
		current: 12,
		options: {special: false, walls: false, blank: false, power: false, ranges: false},
	},
};
