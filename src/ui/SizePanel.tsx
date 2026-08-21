/**
 * How big the next puzzle should be, and what may be in it.
 *
 * The deal button says what it will do rather than just "New puzzle": once the size has been moved
 * away from the puzzle on screen, it names the size, because dealing then throws away a puzzle in
 * progress for a different one.
 */

import {MAX_PIECES, MIN_PIECES, type Options} from "../game/generate.js";

export interface SizePanelProps {
	want: number;
	/** The size of the puzzle on screen, which is what makes the deal button pending or not. */
	current: number;
	options: Options;
	onWant: (n: number) => void;
	onOption: (key: keyof Options, on: boolean) => void;
	onDeal: () => void;
}

const CHOICES: {key: keyof Options; label: string}[] = [
	{key: "special", label: "Include sum buildings"},
	{key: "walls", label: "Include closed sides"},
	{key: "blank", label: "Include blank buildings"},
	{key: "power", label: "Include power plants"},
	{key: "ranges", label: "Include ranges"},
];

export function SizePanel({want, current, options, onWant, onOption, onDeal}: SizePanelProps) {
	const pending = want !== current;
	return (
		<div className="panel">
			<h2>Puzzle size</h2>
			<div className="size">
				<button
					type="button"
					className="step"
					aria-label="Fewer pieces"
					disabled={want <= MIN_PIECES}
					onClick={() => {
						onWant(want - 1);
					}}
				>
					&minus;
				</button>
				<span className="val">
					{want}
					<small>pieces</small>
				</span>
				<button
					type="button"
					className="step"
					aria-label="More pieces"
					disabled={want >= MAX_PIECES}
					onClick={() => {
						onWant(want + 1);
					}}
				>
					+
				</button>
			</div>
			<input
				type="range"
				min={MIN_PIECES}
				max={MAX_PIECES}
				step={1}
				value={want}
				aria-label="Pieces per puzzle"
				onChange={(e) => {
					onWant(Number(e.target.value));
				}}
			/>
			{CHOICES.map(({key, label}) => (
				<label className="chk" key={key}>
					<input
						type="checkbox"
						checked={options[key]}
						onChange={(e) => {
							onOption(key, e.target.checked);
						}}
					/>
					{label}
				</label>
			))}
			<button type="button" className={`act deal${pending ? " pending" : ""}`} onClick={onDeal}>
				{pending ? `Deal ${want} buildings` : "New puzzle"}
			</button>
		</div>
	);
}
