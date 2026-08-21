/**
 * The board is sparse and unbounded: cells are keyed by string rather than indexed into a grid, so
 * a puzzle can grow in any direction without anything being re-based. Everything below works in
 * those keys.
 */

import type {Key, Shape} from "./types.js";

export const key = (x: number, y: number): Key => `${x},${y}`;

export function xy(k: Key): [number, number] {
	const comma = k.indexOf(",");
	return [Number(k.slice(0, comma)), Number(k.slice(comma + 1))];
}

/**
 * The eight cells touching this one, corners included, in reading order. Direction `i` and
 * direction `7 - i` are opposites, which is what lets a closed-side mask be read from either end:
 * a piece closes side `i`, and the cell on that side looks back along `7 - i` to find it.
 */
export function around(x: number, y: number): [number, number][] {
	const out: [number, number][] = [];
	for (let dy = -1; dy <= 1; dy++) {
		for (let dx = -1; dx <= 1; dx++) {
			if (dx || dy) out.push([x + dx, y + dy]);
		}
	}
	return out;
}

export const DIRNAME = [
	"top left",
	"top",
	"top right",
	"left",
	"right",
	"bottom left",
	"bottom",
	"bottom right",
] as const;

export interface Box {
	x0: number;
	x1: number;
	y0: number;
	y1: number;
}

/** The frame to draw, which is the occupied cells plus one ring of room to grow into. */
export function bounds(keys: readonly Key[]): Box {
	if (!keys.length) return {x0: 0, x1: 0, y0: 0, y1: 0};
	let x0 = Infinity;
	let x1 = -Infinity;
	let y0 = Infinity;
	let y1 = -Infinity;
	for (const k of keys) {
		const [x, y] = xy(k);
		if (x < x0) x0 = x;
		if (x > x1) x1 = x;
		if (y < y0) y0 = y;
		if (y > y1) y1 = y;
	}
	return {x0: x0 - 1, x1: x1 + 1, y0: y0 - 1, y1: y1 + 1};
}

/**
 * How many separate pieces the shape falls into. A design has to be one piece: the puzzle is
 * played by adding a building at a time next to what is already down, so a shape in two parts
 * could never be built.
 */
export function connectedCount(shape: Shape): number {
	const seen = new Set<Key>();
	let parts = 0;
	for (const start of shape) {
		if (seen.has(start)) continue;
		parts++;
		const stack = [start];
		seen.add(start);
		while (stack.length) {
			const [x, y] = xy(stack.pop()!);
			for (const [a, b] of around(x, y)) {
				const k = key(a, b);
				if (shape.has(k) && !seen.has(k)) {
					seen.add(k);
					stack.push(k);
				}
			}
		}
	}
	return parts;
}
