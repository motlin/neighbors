/**
 * Which of the picked cell's eight sides must stay empty.
 *
 * The pad is the cell and its neighbourhood: the middle square is the cell itself, showing its
 * number, and the eight around it are its sides in the same arrangement they have on the board. A
 * side with something already on it is not a side that can be insisted stay empty, so it shows a
 * dot and does nothing.
 */

import {around, DIRNAME, key, xy} from "../game/geometry.js";
import {kindAt, type DesignState} from "../game/design.js";
import {labelShape} from "../game/generate.js";
import {KINDLABEL} from "../game/piece.js";

export interface SidesPadProps {
	state: DesignState;
	onToggle: (dir: number) => void;
}

export function SidesPad({state, onToggle}: SidesPadProps) {
	const sel = state.sel;
	if (sel === null || !state.shape.has(sel)) {
		return <div className="dstat">Tap a building on the board to choose its sides.</div>;
	}
	const kind = kindAt(state, sel);
	if (kind === "b" || kind === "p") {
		return <div className="dstat">{`${KINDLABEL[kind]}s have no closed sides.`}</div>;
	}
	const [x, y] = xy(sel);
	const nb = around(x, y);
	const mask = state.masks.get(sel) ?? 0;
	const piece = labelShape(state.shape, state.kinds, state.masks, state.ranges).get(sel);
	if (!piece) return null;

	// Nine squares, the middle one being the cell itself, so the eight sides sit where they do on
	// the board.
	const squares = [];
	let dir = 0;
	for (let r = 0; r < 3; r++) {
		for (let c = 0; c < 3; c++) {
			if (r === 1 && c === 1) {
				squares.push(
					<span className="xc mid" key="mid">
						{piece.hi ? `${piece.v}-${piece.hi}` : piece.v}
					</span>,
				);
				continue;
			}
			const i = dir++;
			const cell = nb[i] ?? [0, 0];
			const taken = state.shape.has(key(cell[0], cell[1]));
			const on = Boolean((mask >> i) & 1);
			squares.push(
				<button
					type="button"
					key={i}
					className={`xc${on ? " on" : ""}${taken ? " taken" : ""}`}
					disabled={taken}
					aria-label={`${DIRNAME[i]}${on ? ", closed" : ""}`}
					onClick={() => {
						onToggle(i);
					}}
				>
					{taken ? <b className="dot" /> : on ? <span className="xg pad" /> : null}
				</button>,
			);
		}
	}

	return (
		<>
			<div className="xpad">{squares}</div>
			<div className="dstat">{mask ? "Marked sides must stay empty." : "Tap a side to close it off."}</div>
		</>
	);
}
