# Neighbors

A logic puzzle for one player. You are dealt a bag of numbered buildings and an empty grid. Place
them one at a time, each touching what is already down, until every building's number agrees with
the neighbours around it.

Play it at [neighbors-game.pages.dev](https://neighbors-game.pages.dev).

## The rules

A building's number is how many buildings touch it, corners included — eight cells, not four.

That one rule is the whole game. The rest are things a building can be:

| Piece             | Wants                                                                                                                |
| ----------------- | -------------------------------------------------------------------------------------------------------------------- |
| **Plain**         | That many buildings touching it.                                                                                     |
| **Sum**           | The numbers touching it to add up to its own. A ring is drawn around its number.                                     |
| **Range** (`2-4`) | Any count inside the span. Having no single number, it feeds a sum as zero.                                          |
| **Blank**         | Nothing at all. Happy anywhere.                                                                                      |
| **Powered** (⚡)  | Its number of neighbours, _and_ a working power plant next door.                                                     |
| **Power plant**   | To carry every building touching it, up to its number. Other plants don't count — and touching one breaks them both. |

A building can also close off some of its own sides, marked with small crosses: those cells must
stay empty for the rest of the puzzle.

A cell turns cyan when it is satisfied and red when nothing left in the bag can save it. Red is the
point: it says a mistake happened several moves ago, and which piece to pull back out. Tap a placed
piece to take it back.

## Designing

**Design a level** swaps the puzzle for a blank canvas. Draw a shape — drag to paint a stroke — and
every cell works out its own number from the shape around it, so a design is never inconsistent
with itself. **Type** changes what a cell is; **Sides** closes off cells that must stay empty.

Every design has a share code, shown under the board: one line of text that carries the whole
shape. Paste one in and press Load to open somebody else's puzzle.

## Running it

```bash
just install     # install dependencies
just dev         # dev server on http://localhost:3001
just test        # run the tests
just check       # format, lint and type check
just verify      # everything CI runs
just storybook   # the components on their own
```

`vp` is [Vite+](https://viteplus.dev/guide/), which wraps the runtime, the package manager and the
frontend tooling in one CLI. `just install` installs it along with everything else.

## How it is built

The rules live under `src/game` as pure functions over plain values. A board is a `Map` from
`"x,y"` to a piece; a move takes a state and returns a new one, returning the same object by
identity when the move is refused. Nothing there imports React, which is why nearly all of the
tests run without a renderer.

The components under `src/ui` draw what those values say. `App.tsx` holds every piece of state and
hands it down; the rest take props and call back.

A few files worth knowing:

| File                   | What is in it                                                                       |
| ---------------------- | ----------------------------------------------------------------------------------- |
| `src/game/rules.ts`    | What each piece has, what it still needs, and whether the board agrees.             |
| `src/game/generate.ts` | Dealing a puzzle: grow a shape, decide what its cells are, read the numbers off it. |
| `src/game/codes.ts`    | Share codes, in two versions, the older of which still loads.                       |
| `src/game/play.ts`     | The played puzzle: place, erase, undo, restart.                                     |
| `src/game/design.ts`   | The designer: strokes, kinds, closed sides, ranges, and undo over all four.         |

The generator never solves anything. It grows a connected blob, decides what each cell is, and then
reads each number off the shape it just drew — so the shape it came from is by construction a
solution. What is left is discarding the shapes that make a dull or unfair puzzle, which is the
short list of checks at the bottom of `generate`.

## Deploying

The site is static, so it goes to [Cloudflare Pages](https://developers.cloudflare.com/pages/)
rather than to a Worker: one player, no shared state, nothing to run on a server.

```bash
just deploy      # build, then wrangler pages deploy
```

CI does the same on a push to `main`, and puts every pull request on
`https://pr-<number>.neighbors-game.pages.dev`. Both need `CLOUDFLARE_API_TOKEN` and
`CLOUDFLARE_ACCOUNT_ID` in the repository secrets.

The repository is `neighbors` but the Pages project is `neighbors-game`, which is why the URLs say
so. A `pages.dev` subdomain is claimed across the whole of Cloudflare rather than per account, and
`neighbors.pages.dev` is somebody else's site. There is no rename for a Pages project — the
subdomain is fixed when the project is created — so the name has to be right the first time.

## Where it came from

Neighbors began as a [Claude artifact][artifact] — one HTML file, one inline script. This is that
game with its rules pulled apart into modules, its screens rebuilt in React, and tests around the
parts that are easy to get subtly wrong: what a sum counts, what a plant carries, and what a share
code means.

[artifact]: https://claude.ai/public/artifacts/0223fda8-ca35-4c29-b198-56d3dce40a4c

## License

Apache 2.0. See [LICENSE](LICENSE).
