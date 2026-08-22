/**
 * What the picked cell is, and how wide a span its number accepts.
 *
 * A range is stored as slack either side of whatever number the shape gives the cell, not as a
 * fixed pair, so it survives the shape around it changing while the design is still being drawn.
 */

import {kindAt, kindBlocked, type DesignState} from "../game/design.js";
import {labelShape} from "../game/generate.js";
import {KINDBLURB, KINDLABEL} from "../game/piece.js";
import type {Kind} from "../game/types.js";

/** The order the picker offers them in: the two common ones first, the awkward ones after. */
const ORDER: Kind[] = ["n", "s", "e", "p", "b"];

export interface KindPadProps {
	state: DesignState;
	onKind: (kind: Kind) => void;
	onRange: (end: "d" | "u", by: number) => void;
	/** Said out loud when a kind is refused, in place of the tool hint. */
	onRefuse: (why: string) => void;
}

export function KindPad({state, onKind, onRange, onRefuse}: KindPadProps) {
	const sel = state.sel;
	if (sel === null || !state.shape.has(sel)) {
		return <div className="dstat">Tap a building on the board to change what it is.</div>;
	}
	const current = kindAt(state, sel);
	const piece = labelShape(state.shape, state.kinds, state.masks, state.ranges).get(sel);
	if (!piece) return null;
	const slack = state.ranges.get(sel) ?? [0, 0];
	const canRange = current !== "b" && current !== "p";

	return (
		<>
			<div className="kpad">
				{ORDER.map((kind) => {
					const why = kindBlocked(state, sel, kind);
					return (
						<button
							type="button"
							key={kind}
							className={`kc${kind === current ? " on" : ""}${why === null ? "" : " no"}`}
							title={why ?? undefined}
							aria-label={`${KINDLABEL[kind]}: ${KINDBLURB[kind]}`}
							onClick={() => {
								if (why === null) onKind(kind);
								else onRefuse(why);
							}}
						>
							{KINDLABEL[kind]}
						</button>
					);
				})}
			</div>
			<div className="dstat">{KINDBLURB[current]}</div>
			{canRange && (
				<>
					<div className="rngrow">
						<span className="rngval">{piece.hi ? `${piece.v}–${piece.hi}` : piece.v}</span>
					</div>
					<div className="rng">
						<button
							type="button"
							className="rc"
							aria-label="Raise the low end"
							disabled={slack[0] <= 0}
							onClick={() => {
								onRange("d", -1);
							}}
						>
							&minus;
						</button>
						<span className="rlab">low</span>
						<button
							type="button"
							className="rc"
							aria-label="Lower the low end"
							disabled={slack[0] >= 4}
							onClick={() => {
								onRange("d", 1);
							}}
						>
							+
						</button>
						<button
							type="button"
							className="rc"
							aria-label="Lower the high end"
							disabled={slack[1] <= 0}
							onClick={() => {
								onRange("u", -1);
							}}
						>
							&minus;
						</button>
						<span className="rlab">high</span>
						<button
							type="button"
							className="rc"
							aria-label="Raise the high end"
							disabled={slack[1] >= 4}
							onClick={() => {
								onRange("u", 1);
							}}
						>
							+
						</button>
					</div>
					<div className="dstat">
						{piece.hi
							? `Any count from ${piece.v} to ${piece.hi} will do. A range feeds a sum building the count it lands on.`
							: "Widen it to accept a span of numbers instead of one."}
					</div>
				</>
			)}
		</>
	);
}
