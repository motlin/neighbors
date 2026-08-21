/**
 * The designer's canvas.
 *
 * Drawing is a drag, not a series of taps, so the board takes the pointer events and finds the
 * cell under the finger itself. Two things are frozen for the length of a stroke: the frame being
 * drawn, and the size of a cell. Either one changing mid-drag would slide the grid out from under
 * the finger, and the cell that was under it a moment ago would no longer be.
 *
 * The frozen frame is padded when the stroke starts, so a single drag can reach a few cells past
 * the shape. Reaching further than that ends where the padding does; lift and draw again.
 */

import {useCallback, useRef, useState} from "react";
import type {PointerEvent as ReactPointerEvent} from "react";
import {bounds, key, xy, type Box} from "../game/geometry.js";
import {designForbidden, shapeLegal, type DesignState} from "../game/design.js";
import {labelShape} from "../game/generate.js";
import {describePiece} from "../game/piece.js";
import {powerState} from "../game/rules.js";
import {BoardGrid, type BoardCell} from "./BoardGrid.js";
import {CellFace, kindClass, maskLabel, NoGo} from "./CellFace.js";

/** How far past the shape a single stroke can reach. */
const PAD = 3;

export type DesignTool = "place" | "type" | "x";

export interface DesignBoardProps {
	state: DesignState;
	tool: DesignTool;
	onStrokeStart: (x: number, y: number) => void;
	onStrokePaint: (x: number, y: number) => void;
	onStrokeEnd: () => void;
	onSelect: (x: number, y: number) => void;
}

/** The cell under a screen point, and whether it is part of the shape. */
function cellUnder(cx: number, cy: number): {x: number; y: number} | null {
	const t = document.elementFromPoint(cx, cy);
	const at = t?.closest("[data-cell]")?.getAttribute("data-cell");
	if (at === null || at === undefined) return null;
	const [x, y] = xy(at);
	return {x, y};
}

function designCells(state: DesignState, tool: DesignTool, box: Box): BoardCell[] {
	const labels = labelShape(state.shape, state.kinds, state.masks, state.ranges);
	const pw = powerState(labels);
	const cells: BoardCell[] = [];
	for (let y = box.y0; y <= box.y1; y++) {
		for (let x = box.x0; x <= box.x1; x++) {
			const k = key(x, y);
			const p = labels.get(k);
			if (state.shape.has(k) && p) {
				const label = `${describePiece(p)}${maskLabel(p.m)}`;
				const picking = tool !== "place";
				cells.push({
					key: k,
					className:
						`cell cube design${kindClass(p)}${k === state.sel ? " picked" : ""}` +
						(picking ? " pickable" : " erasable"),
					label: picking
						? `${tool === "type" ? "Choose type" : "Choose sides"} for ${label}`
						: `${label}. Tap to remove`,
					content: <CellFace piece={p} lit={pw.powered.has(k)} />,
				});
				continue;
			}
			const forbidden = designForbidden(state, x, y);
			if (tool === "place" && shapeLegal(state, x, y)) {
				cells.push({
					key: k,
					className: `cell open${forbidden ? " no" : ""}`,
					label: forbidden ? "Closed cell" : "Add a building here",
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
	return cells;
}

export function DesignBoard({state, tool, onStrokeStart, onStrokePaint, onStrokeEnd, onSelect}: DesignBoardProps) {
	// Held for the length of a stroke and dropped on lift; see the note at the top of the file.
	const [frozen, setFrozen] = useState<{box: Box; size: number} | null>(null);
	const size = useRef(48);

	const live = bounds([...state.shape]);
	const box = frozen?.box ?? live;
	// Under the type and sides tools a tap picks a cell. Under the draw tool the cells stay inert
	// and the board handles the drag: a per-cell click would fire again on lift and undraw it.
	const cells = designCells(state, tool, box).map((cell) => {
		if (!cell.className.includes("pickable")) return cell;
		const [x, y] = xy(cell.key);
		return {
			...cell,
			onClick: () => {
				onSelect(x, y);
			},
		};
	});

	const start = (e: ReactPointerEvent<HTMLDivElement>) => {
		if (tool !== "place") return;
		const hit = cellUnder(e.clientX, e.clientY);
		if (!hit) return;
		e.preventDefault();
		setFrozen({
			box: {x0: live.x0 - PAD, x1: live.x1 + PAD, y0: live.y0 - PAD, y1: live.y1 + PAD},
			size: size.current,
		});
		onStrokeStart(hit.x, hit.y);
	};

	const move = (e: ReactPointerEvent<HTMLDivElement>) => {
		if (!state.stroke) return;
		const hit = cellUnder(e.clientX, e.clientY);
		if (hit) onStrokePaint(hit.x, hit.y);
	};

	const end = () => {
		if (!state.stroke) return;
		setFrozen(null);
		onStrokeEnd();
	};

	const noteSize = useCallback((s: number) => {
		size.current = s;
	}, []);

	return (
		<BoardGrid
			box={box}
			cells={cells}
			frozenSize={frozen?.size ?? null}
			paintable={tool === "place"}
			onPaintStart={start}
			onPaintMove={move}
			onPaintEnd={end}
			onSize={noteSize}
		/>
	);
}
