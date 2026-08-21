/**
 * Undo, start over, and the way into and out of the designer, with the rules underneath.
 *
 * The rules text is longer while playing than while designing, because playing is where the corner
 * cases bite: what a sum counts, what a plant carries, and what red means.
 */

const PLAY_HELP =
	"A building’s number is how many buildings touch it. A sum building wants those numbers to add up " +
	"to its own instead. A building showing a span like 2-4 takes anything in it. A bolt means it also " +
	"needs a working power plant next door. A plant carries every building touching it, up to its " +
	"number, whether or not that building needs power. Only other plants don’t count, and touching one " +
	"breaks them both. Red means unfixable, so tap a piece to pull it back out.";

const DESIGN_HELP =
	"Draw a shape and every building works out its own number. Type changes what a building is. Sides " +
	"closes off cells that must stay empty. Keys T and X switch tools, U undoes.";

export interface ControlsPanelProps {
	designing: boolean;
	canUndo: boolean;
	onUndo: () => void;
	onRestart: () => void;
	onToggleDesign: () => void;
}

export function ControlsPanel({designing, canUndo, onUndo, onRestart, onToggleDesign}: ControlsPanelProps) {
	return (
		<div className="panel">
			<h2>Controls</h2>
			<div className="controls">
				<button type="button" className="act" disabled={!canUndo} onClick={onUndo}>
					Undo
				</button>
				<button type="button" className="act" onClick={onRestart}>
					Start over
				</button>
				<button type="button" className="act" onClick={onToggleDesign}>
					{designing ? "Back to playing" : "Design a level"}
				</button>
			</div>
			<div className="readout">{designing ? DESIGN_HELP : PLAY_HELP}</div>
		</div>
	);
}
