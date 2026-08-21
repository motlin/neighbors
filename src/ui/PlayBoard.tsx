/**
 * The played board.
 *
 * Every cell is coloured by what it is doing: cyan when its number is satisfied, red when nothing
 * left in the bag can save it, plain when it is still waiting. The red is the point of the game --
 * it says a mistake happened several moves ago, and which piece to pull back out.
 *
 * `playCells` does the reading and the component does the drawing, so the readout underneath can
 * be handed the same pass rather than repeating it.
 */

import {bounds, key, xy, type Box} from "../game/geometry.js";
import {describePiece} from "../game/piece.js";
import {forbiddenAt, isLegal, powerState, RED, remainingOf, statusOf} from "../game/rules.js";
import {BoardGrid, type BoardCell} from "./BoardGrid.js";
import {CellFace, kindClass, maskLabel, NoGo} from "./CellFace.js";
import type {PlayState} from "../game/play.js";
import type {Status} from "../game/types.js";

/** How each status reads out loud, for the label a screen reader gets. */
const WHY: Record<Status, string> = {
	met: "satisfied",
	short: "still short",
	over: "too many neighbours",
	starved: "can no longer reach its number",
	blocked: "a closed side is occupied",
	clash: "touching another plant",
	overload: "more buildings than it can power",
	unpowered: "no working plant next door",
};

export interface PlayTally {
	/** How many pieces are still in the bag. */
	left: number;
	/** How many placed pieces are satisfied. */
	met: number;
	/** How many are beyond saving. */
	dead: number;
}

export interface PlayView {
	box: Box;
	cells: BoardCell[];
	tally: PlayTally;
}

/** What kind of target a cell is, which is also how the tap is wired. */
type Target = "erase" | "place" | "none";

const targetOf = (className: string): Target =>
	className.includes("erasable") ? "erase" : className.startsWith("cell open") ? "place" : "none";

export function playCells(state: PlayState): PlayView {
	const box = bounds([...state.board.keys()]);
	let left = 0;
	for (const id in state.bag) left += state.bag[id] ?? 0;
	const rem = remainingOf(state.bag);
	const pw = powerState(state.board);
	const cells: BoardCell[] = [];
	let dead = 0;
	let met = 0;

	for (let y = box.y0; y <= box.y1; y++) {
		for (let x = box.x0; x <= box.x1; x++) {
			const k = key(x, y);
			const forbidden = forbiddenAt(state.board, x, y);
			const piece = state.board.get(k);
			if (piece) {
				const st = statusOf(state.board, x, y, rem, pw);
				const shade = RED.has(st) ? "dead" : st;
				if (shade === "dead") dead++;
				if (st === "met") met++;
				// A won board is a picture, not a puzzle: nothing on it can be taken back.
				const live = !state.won;
				cells.push({
					key: k,
					className:
						`cell cube ${shade}${kindClass(piece)}` +
						`${k === state.just ? " just" : ""}${live ? " erasable" : ""}${forbidden ? " onno" : ""}`,
					label: `${describePiece(piece)}, ${WHY[st]}${maskLabel(piece.m)}${live ? ". Tap to take it back" : ""}`,
					content: <CellFace piece={piece} lit={pw.powered.has(k)} forbidden={forbidden} />,
				});
				continue;
			}
			if (!state.won && left > 0 && isLegal(state.board, x, y)) {
				cells.push({
					key: k,
					className: `cell open${forbidden ? " no" : ""}`,
					label: forbidden ? "Closed cell, a neighbour needs this empty" : "Open cell",
					content: forbidden ? <NoGo /> : null,
				});
				continue;
			}
			cells.push({
				key: k,
				className: `cell void${forbidden ? " no" : ""}`,
				label: "",
				content: forbidden ? <NoGo /> : null,
			});
		}
	}
	return {box, cells, tally: {left, met, dead}};
}

export interface PlayBoardProps {
	view: PlayView;
	onPlace: (x: number, y: number) => void;
	onErase: (x: number, y: number) => void;
}

export function PlayBoard({view, onPlace, onErase}: PlayBoardProps) {
	const cells = view.cells.map((cell) => {
		const target = targetOf(cell.className);
		if (target === "none") return cell;
		const [x, y] = xy(cell.key);
		return {
			...cell,
			onClick: () => {
				if (target === "erase") onErase(x, y);
				else onPlace(x, y);
			},
		};
	});
	return <BoardGrid box={view.box} cells={cells} />;
}
