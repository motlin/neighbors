/**
 * What is drawn inside a cell or a bag tile: the number, the bolt, the ticks on the sides it
 * closed, and the cross on a cell that must stay empty.
 *
 * All four are drawn rather than typed. The cross is two square-ended strokes at exact 45 degrees,
 * because a typed × sits differently in every font and never quite lines up with the grid.
 */

import {DIRNAME} from "../game/geometry.js";
import type {Piece} from "../game/types.js";

/** The number, sized down as it gets longer so a span like 2-4 still fits the cell. */
function NumberLabel({piece}: {piece: Piece}) {
	const text = piece.hi ? `${piece.v}-${piece.hi}` : String(piece.v);
	const cls = text.length > 4 ? " four" : text.length > 2 ? " three" : piece.v > 9 ? " two" : "";
	return <span className={`num${cls}`}>{text}</span>;
}

export function Bolt({lit = false}: {lit?: boolean}) {
	return <i className={lit ? "blt lit" : "blt"} aria-hidden="true" />;
}

export function SideMarks({mask}: {mask: number}) {
	if (!mask) return null;
	return (
		<>
			{DIRNAME.map((_, i) =>
				(mask >> i) & 1 ? <i key={i} className={`xm xg d${i}`} aria-hidden="true" /> : null,
			)}
		</>
	);
}

export function NoGo() {
	return <span className="nogo xg" aria-hidden="true" />;
}

/** How a closed-side mask reads out loud, appended to whatever the cell is called. */
export const maskLabel = (m: number): string =>
	m ? `, sides closed: ${DIRNAME.filter((_, i) => (m >> i) & 1).join(", ")}` : "";

/** The class that colours a cell or tile by what kind of piece is on it. */
export const kindClass = (p: Piece): string =>
	p.k === "s" ? " sum" : p.k === "b" ? " blank" : p.k === "p" ? " plant" : p.k === "e" ? " bolt" : "";

/** A blank shows nothing at all; everything else shows its number. */
export function CellFace({piece, lit = false, forbidden = false}: {piece: Piece; lit?: boolean; forbidden?: boolean}) {
	if (piece.k === "b") return null;
	return (
		<>
			<NumberLabel piece={piece} />
			{piece.k === "e" && <Bolt lit={lit} />}
			<SideMarks mask={piece.m} />
			{forbidden && <NoGo />}
		</>
	);
}
