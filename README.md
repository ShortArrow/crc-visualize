**English** | [日本語](README.ja.md)

# CRC Visualizer

An SPA that shows one clock of an LFSR (hardware) in step with one line of a bitwise CRC implementation (software). The CRC configuration can be switched using the Rocksoft model (width / poly / init / refin / refout / xorout).

Live at https://crc.shortarrow.jp/.

The specification is in [docs/spec.md](docs/spec.md), and the design decisions are in [docs/adr/](docs/adr/).

## Usage

```sh
npm install
npm run dev        # development server
npm test           # unit tests (Vitest)
npm run e2e        # E2E tests (Playwright, using the installed Chrome)
npm run build      # output static files to dist/
npm run og-image   # regenerate public/og.png, the image shown when the site is shared (pass the dev server URL)
npm run deploy     # build and publish dist/ to crc.shortarrow.jp (Cloudflare Workers, wrangler.jsonc)
```

Changes go to `main` through pull requests. Each pull request runs the type check, unit tests and E2E tests in GitHub Actions (`.github/workflows/ci.yml`), and can be merged only when they pass on a branch up to date with `main`. Cloudflare Workers Builds, connected to this repository, deploys `main` to crc.shortarrow.jp and each pull request branch to its own preview URL. No Cloudflare credentials are kept in GitHub.

Keys: Space plays / pauses, ← → move one step, Home / End jump to the first / last step, and L toggles loop playback.

Like a debugger, the sidebar shows the variables at the step shown, and playback pauses at breakpoints. Press left of a line number in the code to stop at that line (optionally at its n-th hit, such as the 5th XOR), or a bit of the input stream, or the line under one of its bytes, to stop once that bit or byte has been read.

In hex, paste whole frames, one per line, and choose the CRC range by dragging across a frame's bytes. With a CRC field after the range, each frame's computed CRC is checked against the one it carries, and any frame can be picked to watch.

The settings (CRC parameters, input, CRC range, speed, loop, breakpoints) are saved in the browser's localStorage and restored the next time the page is opened. The same settings are also carried in the URL query, so passing on the URL from the address bar opens the page with the same settings (settings in the URL take precedence over saved values).

## Structure

| Directory         | Contents                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `src/domain`      | Generating the CRC step sequence (`trace`), validating the form (`parseConfig`), presets with their name families and aliases (`naming`), narrowing candidates by fixing values (`narrow`), the period of the generator polynomial and the codewords that show the properties of cyclic codes (`cyclic`), error detection and the number of codewords (`redundancy`), the transmitted sequence, the two ways of checking and the residue (`check`), substitutions that give the same CRC and the ways of sending (`equivalence`), the byte-at-a-time table method (`table`), estimating parameters from pairs of data and CRC (`estimate`) |
| `src/i18n`        | Deciding the display language (`locale`), per-language dictionaries of the on-screen text (`ja` defines the shape and the other languages follow the same shape), and `MessagesProvider` / `useMessages` that hand out the dictionary                                                                                                                                                                                                                                                                                                                                                                                                      |
| `src/playback`    | Playback state transitions, the speed ramp and breakpoints (`breakpoints`)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| `src/ui`          | How code is written in each language (`codeLangs`) and the shared template (`codeTemplate`), code highlighting (`code`), layout of the LFSR diagram, page switching (`route`), the VS Code-like screen frame (`Workbench`) and saving the pane layout (`panes`), React components (the visualization, the naming rules and the narrowing pages)                                                                                                                                                                                                                                                                                            |
| `src/settings.ts` | Saving and restoring the settings (localStorage and the URL query)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| `src/testing`     | Inputs and steps shared by the unit tests, and the check of how tests are written (`setup.ts`)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| `e2e`             | E2E scenarios per feature. One test is one scenario, written as `given` / `when` / `then` steps. The browser runs in Japanese (`ja-JP`)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| `e2e/support`     | Drivers that operate and observe the screen in terms of steps, the diagram, the code and the history (`Visualizer`), the driver for the naming rules page (`NamesPage`), the driver for the narrowing page (`NarrowPage`), the driver for the cyclic page (`CyclicPage`), the driver for the redundancy page (`RedundancyPage`), the driver for the check page (`CheckPage`), the driver for the substitution page (`EquivalencePage`), the driver for the table page (`TablePage`), the driver for the estimation page (`EstimatePage`), and `test` and `given` / `when` / `then` that check the order of the steps (`scenario.ts`)       |

Both unit and E2E tests are one scenario per test, split into Given / When / Then, with test names and step texts written in English. Unit tests are not nested: `it("Given <precondition>, When <action>, Then <result>")` entries sit directly under `describe("<subject>")`, and each test sets up its preconditions inside itself using the functions in `src/testing`. `src/testing/setup.ts` checks this shape before all tests, and a test that breaks it fails. In E2E, tests with a summary name sit directly under `test.describe("<feature>")`, and the `given` / `when` / `then` of `e2e/support/scenario.ts` are arranged in the order "one Given, then repeated groups of a When and one or more Thens". The `test` in the same file checks this order for every test that passes. E2E runs the browser in Japanese (`ja-JP`) because the assertions check the Japanese UI. An E2E test that reads the diagram at the start of a step gets there with `goToFrozen` or `stepForwardFrozen`, which pause every animation as the step begins, since on a slow machine the animations run on, and may finish, before the test reads them.

## Languages of docs and comments

Docs are kept in English (`*.md`) and Japanese (`*.ja.md`); when one is changed, the other must be updated together. Code comments and docstrings are written in English.

## License

[MIT](LICENSE)
