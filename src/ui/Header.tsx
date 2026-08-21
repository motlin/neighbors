/**
 * The title block. The short form of the rules lives here, where it is read once; the long form is
 * in the controls panel, where it is looked up.
 */

export interface HeaderProps {
	/** The piece count on the plate: the puzzle's size, or the design's so far. */
	count: number;
	caption: string;
}

export function Header({count, caption}: HeaderProps) {
	return (
		<header>
			<div>
				<h1>Neighbors</h1>
				<div className="rule-line">
					A building&rsquo;s number is how many buildings touch it, corners included. A sum building wants
					those numbers to add up to its own instead. A building showing a span like 2-4 takes anything in it.
					A bolt means it also needs a working power plant next door.
				</div>
			</div>
			<div className="plate">
				Pieces<b>{count}</b>
				<span>{caption}</span>
			</div>
		</header>
	);
}
