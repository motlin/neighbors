/**
 * The panel that covers the board on a solve.
 *
 * It offers the same size again and three more, because the honest next question after finishing a
 * puzzle is whether that was the right size, and it can be pushed aside to look at the finished
 * board.
 */

import {fmt} from "../game/clock.js";

export interface WinPanelProps {
	pieces: number;
	/** The solve time in milliseconds, or zero for a puzzle finished without the clock running. */
	time: number;
	/** The best before this solve, for the line under the time. */
	prevBest: number;
	newBest: boolean;
	onPeek: () => void;
	onHarder: () => void;
	onAgain: () => void;
}

export function WinPanel({pieces, time, prevBest, newBest, onPeek, onHarder, onAgain}: WinPanelProps) {
	return (
		<div className="win">
			<h3>Solved</h3>
			<div className="wintime">
				{time > 0 && <b>{fmt(time)}</b>}
				{newBest ? (
					<span className="pb">new best, was {fmt(prevBest)}</span>
				) : prevBest > 0 && prevBest <= time ? (
					<span className="pbq">best {fmt(prevBest)}</span>
				) : null}
			</div>
			<p>All {pieces} pieces agree with their neighbours.</p>
			<div className="controls" style={{justifyContent: "center"}}>
				<button type="button" className="act" onClick={onPeek}>
					See the board
				</button>
				<button type="button" className="act" onClick={onHarder}>
					Add 3 more
				</button>
				<button type="button" className="act" onClick={onAgain}>
					Same size again
				</button>
			</div>
		</div>
	);
}
