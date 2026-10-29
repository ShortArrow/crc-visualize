**English** | [日本語](design.ja.md)

# Design intent

Each section states what the design protects, the forces in tension, the alternatives refused while those forces hold, how the next decision of the same kind is made, and the observable fact that would overturn it. When a premise changes, the section is rewritten.

## The hardware model is a direct LFSR

Protects: the initial register value on screen is the same value as the preset's `init`.

- The Rocksoft model defines `init` as the initial register value of a direct LFSR. In the form where the input bit is XORed at the exit of the most significant bit and the result becomes the feedback, `init` goes into the register as it is.
- The displayed calculation can be checked as it is against the `check` values of the reveng catalogue.
- `fb = 1` can happen from the first clock, so the feedback is seen working during the slow playback at the start.

Refused: appending width zeros to the end of the input (augmentation) and pushing the bits in from the LSB side. It maps easily onto long division of polynomials, but when `init ≠ 0` it gives the same CRC only after `init` is converted to another value, and explaining that conversion needs a screen of its own. Its most significant bit is also always 0 for the first width clocks, so the feedback never fires. A switch that shows both forms is refused for the same reasons.

Next decision: a new value shown in the diagram or the pseudocode takes the form in which the preset's parameters appear on screen as they are.

Revisit when: the app takes its presets from a catalogue whose `init` is not the initial register value of a direct LFSR.

Checked by: "the first step loads init into the register" in `src/domain/trace.test.ts`, and the comparison with the catalogue's `check` values in `src/domain/equivalence.test.ts`.

## Drawing is a pure function of the step number

Protects: pause, frame stepping, reverse playback and seeking work through the same mechanism even after the user changes the CRC configuration.

- The app is a Vite + React + TypeScript SPA that draws the precomputed step sequence in SVG. Motion between steps is filled in with CSS transitions.
- A configuration change changes the number of steps, and so the length of the animation. Rebuilding the step sequence is all it takes.

Refused: making it a video in Motion Canvas and passing the configuration to the Player through variables. Recalculating the duration and coordinating with the surrounding UI would have to be done within the Player's constraints.

Next decision: anything new that playback shows is made as a value determined by the step number and the configuration, and holds no state that advances with time.

Revisit when: something done during playback has to change the steps that follow it, such as flipping an input bit while the animation runs.

## The LFSR diagram follows the step split

Protects: each step of the diagram does the same thing as the one pseudocode line highlighted at the same time.

- One clock is split into two steps to match the pseudocode lines: `shift` (`crc = (crc << 1) & mask`) and `xor` (`crc ^= poly`). A hardware LFSR computes this in one clock as `r'[i] = r[i-1] XOR (feedback AND poly[i])`.
- All boxes are connected by horizontal lines, and on `shift` every value slides straight sideways.
- An XOR gate sits directly below each `r[i]` with `poly[i] = 1` (including `i = 0`). On `xor`, the value of `r[i]` and the feedback coming from below join at the gate, and the result returns to `r[i]`. The inputs of `xor` are exactly the box's current value visible on screen and the feedback.

Refused:

- Placing the gate between `r[i-1]` and `r[i]`, as textbook diagrams do. At the `xor` step the shift has happened and `r[i-1]` holds a different value, yet the diagram looks as if the XOR of `r[i-1]` and the feedback goes into `r[i]`. At the `shift` step, the value at a tap position passes underneath the gate.
- Keeping a Y shape between the boxes and only making `shift` slide sideways. Two paths, a horizontal line and the Y shape, run side by side, and it is unclear which one a value travels along.

Next decision: before adding motion to the diagram, decide which pseudocode line it belongs to; motion that does not map one to one onto a line is not drawn.

Revisit when: the pseudocode stops splitting one clock into a `shift` line and an `xor` line.

Checked by: `e2e/diagram.spec.ts`.

## `main` changes only through pull requests that pass CI

Protects: only commits that have passed the type check, the unit tests and the E2E tests are published at crc.shortarrow.jp, and no Cloudflare credentials are kept in GitHub.

- Work is done on short-lived branches and merged into `main` through pull requests.
- A ruleset on `main` requires the CI check `test` to pass on a branch that is up to date with `main` before merging, so the merged content itself has been tested.
- Cloudflare Workers Builds is connected to the repository through a GitHub App and deploys `main` as the production branch. Other branches are built as previews, each at its own preview URL. Workers Builds deploys a pushed branch without waiting for CI, so the ruleset is what makes the published commit a tested one.
- A ruleset on a private repository needs a paid GitHub plan, so the repository is public.

Refused:

- Deploying from GitHub Actions after CI. It needs a Cloudflare API token as a repository secret, and Cloudflare does not accept GitHub's OIDC tokens, so the token cannot be replaced with short-lived credentials.
- Pushing directly to `main`, and after CI moving the commit to a `production` branch that Workers Builds deploys. It needs no secret, but adds a branch and a job, and lets untested commits into `main`.
- Pushing directly to `main` and letting Workers Builds deploy `main`. Commits that fail the tests are published before CI finishes.

Revisit when: Cloudflare accepts GitHub's OIDC tokens, so that deploying from GitHub Actions needs no long-lived secret; or Workers Builds can hold a deployment until a GitHub check passes.

Checked by: the check `test` (`.github/workflows/ci.yml`) that the ruleset on `main` requires.
