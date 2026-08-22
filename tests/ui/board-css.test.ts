import {readFileSync} from "node:fs";
import {fileURLToPath} from "node:url";
import {describe, expect, it} from "vitest";

const css = readFileSync(fileURLToPath(new URL("../../src/styles/board.css", import.meta.url)), "utf8");

/** The declarations inside the first rule whose selector list matches, as written. */
function ruleBody(selector: string): string {
	const at = css.indexOf(`${selector} {`);
	expect(at, `no rule for ${selector}`).toBeGreaterThan(-1);
	return css.slice(at + selector.length + 2, css.indexOf("}", at));
}

/**
 * A hover rule that shrinks its own cell oscillates: the cell scales out from under the pointer,
 * loses the hover, scales back under it and takes the hover again, forever. Held perfectly still
 * near a cell edge that reads as a piece flashing on and off ten times a second. The hover mark
 * has to be one that leaves the cell's box where it is.
 */
describe("erasable hover", () => {
	it("marks the cell without moving it out from under the pointer", () => {
		const body = ruleBody(".cell.cube.erasable:hover");
		expect(body).not.toMatch(/\btransform\b/);
		expect(body).toMatch(/\bbox-shadow\b/);
	});

	it("leaves no other hover on the board changing a cell's geometry", () => {
		for (const [, selector, body] of css.matchAll(/([^{}]*:hover[^{}]*)\{([^}]*)\}/g)) {
			expect(body, `${selector!.trim()} moves its own hit area`).not.toMatch(/\btransform\b/);
		}
	});
});
