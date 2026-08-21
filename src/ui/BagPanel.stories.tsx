import type {Meta, StoryObj} from "@storybook/react-vite";
import {BagPanel} from "./BagPanel.js";
import "../styles/index.css";

const meta: Meta<typeof BagPanel> = {
	title: "Panels/BagPanel",
	component: BagPanel,
	decorators: [
		(Story) => (
			<div className="panel" style={{maxWidth: 260}}>
				<h2>Buildings</h2>
				<div className="bag">
					<Story />
				</div>
			</div>
		),
	],
	args: {selected: null, onPick: () => {}, emptyMessage: "Everything placed."},
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Plain: Story = {
	args: {bag: {n1: 2, n2: 3, n3: 1, n5: 1}, selected: "n2"},
};

/** Every kind at once: a sum, a blank, a bolt, a range, a closed side, and a plant below the fold. */
export const EveryKind: Story = {
	args: {bag: {n2: 2, "n3~5": 1, "n4.16": 1, s7: 1, b0: 2, e2: 1, p3: 1}, selected: "s7"},
};

export const Empty: Story = {
	args: {bag: {}},
};

/** The designer's preview of what a shape would deal. Nothing here is pickable. */
export const Preview: Story = {
	args: {bag: {n1: 1, n2: 4, n3: 2, p2: 1}, onPick: null, emptyMessage: "Nothing drawn yet."},
};
