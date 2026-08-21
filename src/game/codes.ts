/**
 * Share codes: a whole designed shape as one line of text you can paste into a message.
 *
 * The shape is written as a bitmap of the box it fits in, so position never enters the code and
 * the same shape drawn anywhere gets the same string. Everything else is a field of fixed-width
 * bits in the order the occupied cells appear, base32 at five bits a character.
 *
 * Version 2 is `2:WxH-shape-kinds[-masks][-ranges]`. Version 1 had no prefix and no kind field;
 * codes from then are still read, because they are out in the world in people's messages.
 */

import {key} from "./geometry.js";
import {KINDS} from "./piece.js";
import type {Kind, Key} from "./types.js";

export interface Decoded {
	set: Set<Key>;
	kinds: Map<Key, Kind>;
	masks: Map<Key, number>;
	ranges: Map<Key, [number, number]>;
}

const B32 = "0123456789abcdefghijklmnopqrstuv";

/** The biggest box a code may describe. Well past any playable puzzle, and it bounds the decode. */
const MAX_CELLS = 4000;

function bits2b32(bits: string): string {
	let b = bits;
	while (b.length % 5) b += "0";
	let out = "";
	for (let i = 0; i < b.length; i += 5) out += B32[parseInt(b.slice(i, i + 5), 2)];
	return out;
}

function b322bits(s: string, need: number): string | null {
	let bits = "";
	for (const ch of s) {
		const v = B32.indexOf(ch);
		if (v < 0) return null;
		bits += v.toString(2).padStart(5, "0");
	}
	return bits.length < need ? null : bits;
}

export function encodeSet(
	set: ReadonlySet<Key>,
	kinds: ReadonlyMap<Key, Kind>,
	masks: ReadonlyMap<Key, number>,
	ranges: ReadonlyMap<Key, [number, number]>,
): string {
	if (!set.size) return "";
	const keys = [...set];
	const xs = keys.map((k) => Number(k.split(",")[0]));
	const ys = keys.map((k) => Number(k.split(",")[1]));
	const x0 = Math.min(...xs);
	const y0 = Math.min(...ys);
	const w = Math.max(...xs) - x0 + 1;
	const h = Math.max(...ys) - y0 + 1;
	let sb = "";
	let kb = "";
	let xb = "";
	let rb = "";
	let anyMask = false;
	let anyRange = false;
	for (let y = 0; y < h; y++) {
		for (let x = 0; x < w; x++) {
			const k = key(x + x0, y + y0);
			if (!set.has(k)) {
				sb += "0";
				continue;
			}
			sb += "1";
			kb += KINDS.indexOf(kinds.get(k) ?? "n")
				.toString(2)
				.padStart(3, "0");
			const m = masks.get(k) ?? 0;
			if (m) anyMask = true;
			xb += m.toString(2).padStart(8, "0");
			const r = ranges.get(k) ?? [0, 0];
			if (r[0] || r[1]) anyRange = true;
			rb +=
				Math.min(7, r[0] | 0)
					.toString(2)
					.padStart(3, "0") +
				Math.min(7, r[1] | 0)
					.toString(2)
					.padStart(3, "0");
		}
	}
	let out = `2:${w}x${h}-${bits2b32(sb)}-${bits2b32(kb)}`;
	// The mask field also carries the ranges' position, so a ranged shape writes both.
	if (anyMask || anyRange) out += `-${bits2b32(xb)}`;
	if (anyRange) out += `-${bits2b32(rb)}`;
	return out;
}

/**
 * Version 1: no prefix, no kind field. A second bitmap marked the sum buildings and a fourth
 * marked the blanks; plants and bolts did not exist yet.
 */
function decodeV1(code: string): Decoded | null {
	const m = /^(\d+)x(\d+)-([0-9a-v]+)(?:-([0-9a-v]+))?(?:-([0-9a-v]+))?(?:-([0-9a-v]+))?$/.exec(code);
	if (!m) return null;
	const w = Number(m[1]);
	const h = Number(m[2]);
	if (w < 1 || h < 1 || w * h > MAX_CELLS) return null;
	const sb = b322bits(m[3]!, w * h);
	if (!sb) return null;
	const mb = m[4] ? b322bits(m[4], w * h) : null;
	if (m[4] && !mb) return null;
	const set = new Set<Key>();
	const kinds = new Map<Key, Kind>();
	const order: Key[] = [];
	for (let i = 0; i < w * h; i++) {
		const k = key(i % w, Math.floor(i / w));
		if (sb[i] === "1") {
			set.add(k);
			order.push(k);
			kinds.set(k, mb?.[i] === "1" ? "s" : "n");
		}
	}
	const masks = new Map<Key, number>();
	if (m[5]) {
		const xb = b322bits(m[5], order.length * 8);
		if (!xb) return null;
		order.forEach((k, i) => {
			let v = 0;
			for (let b = 0; b < 8; b++) if (xb[i * 8 + b] === "1") v |= 1 << b;
			if (v) masks.set(k, v);
		});
	}
	if (m[6]) {
		const bb = b322bits(m[6], w * h);
		if (!bb) return null;
		for (let i = 0; i < w * h; i++) {
			const k = key(i % w, Math.floor(i / w));
			if (bb[i] === "1" && set.has(k)) {
				kinds.set(k, "b");
				masks.delete(k);
			}
		}
	}
	return {set, kinds, masks, ranges: new Map()};
}

export function decodeCode(code: string): Decoded | null {
	const s = code.trim().toLowerCase();
	if (!s.startsWith("2:")) return decodeV1(s);
	const m = /^2:(\d+)x(\d+)-([0-9a-v]+)-([0-9a-v]+)(?:-([0-9a-v]+))?(?:-([0-9a-v]+))?$/.exec(s);
	if (!m) return null;
	const w = Number(m[1]);
	const h = Number(m[2]);
	if (w < 1 || h < 1 || w * h > MAX_CELLS) return null;
	const sb = b322bits(m[3]!, w * h);
	if (!sb) return null;
	const set = new Set<Key>();
	const order: Key[] = [];
	for (let i = 0; i < w * h; i++) {
		const k = key(i % w, Math.floor(i / w));
		if (sb[i] === "1") {
			set.add(k);
			order.push(k);
		}
	}
	const kb = b322bits(m[4]!, order.length * 3);
	if (!kb) return null;
	const kinds = new Map<Key, Kind>();
	order.forEach((k, i) => {
		const idx = parseInt(kb.slice(i * 3, i * 3 + 3), 2);
		kinds.set(k, KINDS[idx] ?? "n");
	});
	// A blank and a plant have neither sides to close nor a range to widen, so those fields are
	// dropped on the way in rather than trusted: a hand-edited code cannot smuggle one back.
	const masks = new Map<Key, number>();
	if (m[5]) {
		const xb = b322bits(m[5], order.length * 8);
		if (!xb) return null;
		order.forEach((k, i) => {
			const v = parseInt(xb.slice(i * 8, i * 8 + 8), 2);
			if (v && kinds.get(k) !== "b" && kinds.get(k) !== "p") masks.set(k, v);
		});
	}
	const ranges = new Map<Key, [number, number]>();
	if (m[6]) {
		const rb = b322bits(m[6], order.length * 6);
		if (!rb) return null;
		order.forEach((k, i) => {
			const d = parseInt(rb.slice(i * 6, i * 6 + 3), 2);
			const u = parseInt(rb.slice(i * 6 + 3, i * 6 + 6), 2);
			if ((d || u) && kinds.get(k) !== "b" && kinds.get(k) !== "p") ranges.set(k, [d, u]);
		});
	}
	return {set, kinds, masks, ranges};
}
