/**
 * The board: a grid of cells covering the frame the pieces occupy plus one ring of room to grow
 * into. Both the played board and the designer's canvas are this component; what differs is the
 * cells handed to it.
 */

import {useEffect} from "react";
import type {CSSProperties, PointerEvent as ReactPointerEvent, ReactNode} from "react";
import type {Box} from "../game/geometry.js";
import {useBoardSize} from "./useBoardSize.js";

export interface BoardCell {
	key: string;
	className: string;
	label: string;
	content: ReactNode;
	/** Absent for a cell that is not a target: a void, or anything on a finished board. */
	onClick?: () => void;
}

export interface BoardGridProps {
	box: Box;
	/** In reading order across the box, left to right and top to bottom. */
	cells: BoardCell[];
	/** Set while a stroke is in progress, which stops the cells resizing mid-drag. */
	frozenSize?: number | null;
	/** Painting is a drag, so the board takes the pointer events rather than each cell. */
	paintable?: boolean;
	onPaintStart?: (e: ReactPointerEvent<HTMLDivElement>) => void;
	onPaintMove?: (e: ReactPointerEvent<HTMLDivElement>) => void;
	onPaintEnd?: () => void;
	/** Told the size the cells came out at, so a stroke can freeze it. */
	onSize?: (size: number) => void;
}

export function BoardGrid({
	box,
	cells,
	frozenSize = null,
	paintable = false,
	onPaintStart,
	onPaintMove,
	onPaintEnd,
	onSize,
}: BoardGridProps) {
	const cols = box.x1 - box.x0 + 1;
	const {paneRef, size} = useBoardSize(cols, frozenSize);
	useEffect(() => onSize?.(size), [onSize, size]);

	const style = {
		gridTemplateColumns: `repeat(${cols}, ${size}px)`,
		gridAutoRows: `${size}px`,
		// The board rules itself in cell-sized steps, so it has to be told what a cell came out at.
		"--cs": `${size}px`,
		"--fs": `${Math.round(size * 0.46)}px`,
	} as CSSProperties;

	return (
		<div className="scroller" ref={paneRef}>
			<div
				className={`board${size < 36 ? " tiny" : ""}${paintable ? " paintable" : ""}`}
				style={style}
				onPointerDown={onPaintStart}
				onPointerMove={onPaintMove}
				onPointerUp={onPaintEnd}
				onPointerCancel={onPaintEnd}
			>
				{cells.map((cell) =>
					cell.onClick ? (
						<button
							type="button"
							key={cell.key}
							data-cell={cell.key}
							className={cell.className}
							aria-label={cell.label}
							onClick={cell.onClick}
						>
							{cell.content}
						</button>
					) : (
						<div
							key={cell.key}
							data-cell={cell.key}
							className={cell.className}
							aria-label={cell.label || undefined}
						>
							{cell.content}
						</div>
					),
				)}
			</div>
		</div>
	);
}
