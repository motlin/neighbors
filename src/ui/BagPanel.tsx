/**
 * What is left to place. Buildings first, sorted by their number, and the power plants after them
 * under a label of their own: a plant is not a building and picking one up by accident, because it
 * sorted next to a 3, is a bad surprise.
 */

import {Bolt, kindClass, maskLabel, SideMarks} from "./CellFace.js";
import {describePiece, unpid} from "../game/piece.js";
import type {Bag, Pid} from "../game/types.js";

function byNumber(a: Pid, b: Pid): number {
	const A = unpid(a);
	const B = unpid(b);
	return A.v - B.v || (A.k < B.k ? -1 : A.k > B.k ? 1 : 0) || A.m - B.m;
}

interface TileProps {
	id: Pid;
	count: number;
	selected: boolean;
	onPick: ((id: Pid) => void) | null;
}

function Tile({id, count, selected, onPick}: TileProps) {
	const p = unpid(id);
	const className = `tile${kindClass(p)}${p.hi ? " rangey" : ""}${selected ? " on" : ""}${onPick ? "" : " static"}`;
	const label = `${count} of: ${describePiece(p)}${maskLabel(p.m)}`;
	const inner = (
		<>
			{p.k === "b" ? "" : p.hi ? `${p.v}-${p.hi}` : p.v}
			{p.k === "e" && <Bolt />}
			<SideMarks mask={p.m} />
			<span className="ct">{count}</span>
		</>
	);
	if (!onPick) {
		return (
			<span className={className} aria-label={label}>
				{inner}
			</span>
		);
	}
	return (
		<button
			type="button"
			className={className}
			aria-label={label}
			onClick={() => {
				onPick(id);
			}}
		>
			{inner}
		</button>
	);
}

export interface BagPanelProps {
	bag: Bag;
	selected: Pid | null;
	onPick: ((id: Pid) => void) | null;
	/** What to say when there is nothing left, which differs between playing and designing. */
	emptyMessage: string;
}

export function BagPanel({bag, selected, onPick, emptyMessage}: BagPanelProps) {
	const keys = Object.keys(bag).filter((p) => (bag[p] ?? 0) > 0);
	if (!keys.length) return <span className="bagdone">{emptyMessage}</span>;
	const buildings = keys.filter((id) => !id.startsWith("p")).sort(byNumber);
	const plants = keys.filter((id) => id.startsWith("p")).sort(byNumber);
	const tile = (id: Pid) => <Tile key={id} id={id} count={bag[id] ?? 0} selected={id === selected} onPick={onPick} />;
	return (
		<>
			{buildings.map(tile)}
			{plants.length > 0 && (
				<>
					<div className="baglabel">Power plants</div>
					{plants.map(tile)}
				</>
			)}
		</>
	);
}
