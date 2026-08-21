/**
 * The whole game, in one place.
 *
 * All the state is here and everything below is given what to draw: the rules under `src/game` are
 * pure functions over values, so there is nothing for a component to own. That is also what makes
 * the pieces testable without a renderer -- a board is a Map, not a tree of nodes.
 */

import {useCallback, useEffect, useMemo, useRef, useState} from "react";
import {
	clearDesign,
	designBag,
	designCode,
	designStatus,
	emptyDesign,
	loadDesign,
	nudgeRange,
	select,
	setKind,
	strokeEnd,
	strokePaint,
	strokeStart,
	toggleSide,
	undoDesign,
	type DesignState,
} from "../game/design.js";
import {elapsed} from "../game/clock.js";
import {generate, MAX_PIECES, MIN_PIECES, type Options} from "../game/generate.js";
import {encodeSet} from "../game/codes.js";
import {parseHistory, recordSolve, removeEntry, serializeHistory, type HistoryEntry} from "../game/history.js";
import {erase, place, restart, startPuzzle, undo, type PlayState} from "../game/play.js";
import {unpid} from "../game/piece.js";
import {browserStore, HISTORY_KEY, type Store} from "../game/storage.js";
import {BagPanel} from "./BagPanel.js";
import {ControlsPanel} from "./ControlsPanel.js";
import {DesignBoard, type DesignTool} from "./DesignBoard.js";
import {DesignPanel} from "./DesignPanel.js";
import {Header} from "./Header.js";
import {HistoryPanel} from "./HistoryPanel.js";
import {PlayBoard, playCells} from "./PlayBoard.js";
import {SizePanel} from "./SizePanel.js";
import {Toolbar, toolHint} from "./Toolbar.js";
import {useNow} from "./useNow.js";
import {WinPanel} from "./WinPanel.js";
import type {Kind, Pid} from "../game/types.js";

const DEFAULT_PIECES = 12;

const ALL_ON: Options = {special: true, walls: true, blank: true, power: true, ranges: true};

/** Enough to tell two solves apart in a list of twenty. */
const newId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

/** How long a refusal stays up in the toolbar before the tool hint comes back. */
const HINT_MS = 2200;

export interface AppProps {
	/** Where the solved list is kept. Swapped out in tests and in Storybook. */
	store?: Store;
}

