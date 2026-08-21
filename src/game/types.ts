/**
 * What a piece is, and what a board made of them is.
 *
 * Everything on the board is a building except a power plant. The sum ring, the bolt and the blank
 * are things a building can be, not separate classes of piece, which is why they are all one
 * `Kind` and not a hierarchy.
 */

/**
 * - `n` a plain building: wants that many buildings touching it
 * - `e` the same, but it also needs a working plant next door
 * - `s` a sum building: wants the numbers touching it to add up to its own
 * - `b` a blank: wants nothing, happy anywhere
 * - `p` a power plant: carries every building touching it, up to its number
 */
export type Kind = "n" | "s" | "b" | "p" | "e";

export interface Piece {
	readonly k: Kind;
	/** The number it wants. For a plant, how many buildings it can carry. */
	readonly v: number;
	/** Above zero this is a range, `v` to `hi` inclusive, and `v` is the low end. */
	readonly hi: number;
	/** Eight bit mask of the sides that must stay empty. */
	readonly m: number;
}

/** A cell address, `"x,y"`. */
export type Key = string;

export type Board = ReadonlyMap<Key, Piece>;
export type Shape = ReadonlySet<Key>;

/** A piece id, the string form of a `Piece`: `n3`, `e2~4`, `s7.130`. */
export type Pid = string;

/** What is left to place, counted by piece id. */
export type Bag = Readonly<Record<Pid, number>>;

/**
 * How a placed piece is doing.
 *
 * `met` and `short` are the two live ones; everything else is a way of being wrong that no later
 * placement can undo, which is what earns the red fill.
 */
export type Status = "met" | "short" | "over" | "starved" | "blocked" | "clash" | "overload" | "unpowered";
