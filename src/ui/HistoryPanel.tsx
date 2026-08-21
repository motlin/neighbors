/**
 * Recent puzzles. Nothing lands here until a puzzle is actually solved, so the list is a record of
 * what was finished rather than of what was tried.
 *
 * Clearing the whole list asks twice, on the same button: the second tap within a few seconds is
 * the confirmation. A list of solves is small but it is not replaceable, and there is no undo.
 */

import {useEffect, useRef, useState} from "react";
import {fmt} from "../game/clock.js";
import type {HistoryEntry} from "../game/history.js";

export interface HistoryPanelProps {
	history: readonly HistoryEntry[];
	/** Which entry is the puzzle currently on screen, if any. */
	currentId: string | null;
	onReplay: (id: string) => void;
	onDelete: (id: string) => void;
	onClear: () => void;
}

function summary(e: HistoryEntry): string {
	const bits = [e.origin === "made" ? "you made it" : "dealt"];
	const plants = e.tally.p ?? 0;
	if (plants > 0) bits.push(`${plants} ${plants > 1 ? "plants" : "plant"}`);
	if (e.best !== undefined) bits.push(fmt(e.best));
	return bits.join(" · ");
}

export function HistoryPanel({history, currentId, onReplay, onDelete, onClear}: HistoryPanelProps) {
	const [armed, setArmed] = useState(false);
	const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

	useEffect(
		() => () => {
			if (timer.current) clearTimeout(timer.current);
		},
		[],
	);

	const clear = () => {
		if (!armed) {
			setArmed(true);
			timer.current = setTimeout(() => {
				setArmed(false);
			}, 3500);
			return;
		}
		if (timer.current) clearTimeout(timer.current);
		setArmed(false);
		onClear();
	};

	return (
		<div className="panel">
			<h2 className="rowhead">
				Recent puzzles
				{history.length > 0 && (
					<button type="button" className="linkbtn" onClick={clear}>
						{armed ? "Tap again" : "Clear"}
					</button>
				)}
			</h2>
			<div className="hist">
				{history.length === 0 ? (
					<span className="histempty">Solve a puzzle and it lands here.</span>
				) : (
					history.map((e) => (
						<div className={`hrow${e.id === currentId ? " cur" : ""}`} key={e.id}>
							<button
								type="button"
								className="hgo"
								aria-label={`Play the ${e.n} piece puzzle again`}
								onClick={() => {
									onReplay(e.id);
								}}
							>
								<span className="hn">{e.n}</span>
								<span className="hmeta">{summary(e)}</span>
							</button>
							<button
								type="button"
								className="hdel"
								aria-label={`Remove the ${e.n} piece puzzle from this list`}
								onClick={() => {
									onDelete(e.id);
								}}
							>
								<span className="xg" aria-hidden="true" />
							</button>
						</div>
					))
				)}
			</div>
		</div>
	);
}
