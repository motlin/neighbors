import type {Meta, StoryObj} from "@storybook/react-vite";
import {HistoryPanel} from "./HistoryPanel.js";
import type {HistoryEntry} from "../game/history.js";
import "../styles/index.css";

const entry = (over: Partial<HistoryEntry>): HistoryEntry => ({
	id: "a",
	n: 12,
	bag: [],
	origin: "dealt",
	code: "",
	tally: {},
	solved: true,
	...over,
});

const meta: Meta<typeof HistoryPanel> = {
	title: "Panels/HistoryPanel",
	component: HistoryPanel,
	decorators: [
		(Story) => (
			<div style={{maxWidth: 260}}>
				<Story />
			</div>
		),
	],
	args: {currentId: null, onReplay: () => {}, onDelete: () => {}, onClear: () => {}},
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Empty: Story = {
	args: {history: []},
};

export const Solved: Story = {
	args: {
		history: [
			entry({id: "a", n: 15, best: 62_400, tally: {n: 13, p: 2}}),
			entry({id: "b", n: 12, origin: "made", best: 41_100}),
			entry({id: "c", n: 9}),
		],
		currentId: "b",
	},
};
