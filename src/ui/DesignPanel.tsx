/**
 * The designer's sidebar: what the shape adds up to, what it would deal, the picker for whichever
 * tool is out, and the share code.
 *
 * The share code is the whole design as one line of text. It is shown rather than hidden behind a
 * button because a code you can see is a code you can read back off a screenshot.
 */

import {useEffect, useState} from "react";
import {bagFrom} from "../game/play.js";
import {designBag, designCode, designStatus, statusMessage, type DesignState} from "../game/design.js";
import {BagPanel} from "./BagPanel.js";
import {KindPad} from "./KindPad.js";
import {SidesPad} from "./SidesPad.js";
import type {DesignTool} from "./DesignBoard.js";
import type {Kind} from "../game/types.js";

export interface DesignPanelProps {
	state: DesignState;
	tool: DesignTool;
	onPlay: () => void;
	onClear: () => void;
	onKind: (kind: Kind) => void;
	onRange: (end: "d" | "u", by: number) => void;
	onToggleSide: (dir: number) => void;
	onRefuse: (why: string) => void;
	onLoad: (code: string) => boolean;
}

export function DesignPanel({
	state,
	tool,
	onPlay,
	onClear,
	onKind,
	onRange,
	onToggleSide,
	onRefuse,
	onLoad,
}: DesignPanelProps) {
	const code = designCode(state);
	// The field follows the design until it is typed into, and goes back to following it once the
	// typed code has been loaded or the design has moved on.
	const [typed, setTyped] = useState<string | null>(null);
	const [copyLabel, setCopyLabel] = useState("Copy");
	const [loadLabel, setLoadLabel] = useState("Load");
	useEffect(() => {
		setTyped(null);
	}, [code]);

	const status = designStatus(state);
	const bag = bagFrom(designBag(state));

	const copy = async () => {
		const value = typed ?? code;
		if (!value) return;
		try {
			await navigator.clipboard.writeText(value);
			setCopyLabel("Copied");
		} catch {
			// A browser that refuses the clipboard still leaves the code selectable in the field.
			setCopyLabel("Select it");
		}
		setTimeout(() => {
			setCopyLabel("Copy");
		}, 1200);
	};

	const load = () => {
		if (onLoad(typed ?? code)) {
			setTyped(null);
			return;
		}
		setLoadLabel("Bad code");
		setTimeout(() => {
			setLoadLabel("Load");
		}, 1400);
	};

	return (
		<div className="panel">
			<h2>Your design</h2>
			<div className="dstat">{statusMessage(status)}</div>
			<div className="bag">
				<BagPanel bag={bag} selected={null} onPick={null} emptyMessage="Nothing drawn yet." />
			</div>
			<div className="controls" style={{marginTop: 11}}>
				<button type="button" className="act" disabled={!status.ok} onClick={onPlay}>
					Play this shape
				</button>
				<button type="button" className="act" onClick={onClear}>
					Clear
				</button>
			</div>

			{tool === "type" && (
				<>
					<h2 className="sub">What it is</h2>
					<KindPad state={state} onKind={onKind} onRange={onRange} onRefuse={onRefuse} />
				</>
			)}
			{tool === "x" && (
				<>
					<h2 className="sub">Closed sides</h2>
					<SidesPad state={state} onToggle={onToggleSide} />
				</>
			)}

			<h2 className="sub">Share code</h2>
			<input
				type="text"
				className="codebox"
				spellCheck={false}
				autoComplete="off"
				aria-label="Shape share code"
				placeholder="paste a code, then Load"
				value={typed ?? code}
				onChange={(e) => {
					setTyped(e.target.value);
				}}
			/>
			<div className="controls">
				<button type="button" className="act" onClick={() => void copy()}>
					{copyLabel}
				</button>
				<button type="button" className="act" onClick={load}>
					{loadLabel}
				</button>
			</div>
		</div>
	);
}
