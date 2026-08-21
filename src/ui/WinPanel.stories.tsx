import type {Meta, StoryObj} from "@storybook/react-vite";
import {WinPanel} from "./WinPanel.js";
import "../styles/index.css";

const meta: Meta<typeof WinPanel> = {
	title: "Board/WinPanel",
	component: WinPanel,
	decorators: [
		(Story) => (
			<div style={{position: "relative", height: 320, maxWidth: 520}}>
				<Story />
			</div>
		),
	],
	args: {pieces: 12, onPeek: () => {}, onHarder: () => {}, onAgain: () => {}},
};

export default meta;
type Story = StoryObj<typeof meta>;

/** The first time a puzzle is solved there is nothing to compare against. */
export const FirstSolve: Story = {
	args: {time: 74_300, prevBest: 0, newBest: false},
};

export const NewBest: Story = {
	args: {time: 41_100, prevBest: 74_300, newBest: true},
};

export const SlowerThanBefore: Story = {
	args: {time: 88_000, prevBest: 41_100, newBest: false},
};