export function App({store = browserStore}: AppProps) {
	const [want, setWant] = useState(DEFAULT_PIECES);
	const [options, setOptions] = useState<Options>(ALL_ON);
	const [designing, setDesigning] = useState(false);
	const [tool, setTool] = useState<DesignTool>("place");
	const [design, setDesign] = useState<DesignState>(emptyDesign);
	const [history, setHistory] = useState<readonly HistoryEntry[]>([]);
	const [refusal, setRefusal] = useState<string | null>(null);
	const [win, setWin] = useState({prevBest: 0, newBest: false});
	const [play, setPlay] = useState<PlayState>(() => deal(DEFAULT_PIECES, ALL_ON));

	const refusalTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
	useEffect(
		() => () => {
			if (refusalTimer.current) clearTimeout(refusalTimer.current);
		},
		[],
	);

	const refuse = useCallback((why: string) => {
		setRefusal(why);
		if (refusalTimer.current) clearTimeout(refusalTimer.current);
		refusalTimer.current = setTimeout(() => {
			setRefusal(null);
		}, HINT_MS);
	}, []);

	// The solved list is read once, on the way in. Everything after that is written through.
	useEffect(() => {
		setHistory(parseHistory(store.get(HISTORY_KEY)));
	}, [store]);

	const saveHistory = useCallback(
		(next: readonly HistoryEntry[]) => {
			setHistory(next);
			store.set(HISTORY_KEY, serializeHistory(next));
		},
		[store],
	);

	const running = Boolean(play.startAt && !play.finishAt && !designing);
	const now = useNow(running);
	const time = play.startAt ? elapsed(play.startAt, play.finishAt, now) : null;

	const view = useMemo(() => playCells(play), [play]);

	const deal3 = useCallback(
		(pieces: number) => {
			const puzzle = generate(pieces, options);
			if (!puzzle) {
				refuse("Couldn’t make one that size. Try another.");
				return;
			}
			setPlay(
				startPuzzle(puzzle.bag, {
					origin: "dealt",
					code: encodeSet(puzzle.set, puzzle.kinds, puzzle.masks, puzzle.ranges),
				}),
			);
			setWant(puzzle.pieces);
			setWin({prevBest: 0, newBest: false});
		},
		[options, refuse],
	);

	/** Start a puzzle from a list of pieces, which is how history and the designer both hand off. */
	const start = useCallback((bag: readonly Pid[], opt: {origin: "dealt" | "made"; code: string; id?: string}) => {
		setPlay(startPuzzle(bag, {origin: opt.origin, code: opt.code, id: opt.id ?? null}));
		setWant(bag.length);
		setWin({prevBest: 0, newBest: false});
		setDesigning(false);
	}, []);

	const onPlace = (x: number, y: number) => {
		const next = place(play, x, y, Date.now());
		if (next === play) return;
		if (next.won && !play.won) {
			const ms = elapsed(next.startAt, next.finishAt, Date.now());
			const result = recordSolve(
				history,
				{bag: next.start, origin: next.origin, code: next.code, histId: next.histId},
				ms,
				newId(),
			);
			saveHistory(result.history);
			setWin({prevBest: result.prevBest, newBest: result.newBest});
			setPlay({...next, histId: result.id});
			return;
		}
		setPlay(next);
	};

	const onUndo = () => {
		if (designing) setDesign(undoDesign(design));
		else setPlay(undo(play));
	};
	const onRestart = () => {
		if (designing) setDesign(clearDesign(design));
		else setPlay(restart(play));
	};

	const toggleDesign = () => {
		setDesigning((was) => !was);
		setTool("place");
		setRefusal(null);
	};

	const playShape = () => {
		const status = designStatus(design);
		if (!status.ok) return;
		start(designBag(design), {origin: "made", code: designCode(design)});
	};

	const replay = (id: string) => {
		const e = history.find((h) => h.id === id);
		if (!e) return;
		start(e.bag, {origin: e.origin, code: e.code, id: e.id});
	};

	// Digits pick a plain building out of the bag; the letters are the designer's tools. Typing
	// into the share code field is not a shortcut, so a field with focus keeps its keystrokes.
	useEffect(() => {
		const onKey = (e: KeyboardEvent) => {
			// Typing into the share code field is not a shortcut, so a field with focus keeps its keys.
			if (e.target instanceof HTMLElement && e.target.tagName === "INPUT") return;
			if (e.key >= "0" && e.key <= "9" && !designing) {
				const hit = Object.keys(play.bag).find(
					(p) => (play.bag[p] ?? 0) > 0 && p.startsWith("n") && unpid(p).v === Number(e.key),
				);
				if (hit !== undefined) {
					setPlay((s) => ({...s, sel: hit}));
				}
				return;
			}
			const k = e.key.toLowerCase();
			if (k === "t" && designing) setTool((was) => (was === "type" ? "place" : "type"));
			else if (k === "x" && designing) setTool((was) => (was === "x" ? "place" : "x"));
			else if (k === "u" || (k === "z" && (e.metaKey || e.ctrlKey))) {
				e.preventDefault();
				onUndo();
			} else if (k === "r") onRestart();
		};
		document.addEventListener("keydown", onKey);
		return () => {
			document.removeEventListener("keydown", onKey);
		};
	});

	const hint = refusal ?? toolHint(designing, tool);

	return (
		<div className="sheet">
			<Header
				count={designing ? design.shape.size : play.pieces}
				caption={designing ? "in your design" : "this puzzle"}
			/>
			<main>
				<section className="board-wrap">
					<Toolbar
						designing={designing}
						tool={tool}
						onTool={(t) => {
							setTool(t);
							setRefusal(null);
						}}
						hint={hint}
						warn={refusal !== null}
						time={designing ? null : time}
						stopped={Boolean(play.finishAt)}
					/>
					{designing ? (
						<DesignBoard
							state={design}
							tool={tool}
							onStrokeStart={(x, y) => {
								setDesign((s) => strokeStart(s, x, y));
							}}
							onStrokePaint={(x, y) => {
								setDesign((s) => strokePaint(s, x, y));
							}}
							onStrokeEnd={() => {
								setDesign((s) => strokeEnd(s));
							}}
							onSelect={(x, y) => {
								setDesign((s) => select(s, x, y));
							}}
						/>
					) : (
						<PlayBoard
							view={view}
							onPlace={onPlace}
							onErase={(x, y) => {
								setPlay(erase(play, x, y));
							}}
						/>
					)}
					{play.won && !play.peek && !designing && (
						<WinPanel
							pieces={play.pieces}
							time={time ?? 0}
							prevBest={win.prevBest}
							newBest={win.newBest}
							onPeek={() => {
								setPlay((s) => ({...s, peek: true}));
							}}
							onHarder={() => {
								deal3(Math.min(MAX_PIECES, play.pieces + 3));
							}}
							onAgain={() => {
								deal3(play.pieces);
							}}
						/>
					)}
					{!designing && (
						<div className="readout">
							{play.won ? (
								<>
									<b className="ok">Solved.</b> {play.pieces} pieces, all agreeing.{" "}
									<button
										type="button"
										className="linkbtn"
										onClick={() => {
											setPlay((s) => ({...s, peek: false}));
										}}
									>
										Show summary
									</button>
								</>
							) : (
								<>
									<b>{view.tally.left}</b> left to place &middot; <b>{view.tally.met}</b> satisfied
									{view.tally.dead > 0 && (
										<>
											{" "}
											&middot; <span className="bad">{view.tally.dead} unfixable</span>
										</>
									)}
								</>
							)}
						</div>
					)}
				</section>

				<aside>
					{!designing && (
						<>
							<div className="panel">
								<h2>Buildings</h2>
								<div className="bag">
									<BagPanel
										bag={play.bag}
										selected={play.sel}
										onPick={(id) => {
											setPlay((s) => ({...s, sel: id}));
										}}
										emptyMessage="Everything placed."
									/>
								</div>
							</div>
							<SizePanel
								want={want}
								current={play.pieces}
								options={options}
								onWant={(n) => {
									setWant(Math.max(MIN_PIECES, Math.min(MAX_PIECES, n)));
								}}
								onOption={(k, on) => {
									setOptions((o) => ({...o, [k]: on}));
								}}
								onDeal={() => {
									deal3(want);
								}}
							/>
						</>
					)}
					{designing && (
						<DesignPanel
							state={design}
							tool={tool}
							onPlay={playShape}
							onClear={() => {
								setDesign(clearDesign(design));
							}}
							onKind={(kind: Kind) => {
								setDesign((s) => setKind(s, kind));
							}}
							onRange={(end, by) => {
								setDesign((s) => nudgeRange(s, end, by));
							}}
							onToggleSide={(dir) => {
								setDesign((s) => toggleSide(s, dir));
							}}
							onRefuse={refuse}
							onLoad={(code) => {
								const loaded = loadDesign(design, code);
								if (!loaded) return false;
								setDesign(loaded);
								setTool("place");
								return true;
							}}
						/>
					)}
					<HistoryPanel
						history={history}
						currentId={play.histId}
						onReplay={replay}
						onDelete={(id) => {
							saveHistory(removeEntry(history, id));
						}}
						onClear={() => {
							saveHistory([]);
						}}
					/>
					<ControlsPanel
						designing={designing}
						canUndo={designing ? design.history.length > 0 : play.history.length > 0}
						onUndo={onUndo}
						onRestart={onRestart}
						onToggleDesign={toggleDesign}
					/>
				</aside>
			</main>
		</div>
	);
}

/**
 * The opening puzzle. Generation can fail on an unlucky run of shapes, and the page has to render
 * either way, so a failure opens on an empty board rather than on nothing.
 */
function deal(pieces: number, options: Options): PlayState {
	const puzzle = generate(pieces, options);
	if (!puzzle) return startPuzzle([]);
	return startPuzzle(puzzle.bag, {
		origin: "dealt",
		code: encodeSet(puzzle.set, puzzle.kinds, puzzle.masks, puzzle.ranges),
	});
}
