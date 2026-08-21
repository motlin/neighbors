/**
 * The strip above the board: which tool is out while designing, what that tool does, and the
 * clock.
 *
 * The tool buttons only exist in the designer. While playing there is one thing to do with the
 * board, so the space goes to the hint and the clock instead.
 */

import {fmt} from "../game/clock.js";
import type {DesignTool} from "./DesignBoard.js";

const TOOLS: {mode: DesignTool; label: string}[] = [
	{mode: "place", label: "Draw"},
	{mode: "type", label: "Type"},
	{mode: "x", label: "Sides"},
];

export interface ToolbarProps {
	designing: boolean;
	tool: DesignTool;
	onTool: (tool: DesignTool) => void;
	/** What the tool does, or a refusal to explain why something did not happen. */
	hint: string;
	/** True when the hint is a refusal, which paints it red. */
	warn: boolean;
	/** Milliseconds on the clock, or null while it has not started. */
	time: number | null;
	stopped: boolean;
}

export function Toolbar({designing, tool, onTool, hint, warn, time, stopped}: ToolbarProps) {
	return (
		<div className="toolbar">
			{designing && (
				<div className="mode" role="group" aria-label="Tool">
					{TOOLS.map(({mode, label}) => (
						<button
							type="button"
							key={mode}
							className={`seg${mode === tool ? " on" : ""}`}
							onClick={() => {
								onTool(mode);
							}}
						>
							{label}
						</button>
					))}
				</div>
			)}
			<div className={`modehint${warn ? " warn" : ""}`}>{hint}</div>
			<span className={`clock${time === null ? "" : stopped ? " done" : " live"}`}>
				{time === null ? "" : fmt(time)}
			</span>
		</div>
	);
}

/** What each tool does, said in the toolbar so the pickers do not have to repeat it. */
export function toolHint(designing: boolean, tool: DesignTool): string {
	if (!designing) return "Pick one, then a cell. Tap a placed piece to take it back.";
	if (tool === "type") return "Tap a building, then choose what it is";
	if (tool === "x") return "Tap a building, then pick sides to close off";
	return "Draw next to your shape, tap one to remove it";
}
