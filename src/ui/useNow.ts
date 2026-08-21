/**
 * A clock that ticks only while something is timing it. The board redraws on every tick, so a
 * running clock on an idle page would be a redraw ten times a second for nothing to look at.
 */

import {useEffect, useState} from "react";

export function useNow(running: boolean, everyMs = 100): number {
	const [now, setNow] = useState(() => Date.now());
	useEffect(() => {
		if (!running) return undefined;
		setNow(Date.now());
		const id = setInterval(() => {
			setNow(Date.now());
		}, everyMs);
		return () => {
			clearInterval(id);
		};
	}, [running, everyMs]);
	return now;
}
