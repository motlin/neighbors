/**
 * How big a cell may be.
 *
 * The board hugs its own tracks and the pane centres it, so the cell size is what decides whether
 * a puzzle fits across the pane or scrolls. It is measured rather than declared: the pane is a
 * fraction of the page, and the page is whatever the window is.
 */

import {useCallback, useEffect, useState} from "react";

const GAP = 4;
const MIN = 26;
const MAX = 64;
/** The padding on the scroller, which is not room for cells. */
const CHROME = 6;

function cellSizeFor(available: number, cols: number): number {
	return Math.max(MIN, Math.min(MAX, Math.floor((available - (cols - 1) * GAP) / cols)));
}

/**
 * Watches the pane and returns the cell size for `cols` columns. While `frozen` holds a size, that
 * size is returned instead: during a drag the cells must not resize, or the grid slides out from
 * under the finger.
 */
export function useBoardSize(
	cols: number,
	frozen: number | null,
): {
	paneRef: (node: HTMLElement | null) => void;
	size: number;
} {
	const [available, setAvailable] = useState(0);
	const [pane, setPane] = useState<HTMLElement | null>(null);

	const paneRef = useCallback((node: HTMLElement | null) => {
		setPane(node);
	}, []);

	useEffect(() => {
		if (!pane) return undefined;
		const measure = () => {
			setAvailable(Math.max(200, pane.clientWidth - CHROME));
		};
		measure();
		// ResizeObserver catches the pane changing for reasons the window never hears about: the
		// sidebar growing a panel, or the board itself gaining a scrollbar.
		if (typeof ResizeObserver === "undefined") return undefined;
		const ro = new ResizeObserver(measure);
		ro.observe(pane);
		return () => {
			ro.disconnect();
		};
	}, [pane]);

	return {paneRef, size: frozen ?? cellSizeFor(available || 640, cols)};
}
