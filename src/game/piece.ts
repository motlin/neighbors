/**
 * A piece and its string id. The id is what a bag counts, what history saves and what the tile in
 * the sidebar is keyed by, so it has to survive JSON and a round trip through storage.
 */

import type {Kind, Piece, Pid} from "./types.js";

/** In the order the share code writes them; the index is the three bit kind field. */
export const KINDS: readonly Kind[] = ["n", "s", "b", "p", "e"];

export const KINDLABEL: Readonly<Record<Kind, string>> = {
	n: "Plain",
	s: "Sum",
	b: "Blank",
	p: "Power plant",
	e: "Powered",
};

export const KINDBLURB: Readonly<Record<Kind, string>> = {
	n: "Wants that many buildings touching it.",
	s: "A sum building. Wants the numbers touching it to add up to its own.",
	b: "Wants nothing at all. Happy anywhere.",
	p: "Carries every building touching it, up to its number. Other plants don’t count.",
	e: "Wants that many neighbours, and needs a working plant next door.",
};

/** The order the bag lists kinds in: plain, powered, sum, plant, blank. */
export const KORDER: Readonly<Record<Kind, number>> = {n: 0, e: 1, s: 2, p: 3, b: 4};

export const pid = (p: Piece): Pid => p.k + p.v + (p.hi ? `~${p.hi}` : "") + (p.m ? `.${p.m}` : "");

const PID = /^([nsbpe])(\d+)(?:~(\d+))?(?:\.(\d+))?$/;

/**
 * Ids come back out of saved history and out of pasted share codes, so a bad one is a normal
 * thing to meet rather than a bug. It becomes a plain 1 instead of throwing.
 */
export function unpid(str: string): Piece {
	const g = PID.exec(str);
	if (!g) return {k: "n", v: 1, hi: 0, m: 0};
	return {
		k: g[1] as Kind,
		v: Number(g[2]),
		hi: g[3] ? Number(g[3]) : 0,
		m: g[4] ? Number(g[4]) : 0,
	};
}

export const low = (p: Piece): number => p.v;
export const high = (p: Piece): number => p.hi || p.v;

/** The two kinds that count their neighbours rather than adding them up. */
export const counts = (k: Kind): boolean => k === "n" || k === "e";

/**
 * What this piece feeds a sum building next to it, given how many neighbours it is standing on
 * itself. A sum adds up the numbers touching it, so only the kinds that count feed it anything: a
 * blank, a plant and another sum all feed zero. A plain building feeds its own number, and a
 * range -- which shows no number of its own -- feeds the count it has landed on, so a 2 to 4 with
 * three neighbours feeds three.
 */
export const contrib = (p: Piece, count: number): number => (counts(p.k) ? (p.hi ? count : p.v) : 0);

export function describePiece(p: Piece): string {
	if (p.k === "p") return `Power plant ${p.v}`;
	if (p.k === "b") return "Blank building";
	const n = p.hi ? `${p.v} to ${p.hi}` : `${p.v}`;
	if (p.k === "s") return `Sum building ${n}`;
	return `Building ${n}` + (p.k === "e" ? ", needs power" : "");
}
