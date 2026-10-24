**English** | [日本語](spec.ja.md)

# CRC Visualizer SPA Specification

A browser app that shows the behaviour of an LFSR (hardware) and each line of a bit-at-a-time CRC implementation (software), synchronized one clock at a time. Terms and notation follow "16. Terms and notation".

## 1. CRC parameters (Rocksoft model)

| Name     | Type    | Constraint                                                       |
| -------- | ------- | ---------------------------------------------------------------- |
| `width`  | integer | 1 to 32                                                          |
| `poly`   | integer | 0 < poly < 2^width (the top x^width term is not included)        |
| `init`   | integer | 0 ≤ init < 2^width                                               |
| `refin`  | boolean | If true, each input byte is bit-reflected before it is fed in    |
| `refout` | boolean | If true, the final register value is reflected over `width` bits |
| `xorout` | integer | 0 ≤ xorout < 2^width                                             |

Each preset carries the reveng catalogue's check value (check, the CRC of the input `"123456789"`), which serves as the reference for correct computation.

- The teaching preset `CRC-3/TUTORIAL` (width=3, poly=0x3, init=0, refin=false, refout=false, xorout=0, input bits `10101`, CRC=`101`)
- Every algorithm with `width` 32 or less in reveng's "Catalogue of parametrised CRC algorithms" (104 of them), in catalogue order. Each preset has all of its catalogue aliases, with the ones most used in the literature first.
- Each option shows the official name followed by up to the first 3 aliases in full-width parentheses (e.g. CRC-16/KERMIT（CCITT、CCITT-TRUE、CRC-CCITT）). An alias that starts with the same "CRC-width/" omits that prefix.

## 2. Input

The input mode is one of the following 3.

| Mode         | Example    | Conversion to a bit string                                      |
| ------------ | ---------- | --------------------------------------------------------------- |
| Binary       | `10101`    | As is. Any length                                               |
| Hexadecimal  | `31 32 33` | Whitespace within a line is ignored. 1 byte = 8 bits, MSB first |
| Text (UTF-8) | `123`      | Encoded as UTF-8 bytes, then converted as hexadecimal           |

- An input whose bit length is not a multiple of 8 is invalid when `refin` is true.
- The input (in hexadecimal, the CRC range of the selected frame) is limited to 256 bits.

### Frames and the CRC range

In hexadecimal, each non-blank line of the input is one frame, and each line must be whole bytes. There are at most 64 frames of at most 256 bytes each, which bounds the work of listing and checking them whatever a shared URL carries. All frames share one layout:

- CRC range: the bytes the CRC is computed over, as byte numbers from 0 at the start of each frame, both ends included. Without a start, the range starts at byte 0. Without an end, it runs to the frame's last byte, or to the byte before the CRC field when there is one, so frames of different lengths can share one layout.
- CRC field: none, or the received CRC right after the range, taking ⌈`width`/8⌉ bytes. `BE` reads it high byte first and `LE` low byte first, and it is compared with the CRC computed over the range.
- Selected frame: the frame that is visualized, numbered from 0. A number past the last frame selects the last one.

The bits visualized are the CRC range of the selected frame. A byte number that is not an integer of 0 or more is an error on the range, and so is a range or CRC field that does not fit the selected frame (including an end before the start). The binary and text modes have no frames, and the CRC range is ignored there.

## 3. Hardware model (direct LFSR)

The register is laid out horizontally from `r[width-1]` (the most significant bit, leftmost) to `r[0]` (rightmost), and shifts left by one each clock.

The update rule for one clock is as follows. `bit` is the input bit, `msb` is the most significant bit `r[width-1]`, and `feedback` is the feedback bit.

```
feedback = msb XOR bit
r'[0]    = feedback AND poly[0]
r'[i]    = r[i-1] XOR (feedback AND poly[i])   (1 ≤ i < width)
```

- The diagram draws this one clock in two stages, "shift" and "XOR with `poly`", the same as the pseudocode ([ADR-0003](adr/0003-diagram-follows-steps.md)).
- All boxes are connected by horizontal lines. In a shift, every value moves straight across from the box on its right, and a 0 enters `r[0]` from the right end.
- One XOR gate is placed directly below `r[i]` for each position `i` with `poly[i] = 1` (including `i = 0`). The left leg coming down from `r[i]` and the feedback line coming from below meet at the gate, and the result goes up the right leg back into `r[i]`.
- The XOR gate for the input bit and the most significant bit is placed at the exit on the left end of the register, and the feedback line runs from there to each gate.
- There is no zero padding of the input (augmentation). The reason is in [ADR-0001](adr/0001-direct-lfsr.md).

## 4. Software view (pseudocode)

The pseudocode for `refin` false is as follows. When `refin` is true, the scan over the input bits is replaced by a double loop that "reflects each byte, then scans it from the most significant bit".

```c
crc = init;
if (refin) byte = reflect(byte, 8);
for (bit of inputBits) {
    feedback = ((crc >> (width - 1)) & 1) ^ bit;
    crc = (crc << 1) & mask;
    if (feedback == 1) {
        crc ^= poly;
    }
}
if (refout) crc = reflect(crc, width);
crc ^= xorout;
return crc;
```

- The line that corresponds to the current step is highlighted. In a step whose feedback bit is 0, the display makes clear that the body of the `if` was skipped.
- Parameters are written as chips that show the name and value side by side (e.g. `poly│0x3`). `mask` is a value derived from `width`, so it is treated as a `width` chip.
- Lines that are not executed because a parameter disables them (`refin` false, `refout` false, `xorout = 0`) are not removed; they are shown dimmed with a note giving the reason. With any settings, all 6 parameters appear in the code.

### Code language

To the right of the software view's heading, the language the code is written in can be chosen. The default is the pseudocode above.

- Available languages: pseudocode, C, C#, TypeScript, Rust, Zig, Python, Ruby, Lua, Perl, Pascal, PowerShell, Bash, Haskell, Erlang, F#. Their values in the URL query `code` are, in order, `pseudo`, `c`, `csharp`, `typescript`, `rust`, `zig`, `python`, `ruby`, `lua`, `perl`, `pascal`, `powershell`, `bash`, `haskell`, `erlang`, `fsharp`.
- Every language writes the same procedure (a left-shift processing one bit at a time) in the style commonly used in that language. Haskell, Erlang and F# write it with a fold and functions.
- In every language there is exactly one line that executes each step (`init`, `reflectIn`, `feedback`, `shift`, `xor`, `reflectOut`, `xorOut`, `done`), so the highlighting, the evaluated result of the `if` and the notes on disabled lines described above are handled the same in every language. The `xor` line is placed inside the branch that is taken only when `feedback` is 1.
- If `refin` is true, the input is reflected byte by byte and then processed from the most significant bit; if false, the input bits are processed as they are. This shape is the same as in the pseudocode.
- Helper functions such as `reflect` and splitting bytes into bits are only called, with their definitions omitted. Function type and parameter declarations are written only in languages where the shape is unclear without them (Haskell, Erlang, F#).
- Chip values are written as literals of that language. Hexadecimal is `0x1021` (`$1021` in Pascal, `16#1021` in Erlang, `0x1021u` in F#), and booleans are `true`/`false` (`True`/`False` in Python, Haskell and Pascal, `1`/`0` in Perl, `$true`/`$false` in PowerShell).
- Notes are written as line comments of that language (`//`, `#`, `--`, `%`).

## 5. Step sequence (state transitions)

The computation is returned as a `Step[]` by the pure function `trace(params, inputBits)`, and rendering only reads the steps. Each step holds the register value at that point.

| Kind         | Given                                           | Then                                                                                      |
| ------------ | ----------------------------------------------- | ----------------------------------------------------------------------------------------- |
| `init`       | Start of computation                            | `reg = init`                                                                              |
| `reflectIn`  | `refin` true, at the start of a byte            | The next 8 bits are reordered in reflected order. `reg` is unchanged                      |
| `feedback`   | Input bit `bit`                                 | `feedback = msb XOR bit` is determined. `reg` is unchanged                                |
| `shift`      | Right after `feedback`                          | `reg = (reg << 1) & mask`. Holds the original `r[width-1]` that overflowed out            |
| `xor`        | Right after `shift`, with `feedback = 1`        | `reg ^= poly`. If `feedback = 0` this step is not placed, and the clock ends with `shift` |
| `reflectOut` | After all bits are fed in, `refout` true        | `reg = reflect(reg, width)`                                                               |
| `xorOut`     | After `reflectOut` (if absent, after all input) | `reg ^= xorout`                                                                           |
| `done`       | Final                                           | `reg` is the CRC. The CRC is shown appended after the input                               |

`reflectOut` is omitted when `refout` is false, and `xorOut` when `xorout = 0`.

## 6. Playback

- Controls: play / pause, step forward / back one step, jump to first / last, seek bar, speed multiplier (0.25 to 8), loop toggle.
- Loop: when enabled, once `done` has been shown during playback, playback returns to the start and continues. When disabled, it stops at `done`. Like the speed settings, it is kept when the CRC settings change.
- Breakpoints: during playback, when the next step to show hits an enabled breakpoint, that step is shown and playback pauses. Pressing play continues from there and stops again at the next hit. Playback stops at breakpoints during loop playback as well. Stepping forward or back, jumping to the first or last step and the seek bar do not stop at breakpoints.
  - Line breakpoints: set on a line of the code that executes a step. A line breakpoint belongs to the kind of step the line executes, not to the line number, so it stays on the line doing the same work when the code language changes. It hits every time a step of that kind is reached. With a hit count, it hits only when the number of steps of that kind reached from the start is exactly that count (for example, 5 on the `crc ^= poly` line stops at the 5th XOR). An XOR line skipped because `feedback` is 0 is not executed, so it is not counted.
  - Byte breakpoints: set on the k-th byte of the input (counting from 0), and hit at the step that ends the clock of the byte's last bit (`xor` if `feedback` is 1, `shift` if 0). One set on a byte beyond the input never hits.
  - Bit breakpoints: set on the n-th bit of the input stream (counting from 0, in the order the bits are fed, so after `refin` reflects them), and hit at the step that ends the clock of that bit. A byte breakpoint on byte k hits at the same step as a bit breakpoint on bit 8k + 7. One set on a bit beyond the input never hits.
  - Each breakpoint can be enabled or disabled; a disabled one never hits.
- Speed ramp: in auto mode, playback is slow (900 ms per step) until at least one clock with feedback bit 0 and one with feedback bit 1 have each been shown, and later clocks are fast (120 ms). Even for an input where only one of the values occurs, slow playback lasts at most the first 6 clocks. `init`, `reflectOut`, `xorOut` and `done` are always slow. In steady mode every step is 600 ms. In both modes the time is divided by the speed multiplier.
- When the settings or the input change, the step sequence is rebuilt, playback returns to the start and stops.
- Keeping settings: the CRC parameters, input mode, input value, speed mode, speed multiplier, loop on/off, code language (chapter 4), display language (chapter 17), breakpoints, and the CRC range, CRC field and selected frame (chapter 2) are saved to localStorage each time they change, and restored the next time the app is opened. The playback position is not saved; playback starts at the start, stopped. Among the saved values, any item whose shape or value range is wrong is reset to its own default only (`CRC-3/TUTORIAL`, auto, ×1, no loop, pseudocode, the language determined from the browser's preferred languages, no breakpoints, no CRC field).
- Keeping the layout: the sidebar's open/closed state and width, the boundary between the diagram and the panel below, and the boundary between the pseudocode and the Progress panel are saved to localStorage each time they change, and restored the next time the app is opened. These settings adapt to the viewer's screen, so they are not put in the URL query. Saved values that are invalid, or that do not fit the current screen, are corrected to the default or into the range that fits.
- Sharing by URL: the same items as the kept settings are also put in the URL query (`width`, `poly`, `init`, `refin`, `refout`, `xorout`, `inputMode`, `input`, `speed`, `rate`, `loop`, `code`, `lang`, `bp`, `from`, `to`, `crcField`, `frame`; booleans are `1`/`0`, and `crcField` is `none`, `be` or `le`), and rewritten each time they change without adding history entries. When the app is opened, items in the URL take precedence over the values saved in localStorage. Items missing from the URL or invalid ones take the saved value (or the default if none).
  - `bp` lists the breakpoints separated by commas. A line breakpoint is written as the step kind (such as `xor`), followed by `@` and the hit count if it has one (`xor@5`). A byte breakpoint is written as `byte` followed by its number (`byte3`), and a bit breakpoint as `bit` followed by its number (`bit13`). A disabled one is prefixed with `!`. Entries that cannot be read are dropped.
- When the settings are invalid, an error is shown for each field, and the rendering is cleared rather than keeping the last valid state. The sidebar then has only the Settings section. The field being typed in keeps its focus while the value is invalid on the way.

## 7. Screen

A dark-mode, editor-like screen similar to VS Code, with 9 pages: the Visualizer page, the Naming page (chapter 8), the Narrow down page (chapter 9), the Cyclic page (chapter 10), the Redundancy page (chapter 11), the Check page (chapter 12), the Equivalences page (chapter 13), the Table page (chapter 14) and the Estimation page (chapter 15). This chapter specifies the Visualizer page.

On pages other than the Visualizer, the content blocks (cards) are laid out in reading order, left to right and then top to bottom, as many to a row as the width allows (a card starts as wide as its widest table, bit row or drawing, its prose wraps to that width, and the cards of a row share out the rest), so that a wide screen does not leave a large empty area on the right. On the Table page, the byte-by-byte card starts as wide as its table with the column headings wrapped between words, so that it sits beside the table T whatever the display language. The cards of a row share their top and height, the cards of the last row share out the whole width, cards are spaced apart, and no card's content sticks out of it. A card is not left mostly empty beside a taller one: such a card takes a row of its own. Long lists (such as the alias table) are split into columns as well. A page shorter than the screen does not leave its lower part empty: its drawings, tables and text grow with the screen's height until the page reaches near the bottom (on the Redundancy page, when the codewords are too long for the grid of all sequences, the CRCs that could follow the message are laid out in a near-square grid in its place). Text and fields do not wrap one character to a line. On a screen larger than 1600×1000 (CSS px), such as a 2K or 4K monitor, the whole app is enlarged by the largest factor that keeps neither side below 1600×1000, so the pages look as they do on a 1600×1000 screen, only larger; splitters still follow the pointer. The Visualizer's diagram shrinks to the width of its area, but not below a size where the register values can be read (0.55 of its full size, or 0.8 on a phone); a diagram still wider than its area scrolls sideways and, at each step, is scrolled to bring the part being computed (the most significant register, the registers being flipped and the active XOR gates) into view when it is out of view. On a window narrower than 700 CSS px (a phone), the page links run along the bottom above the status bar, the editor area takes the whole width, and the sidebar is a drawer over it: closed at first, opened by the sidebar button, and closed again on choosing a link or button in it or tapping beside it. The Visualizer's Variables (5) sit between the code and Progress and scroll with them rather than in the drawer, so they can be read while stepping, and the part of a line number that is pressed is wide enough for a finger. What is tapped stays within reach at the bottom, and what it changes is read above it: the playback controls of the Visualizer, the rotate buttons with the rotated codeword and its remainder on the Cyclic page, the received sequence with its buttons on the Redundancy page and the sent sequence on the Check page sit between the editor area and the page links, and the rest of the page scrolls above them. The Visualizer keeps the diagram at the top, at a size where the register values can be read, and scrolls the code and the log below it, without splitters. On the Table page, the card explaining an entry follows the byte-by-byte card, before the table T, and the row headings of the table T stay in view while it scrolls sideways. Other diagrams, rings and bit rows shrink to the width; tables of numbers keep their size and scroll sideways inside their card. Nothing else sticks out past the right edge.

- Layout: the whole screen is divided into the following areas, and the page itself does not scroll. Content that does not fit in an area scrolls within that area only.
  - Activity bar (the narrow column at the left edge): icons for switching pages (Visualizer, Naming, Narrow down).
  - Sidebar: on the Visualizer page, three sections stacked vertically, each opened and closed by pressing its heading (an accordion): Settings (the settings panel and the description pane, 1 below), Variables (5) and Breakpoints (6). Which sections are open adapts to the viewer's screen, so it is saved to localStorage and not put in the URL. On the Naming page, a table of contents for its sections. On the Narrow down page, the fixed values and the remaining candidates.
  - Editor area: the playback control toolbar (3) at the top, the LFSR diagram (2) below it, and further down a panel with the pseudocode and the Progress panel (4) side by side.
  - Status bar (one line at the bottom edge): the preset name (`custom` if none matches), the kind of the step being shown, and the `crc` after processing (binary and hexadecimal).
- The boundaries between the sidebar and each area can be dragged. The sidebar can be opened and closed with Ctrl+B (⌘+B on macOS) and the toggle in the activity bar.
- The LFSR diagram scales up and down to fit the size of the upper part of the editor area, keeping its aspect ratio.

1. Settings panel (sidebar): preset selection, each parameter, input mode and input value.
   - Field labels are in English only. Parameters use the parameter name (`width`, `poly` and so on); the others are `preset`, `input mode`, `input`, `range` and `crc field`. The input mode options are `bits`, `hex` and `text (UTF-8)`, and settings that match no preset are shown as `custom`.
   - Under the `poly` field, the generator polynomial given by `width` and `poly` is shown with superscript exponents (for example `g(x) = x¹⁶ + x¹² + x⁵ + 1`), written as on the Cyclic and Redundancy pages. It is not shown while the settings are invalid.
   - In hexadecimal, the input field takes several lines and does not wrap them. Below the panel, the frames (chapter 2) are listed. First come the CRC range (`range`: the start and the end, the end showing that it runs to the end when empty) and the CRC field (`crc field`: none, `BE` or `LE`). Then each frame has a row with its number, its bytes, the CRC computed over its range, the value in its CRC field, and ✓ or ✗ for whether they agree. The bytes of the range and of the CRC field are coloured. A frame the layout does not fit says so instead of showing a CRC. Pressing a frame's number visualizes it. Dragging across the bytes of any frame, with a mouse or a finger, sets the range.
   - Hovering over a field shows its full name and description in the description pane. For parameters, the aliases and notes are shown too.
   - A description pane is placed below the panel, showing the full name and description of the focused field, and for parameters the aliases and notes that depend on the setting values. The notes are the value of `poly` in reflected notation, and whether the combination of `refin` and `refout` corresponds to a right-shift or a left-shift implementation.
   - The height of the description pane is set to the longest description among all parameters. Regardless of the width, descriptions are never cut off, and the layout does not move when the focus changes.
2. Upper part of the editor area: the LFSR diagram. The input stream (bits already fed in are dimmed, the next bit is emphasized), the register boxes, the XOR gates, the `feedback` box, and the feedback line.
   - The flow of the computation is shown only by the colours of the wires and by particles (circles labelled with the value 0/1) that move along the wires. No formula strings appear inside the diagram (formulas appear in the pseudocode notes and in Progress).
   - The following wires change colour according to the value flowing through them. While no value is flowing, they are grey.
     - Input wire: input stream → input gate
     - MSB wire: `r[width-1]` → input gate
     - Result wire: input gate → `feedback` box
     - Feedback line: `feedback` box → each tap's gate
     - Tap input wire: bottom edge of `r[i]` → the gate directly below (left leg)
     - Tap output wire: gate → bottom edge of `r[i]` (right leg)
   - The animation of one step lasts 80% of that step's display time (after dividing by the speed multiplier), with no upper limit. Lowering the speed multiplier slows the particles by the same ratio.
   - The animation of one step is split into a first half and a second half, and each particle moves in either the first half or the second half.

     | Step          | Input wire | MSB wire | Result wire                       | Feedback line | Tap input wire             | Tap output wire                      | First-half particles                                                                                          | Second-half particles                                |
     | ------------- | ---------- | -------- | --------------------------------- | ------------- | -------------------------- | ------------------------------------ | ------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------- |
     | `feedback`    | `bit`      | `msb`    | `feedback` (from the second half) | none          | none                       | none                                 | `bit` and `msb` each to the input gate                                                                        | `feedback` from the input gate to the `feedback` box |
     | `shift`       | none       | none     | none                              | none          | none                       | none                                 | none                                                                                                          | none                                                 |
     | `xor`         | none       | none     | none                              | 1             | value of `r[i]` before XOR | result of XOR (from the second half) | a 1 per tap from the `feedback` box to that gate. At the same time the value of `r[i]` goes down the left leg | the XOR result goes up the right leg into `r[i]`     |
     | Anything else | none       | none     | none                              | none          | none                       | none                                 | none                                                                                                          | none                                                 |

   - The flow of time (the order things happen within one step). Values are carried by particles, and a result must never become visible before its particle.
     1. Start of the step: the previous step's display is not carried over; it switches immediately. Wires with no value flowing return to grey, and no particles from the previous step remain. Changes that have no particle (the slide-in of `shift`, the mirroring of `reflectOut`, the flip of `xorOut`, the colour of wires no particle travels on, the emphasis of the most significant bit's box) start here. The current line in the pseudocode and the new line in Progress also switch here. Particles, and wires that are painted behind a particle, are not shown from the first render after the switch until their departure time (second-half particles or paint never flash briefly).
     2. First half: the first-half particles depart. A wire a particle travels on is painted in the value's colour behind the particle, and no colour appears ahead of the particle.
     3. End of the first half: the first-half particles disappear when they arrive. The gates used in the computation in that step light up.
     4. Second half: the second-half particles (the gates' results) depart, and likewise paint the wires behind them.
     5. End of the second half: the second-half particles disappear when they arrive, and the contents of the boxes (`r[i]` and the `feedback` box) change to the values they carried.
     6. For the time remaining until the next step, everything is still.

   - The `feedback` box: placed directly below the input gate, it shows the value of the pseudocode variable `feedback`. The value enters when the result particle arrives in the `feedback` step, and is kept during that clock's `shift` and `xor`. In steps outside a clock it is empty. The value of `feedback` reaches the gates only when a particle carries it in the `xor` step; during `shift` the feedback line stays grey. If `feedback` is 0, no `xor` step comes and nothing flows on the feedback line. The box is filled with the value's colour (1 is red, 0 is white, grey when empty), so it is clear at a glance whether the clock feeds back. Like the value, the colour appears when the result particle arrives.
   - XOR gates light up only in the steps where they are used in the computation (the input gate in `feedback`, the tap gates in `xor`), from the moment the input particles arrive.
   - A box whose value changes in `xor` keeps its box colour and flips the value inside when the result particle arrives. `xorOut` has no particle to carry, so it flips at the start of the step.
   - In `shift`, every value slides straight in from the box on its right, and the original value of `r[width-1]` leaves to the left and disappears. The leaving value has already been used to compute `feedback`, so it does not enter the input gate, and it has fully disappeared just after leaving the box's left edge. Every value moves only the spacing between boxes, with the same duration and easing, so they all look equally fast. The entrance of `r[0]` (the standby position) is also placed one box spacing to the right of the centre of `r[0]`.
   - Standby: when the next step is `shift`, the value that will newly enter `r[0]` from the right end is shown in advance as a dotted circle right beside `r[0]` (on the wire the value comes in on). In `shift`, the new value of `r[0]` enters straight across from that position. Its colour follows the value's colour (1 is red, 0 is white). No standby is shown for values that merely move from the neighbouring box, since they are already visible, or for the result of `xor`, which is shown by the particle returning from the gate to the box.
   - Pressing a bit of the input stream sets or removes a breakpoint on that bit. A bit with a breakpoint has a dot above it (grey if disabled).
   - When the input is whole bytes, a faint line is drawn under each byte, and pressing it sets or removes a breakpoint on that byte. A byte with a breakpoint has that line drawn in red (grey if disabled).
   - A legend gives the meaning of ⊕ and of the colours.
3. Playback controls (the toolbar above the LFSR diagram).
4. Lower panel: the pseudocode (current line highlighted) and Progress, the log of steps.
   - Progress lists the steps from the start up to the current step, newest first. Each line shows the kind of step, the number of the input bit involved, the `crc` after processing (binary and hexadecimal), and a supplement (such as the formula of the feedback bit).
   - Only the newest line is in large text; all earlier lines are listed in the same size and the same intensity. Up to the newest 40 lines are shown. The height of Progress is fixed so that the layout does not move with the number of lines. What does not fit is viewed by scrolling.
   - Line changes are animated over 240 ms. When a step advances, the new line slides in from above, and the line that was newest slides down with the other lines while its text shrinks. The new line moves as far and as fast as the line below it, and nothing above the top of the log is shown, so lines never overlap while they move. Going back does the reverse: the line that has newly become the newest grows its text, and the remaining lines slide up.
   - Stepping back or seeking rewinds Progress to that step as well.
   - Pressing left of a line number of the code sets or removes a breakpoint on that line. Lines that execute no step take none. A breakpoint is shown as a red dot left of the line number, grey if disabled. To show where one goes, a faint red ring is drawn there on the line under the mouse, and on every such line on a phone.
5. Variables (sidebar): the values of the code's variables at the step being shown.
   - `crc` (binary and hexadecimal), `byte` (hexadecimal, with which byte it is), `bit`, `feedback`, the number of input bits read (read / total) and the number of XORs done.
   - `bit` and `feedback` have a value only during the `feedback`, `shift` and `xor` steps of their clock. `byte` has a value only from the byte's first step (`reflectIn` or its first `feedback`) to the end of its last clock. While a variable has no value it is shown as `—`. When the input length is not a multiple of 8, `byte` is not shown.
   - A variable whose value changed from the previous step is shown in a different colour.
6. Breakpoints (sidebar): the list of breakpoints set.
   - A line breakpoint shows the name of its step kind (as in Progress) and that line in the current code language. A byte breakpoint shows which byte it is and its value as entered, and a bit breakpoint which bit it is and its value as fed.
   - Each entry has a checkbox to enable or disable it and a button to remove it. A line breakpoint also has a hit count field (empty to hit every time) and the number of times its line has been reached up to the step being shown. A button above the list removes them all.

At `done` the register glows green, and the bit string "input + CRC" is shown.

### Parameter mapping

While the mouse or keyboard focus is on a settings panel field or a pseudocode chip, that parameter is "focused", and the places it is used are emphasized in cyan.

| Parameter | Settings panel | Pseudocode               | LFSR diagram            |
| --------- | -------------- | ------------------------ | ----------------------- |
| `width`   | Field          | `width` and `mask` chips | Register boxes          |
| `poly`    | Field          | `poly` chip              | XOR gates and tap wires |
| `init`    | Field          | `init` chip              | Register boxes          |
| `refin`   | Field          | `refin` chip             | Input stream            |
| `refout`  | Field          | `refout` chip            | Register boxes          |
| `xorout`  | Field          | `xorout` chip            | Register boxes          |

While the mouse or keyboard focus is on the input field, the input stream of the LFSR diagram is emphasized in the same colour.

### Colours

Each colour has exactly one meaning.

| Colour | Meaning                                                                              |
| ------ | ------------------------------------------------------------------------------------ |
| Red    | Value 1 (wires and particles carrying that value)                                    |
| White  | Value 0 (wires and particles carrying that value)                                    |
| Yellow | What is being computed now (lit gates, the most significant bit, the next input bit) |
| Cyan   | The focused parameter and the places it is used                                      |
| Grey   | What is not in use (wires with no value flowing, gates that are not working)         |
| Green  | The completed CRC                                                                    |

## 8. Naming page

Shows how presets are named and how parameter names differ, with diagrams and tables.

- Pages are switched in the activity bar. On the Naming page, the editor area lists items 1 to 5 below, and the sidebar holds a table of contents for the sections. If the URL fragment is `#names` or starts with `#names/`, the Naming page opens; otherwise the Visualizer page opens. Settings are kept in localStorage and the URL query, so switching pages does not change the visualizer's settings.
- This page's content is built from the list of presets (chapter 1) and the parameter descriptions (the same as in the description pane). The teaching preset `CRC-3/TUTORIAL` is not in the reveng catalogue, so it is not listed.

1. Anatomy of a name: using `CRC-16/KERMIT` as the example, the name is shown split into "CRC", "width (`width`)" and "the name of the standard, product, organization or the like that first used it". Official names in the reveng catalogue take this form, and the pair of the width and the second half identifies one configuration.
2. Families sharing a `poly`: for each group of 2 or more presets with the same width and `poly`, `init`, `refin`/`refout` and `xorout` are listed in a table. In each column, cells whose value differs from the family's first preset are highlighted. Families are ordered by width ascending, and within the same width by `poly` ascending; within a family, presets follow the order of the preset list.
3. Alias table: the aliases of all presets are listed in alphanumeric order, so that each one's official name can be looked up. A name whose meaning splits depending on convention (`CRC-16-CCITT`) gets a separate row listing all candidate official names.
4. Diagram of parameter-name aliases: on a fixed LFSR diagram (width 3, poly 0x3) drawn with the same parts as the visualizer's diagram, a leader line is drawn from the place where each parameter acts, and at its end only the parameter name (`poly` and so on) is written. The places are: `width` the row of registers, `poly` the tap gates, `init` the register boxes, `refin` the input stream, and `refout` and `xorout` the CRC output taken from the register.
   - Hovering over a parameter name emphasizes the place where it acts in the focused-parameter colour, and adds its full name and aliases on a small tag.
   - Parameter names are links; selecting one moves to that parameter's row in the table of 5 and highlights the row. The URL fragment is `#names/<parameter name>`.
5. Parameter name table: for each parameter, the parameter name, full name, meaning and aliases are listed. The aliases are the same as in the description pane ("Aliases" in chapter 16).

## 9. Narrow down page

Shows, as a flowchart (tree), how fixing parameter values one at a time narrows the preset candidates down to one algorithm, and lets the viewer make the choices on the spot.

- The targets are the reveng catalogue's presets (excluding `CRC-3/TUTORIAL`, as on the Naming page).
- The path of fixed values: represented by a sequence of "parameter and its value" pairs, and the open branch point at the end (a parameter whose value has not been chosen yet). The candidates are the presets that match every value on the path.
- Branch points: at a node with 2 or more candidates, only parameters that take 2 or more distinct values among the candidates can be chosen. Parameters with the same value in every candidate are not offered, since splitting by them means nothing. The order of fixing is chosen by the viewer.
- How the tree is drawn: nodes are laid out along the path from the root (all candidates). Each node shows the parameter name it splits by, and one branch per value in ascending order of value (false first), each branch labelled with its number of candidates.
  - Branches on the path are open, show the next node, and are emphasized. Branches not chosen stay closed and show only the number of candidates; choosing one replaces the path from that node onwards with that branch. A branch with one candidate also shows the preset's official name.
  - Each node also offers a choice of the parameter to split by. Choosing a parameter different from the current one discards the path from that node onwards and splits again.
  - Values are written in decimal for `width`, as `true`/`false` for `refin` and `refout`, and in uppercase hexadecimal (`0x1021`) for the others.
- Once the candidates are narrowed to one, that preset's official name and "Open in visualizer" are shown. Selecting it applies that preset's settings (including the input) and moves to the Visualizer page.
- The sidebar holds the list of fixed values, the official names of the remaining candidates, and "Open in visualizer" if one candidate remains. The status bar shows the number of remaining candidates.
- URL fragment: `#narrow`, followed in order by each fixed value as `/<parameter name>=<value>`, and finally by the open branch point as `/<parameter name>` (e.g. `#narrow/width=16/poly=0x1021/init`). Reloading or sharing opens the same path. When opening, if a parameter that cannot split, a value with no candidates or a part that cannot be parsed appears, the path is cut just before it.

## 10. Cyclic page

Shows why a CRC is called a "cyclic" redundancy check, with diagrams of two rings built from the same generator polynomial.

- Generator polynomial: `g(x) = x^width + poly(x)`. To keep the rings drawable, it is chosen from the following small generator polynomials. It is not linked to the values in the settings panel.

  | `g(x)`               | `width` | `poly` | Period `n` |
  | -------------------- | ------- | ------ | ---------- |
  | x³ + x + 1 (default) | 3       | `0x3`  | 7          |
  | x³ + x² + 1          | 3       | `0x5`  | 7          |
  | x⁴ + x + 1           | 4       | `0x3`  | 15         |
  | x⁴ + x³ + x² + x + 1 | 4       | `0xF`  | 5          |
  | x⁵ + x² + 1          | 5       | `0x5`  | 31         |

- Period `n`: the smallest `n` (1 or more) for which the remainder of `x^n` divided by `g(x)` is 1. It is also the smallest `n` for which `g(x)` divides `x^n − 1`.
- Rotation count `k`: an integer from 0 to `n − 1` shared by the two rings. "▶" increases it by 1 and "◀" decreases it by 1 (modulo `n`). Changing the generator polynomial resets it to 0. It is kept neither in the URL nor in storage.
- Codeword ring: the `n`-bit codeword, made of the `n − width`-bit message followed by its CRC (the remainder of the message multiplied by `x^width` and divided by `g(x)`; equivalent to `init` 0, `refin` and `refout` false, `xorout` 0), is laid out on a ring with `x^0` at the top and increasing degree clockwise. The message is the first `n − width` bits of `1101` repeated.
  - The ring shows the remainder of the codeword multiplied by `x^k` and divided by `x^n − 1` (the codeword rotated by `k` bits). The degree of each bit rises by `k`, and bits that go past `x^(n−1)` wrap around to `x^0`. Rotation is animated so that the whole ring turns.
  - Values are filled red for 1 and white for 0, and the bits appended as the CRC are outlined in green so they can be followed through rotation.
  - Below the ring, the rotated bit string (highest degree first) and its remainder divided by `g(x)` (`width` bits) are shown. However many bits it is rotated, the remainder is 0, showing it is still a codeword.
- State ring: the states of the register of chapter 3 when it is loaded with `x^0` (`0…01`) and keeps being clocked with input bit 0 are laid out clockwise with `x^0` at the top, connected in order by arrows. The `j`-th state is the remainder of `x^j` divided by `g(x)`, and it returns to `x^0` after `n` clocks.
  - States are written in `width`-bit binary, and the state of `x^k` is emphasized (it corresponds to multiplying by `x^k` in the codeword ring).
- Below the two rings, the following explanation is placed: the length of the ring and the number of clocks until the state returns are both `n`. Since the remainder of `x^n` divided by `g(x)` is 1, replacing the wrapped bit's `x^n` with `x^0` does not change the remainder divided by `g(x)`. So a rotated codeword is still a codeword, and codes with this property are called cyclic codes. Real CRCs are usually applied to inputs shorter than `n` (shortened from a cyclic code by taking its leading bits as 0).
- The sidebar lists the generator polynomials by `g(x)` and `n`, with the selected one emphasized. The status bar shows `g(x)` and `n`.
- URL fragment: `#cyclic` (the default generator polynomial) or `#cyclic/width=<decimal>/poly=<hex>` (e.g. `#cyclic/width=4/poly=0x3`). If it is not in the list or cannot be parsed, the page opens with the default generator polynomial.

## 11. Redundancy page

Shows why a CRC is called a "redundancy" check, with the appended bits and how they are used to find errors. The choice of generator polynomial, the codeword (message of `k = n − width` bits and CRC of `width` bits), the sidebar and the status bar are the same as on the Cyclic page (chapter 10).

1. What is redundant: the codeword to be sent is laid out in one row, with the message and the CRC in different colours, each labelled with its number of bits. An explanation is added that the CRC is determined by computation from the message and carries no new information, but these extra bits let the receiver check the data.
2. Codewords are a part of all bit strings: shows by numbers that there are `2^n` strings of `n` bits, of which `2^k` are codewords divisible by `g(x)`, a ratio of `1/2^width`.
   - When `2^n` is 128 or less (`n` = 5, 7), a diagram is added that lays out all strings in a grid in order of value. Codewords are filled green, and the current received string is shown with a yellow frame.
   - For any `n`, a strip lays out the `2^width` CRCs that could follow the received message (`k` bits), in order of value. Exactly one of them, the CRC of the received message, makes a codeword: it is filled green. The received CRC is shown with a yellow frame. The error is detected exactly when the two differ (this always agrees with the verdict in 3).
   - An explanation is added that the chance of a corrupted string happening to be some codeword is about `1/2^width`, and that a larger `width` makes errors harder to miss.
3. Break it and check: below the sent codeword, the received string is laid out in one row. Selecting a bit of the received string flips it (inserts an error; selecting it again restores it).
   - The error `e` (the XOR of the sent and received strings), the error length (the number of bits from the first flipped bit to the last flipped bit; 0 if nothing is flipped), the remainder of the received string divided by `g(x)`, and the verdict are shown. An explanation is added that the remainder of the received string equals the remainder of `e` divided by `g(x)`.
   - There are 3 verdicts: no error (`e` = 0), error detected (the remainder is not 0), error missed (`e` ≠ 0 and the remainder is 0; the corrupted string is also a codeword).
   - "Undo" removes the error, and "Missed example" sets `e` to `g(x)` itself (the bits from `x^width` to `x^0`). The length of that error is `width + 1`.
   - As errors that are always detected, 1-bit errors and errors of length `width` or less are listed. An explanation is added that an error is missed only when `e` is divisible by `g(x)`.
   - The error is kept neither in the URL nor in storage, and is removed when the generator polynomial changes.

- URL fragment: `#redundancy` (the default generator polynomial) or `#redundancy/width=<decimal>/poly=<hex>`. If it is not in the list or cannot be parsed, the page opens with the default generator polynomial.

## 12. Check page

Shows the part that gives a CRC the name "check", that is, how the receiver actually checks the data, using the current settings and input (the same as on the Visualizer page).

- The sent string: the input (message) followed by its CRC, appended in the following order.
  - `refin` = `refout` = false: the CRC, `width` bits from the most significant bit.
  - `refin` = `refout` = true: the CRC as `⌈width/8⌉` bytes, lowest byte first (each byte is written from the most significant bit, as with the input in chapter 2; in the computation it is reflected by `refin` and enters from the least significant bit). If `width` is not a multiple of 8, the upper bits of the last byte are 0.
  - `refin` ≠ `refout`: the method of running the whole codeword through (2 below) does not apply, so the sent string is the message and the CRC appended from the most significant bit, and 2 shows the reason it does not apply.
- The received string: the sent string is laid out in one row. A small gap separates the message from the CRC, and the CRC bits have a green outline. A legend below shows, each with a sample that looks like the bits it explains, the bit counts of the message and the CRC ("message (72 bits)", "CRC (16 bits, green outline)"), the value colours (red = 1, white = 0), and the mark of a flipped bit (yellow outline). Selecting a bit flips it (selecting it again restores it), and "Undo" restores all. The flips are kept neither in the URL nor in storage, and are removed when the settings or input change.
- Two ways to check are shown side by side, each with the computed values and a verdict (no error / error).
  1. Recompute and compare: compute the CRC of the received message and compare it with the received CRC. If they match, there is no error.
  2. Run the whole codeword through: compute the whole received string with the same settings. Without errors, the result is a constant value that depends only on the settings, not on the message (the residue). If it matches the residue, there is no error. If `xorout` is 0 and there is no reflection, the residue is 0. An explanation is added that because the value is compared with a constant, hardware can check without telling the message and the CRC apart.
  - Where both apply, the two verdicts are always the same.
- Check value: if the current settings are a preset, the catalogue's check value (`check`) and the CRC computed from the input `123456789` are shown side by side. An explanation is added that the check value is not for finding errors but a guide for verifying that an implementation is correct. If the settings are not a preset, only the computed value is shown.
- What a CRC cannot check: an explanation is placed that a CRC only tells you there is an error and does not fix it, and that if whoever rewrites the message also recomputes the CRC the change cannot be detected, so it offers no protection against deliberate tampering (use a hash or MAC).
- When the settings are invalid, the sent string, the ways to check and the check value are not shown; instead it is shown that the settings are invalid.
- The sidebar and the status bar are the same as on the Equivalences page (chapter 13).
- The URL fragment is `#check`.

## 13. Equivalences page

Shows the relations between parameters in two sections.

### Substitutions that give the same CRC

Lists the relations under which different setting values, or operations applied to the input or output instead of a setting, give the same CRC. Each item shows the left side (the original setting), the right side (the substituted setting or operation), an explanation of why it holds, and the values of both sides computed with the current settings and input (the same as on the Visualizer page), showing that they match.

| Item                       | Left side                 | Right side                                                                                                                                    | Condition for showing an example              |
| -------------------------- | ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------- |
| Reflected input            | `refin` = true            | `refin` = false, with the bit order of each input byte reversed beforehand                                                                    | The input is whole bytes (multiple of 8 bits) |
| Reflected output           | `refout` = true           | `refout` = false, then XOR the resulting CRC with `xorout` again, reverse its bit order, and XOR with `xorout` once more                      | Always                                        |
| Right-shift implementation | `refin` = `refout` = true | No reflection; a register that shifts right, using `poly` and `init` with their bit order reversed (fed LSB first, looking at the lowest bit) | `refin` = `refout` = true                     |
| Initial value as a prefix  | `init` = I                | `init` = 0, with a `width`-bit prefix P added before the input. P is the value satisfying `P(x)·x^width ≡ I (mod g(x))`                       | The lowest bit of `poly` is 1                 |
| What init and xorout add   | `init`, `xorout`          | The CRC computed with `init` = `xorout` = 0, XORed with the CRC (original setting) of an all-zero input of the same length                    | Always                                        |

- For "Initial value as a prefix", it is added that with `init` = 0, adding 0s before the input does not change the CRC, and P is shown in the notation of each value (hexadecimal).
- For "What init and xorout add", the explanation adds that for inputs a and b of the same length, `crc(a ⊕ b) = crc(a) ⊕ crc(b) ⊕ crc(0…0)` holds (the effect of `init` and `xorout` is a constant determined only by the length).
- The examples first rewrite the input reflection (`refin`) into the form where the right side applies it to the input, and then compute both sides with the parameters of chapter 1 and the register of chapter 3. Only for the right-shift implementation is the right side obtained by a separate computation (a register that shifts right). For items whose condition is not met, the reason is shown instead of an example.

### What follows from what you know

When some parameters or part of an implementation's code are known, lists what is determined from them. Each item notes what it means for the current settings.

| What you know                                                                           | What follows                                                                                                                                                        |
| --------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `refin` = `refout` = true                                                               | A right-shift implementation computes it without reflecting input or output. That implementation's code writes `poly` and `init` with their bit order reversed      |
| `refin` = `refout` = false                                                              | A left-shift implementation computes it without reflecting input or output. The code writes `poly` and `init` as they are                                           |
| `refin` ≠ `refout`                                                                      | Whether shifting right or left, a separate process that reverses the bit order is needed somewhere                                                                  |
| The implementation's code shifts right (shifts 1 bit right, branches on the lowest bit) | Unless it reflects input or output separately, `refin` = `refout` = true. Bit-reversing the code's `poly` constant gives `poly` in normal notation                  |
| The implementation's code shifts left (shifts 1 bit left, branches on the highest bit)  | Unless it reflects input or output separately, `refin` = `refout` = false. The code's `poly` constant is already in normal notation                                 |
| The lowest bit of the code's `poly` constant is 0                                       | `poly` in normal notation always has lowest bit 1 (the constant term of the generator polynomial), so this constant is the reversed value and the code shifts right |

- Supplement for the current settings: shows one of right-shift, left-shift, or reflection needed either way, and for right-shift, the values of `poly` and `init` written in the implementation's code (the bit-reversed values). For `poly`, it adds that if the bit-reversed value also has lowest bit 1, the constant alone does not determine whether it is in normal notation or reversed.

### Common

- When the settings are invalid, the examples and the supplement for the current settings are not shown; instead it is shown that the settings are invalid.
- The sidebar holds the current settings (the 6 parameters and the input) and a link to the Visualizer page. The status bar shows the preset name (`custom` if none).
- The URL fragment is `#equivalence`.

## 14. Table page

Shows, with the current settings and input (the same as on the Visualizer page), the byte-at-a-time method that many libraries use, with a table of 256 values (table T). It shows that the result equals the bit-at-a-time computation (chapter 3), and that each table value is 8 clocks of the bit-at-a-time computation.

- Direction: a right-shift table when `refin` = `refout` = true, otherwise a left-shift table. For left shift, a note says that when `refin` is true the bit order of each input byte is reversed before use, and that when `refout` is true the result is reversed at the end.
- Table T: the values for indices 0 to 255 are laid out in a 16 × 16 grid (rows are the upper 4 bits, columns the lower 4 bits; values in hexadecimal with as many digits as `width` needs).
  - Left shift: `T[i]` is the value after feeding the 8 bits of `i`, MSB first, into a zero register (chapter 3) for 8 clocks (the remainder of `i(x)·x^width` divided by `g(x)`).
  - Right shift: `T[i]` is the value after feeding the 8 bits of `i`, LSB first, into a zero register of an implementation that shifts right, for 8 clocks (the left-shift `T[i reversed in 8 bits]` reversed in `width` bits).
- How a value is made: selecting a value in the grid lists the 8 clocks that make it, one row each (clock number, input bit, register afterwards in binary). The last row is the selected value.
- Byte-at-a-time computation: the update formula and a row for each input byte (byte, `crc` before, index (in hexadecimal, to match the rows and columns of the table), `T[index]`, `crc` after) are shown, starting from the initial value and ending with the output reflection and `xorout` applied.
  - The update formula is `crc = ((crc << 8) & mask) ^ T[((crc >> (width − 8)) ^ byte) & 0xFF]` for left shift with `width` ≥ 8, `crc = T[((crc << (8 − width)) ^ byte) & 0xFF]` for left shift with `width` < 8, and `crc = (crc >> 8) ^ T[(crc ^ byte) & 0xFF]` for right shift. The initial value is `init` for left shift and `init` reversed in `width` bits for right shift.
  - Selecting a row highlights the value at that row's index in the grid and shows how that value is made. The first row is selected by default.
  - Below the result, the CRC computed bit at a time is shown, and that the two match.
- When the input is not a multiple of 8 bits, the byte-at-a-time computation is not shown and the reason is (the table and how values are made are still shown).
- When the settings are invalid, only that fact is shown.
- The sidebar and the status bar are the same as on the Equivalences page (chapter 13). The selected row and value are kept neither in the URL nor in storage.
- The URL fragment is `#table`.

## 15. Estimation page

Given several pairs of data and their CRC, searches for the parameters that satisfy them.

- Entering pairs: each row takes data and a CRC (hexadecimal). The data format is chosen once for the page (`text` is the UTF-8 bytes, `hex` is bytes in hexadecimal). Rows can be added and removed; there are 2 rows at first. The pairs are kept neither in the URL nor in storage.
- `width`: set in an input field. When empty, it is the number of digits of the longest CRC entered × 4.
- The search has two stages; choosing "Search" runs both and shows the results.
  1. From the catalogue: presets of that `width` for which the CRC of the data equals the entered CRC for every pair.
  2. Brute force: only when `width` is 16 or less. Every `poly` whose lowest bit is 1, and all 4 combinations of `refin` and `refout`, are tried.
     - At least two pairs of the same length are needed. For pairs a and b of the same length, `crc(a) ⊕ crc(b)` equals `crc(a ⊕ b)` computed with `init` = `xorout` = 0 ("What init and xorout add" in chapter 13), so `poly`, `refin` and `refout` can be narrowed regardless of `init` and `xorout`.
     - If there are also pairs of different lengths, every value of `init` is tried to determine it, and `xorout` is determined too. Otherwise `init` and `xorout` are not unique, so the `xorout` for `init` = 0 is shown with a note that they are not determined.
     - Without two pairs of the same length, the brute force is not run, and the reason is shown.
  - Each candidate shows the 6 parameters (or that `init` is undetermined), with its official name if it is in the catalogue. Up to 20 candidates are shown, with the number beyond that. Each candidate has "Open in visualizer", which applies those settings with the first pair's data as the input and moves to the Visualizer page.
- The sidebar has hints on collecting pairs (two or more pairs of the same length, plus at least one of a different length, make the result easier to determine). The status bar shows the number of candidates.
- Rows with invalid input (not readable as hexadecimal, or a CRC that does not fit in `width` bits) show the error in that field, and no search is run.
- The URL fragment is `#estimate`.

## 16. Terms and notation

The rules under "Character types" are for the Japanese UI text (see chapter 17). The term table and the alias table give the Japanese UI wording, with the English UI wording (from `src/i18n/en.ts`) alongside.

### Character types

- When the UI is in Japanese, on-screen sentences are written in Japanese. Latin letters are used only for the following.
  - Established abbreviations: CRC, LFSR, XOR, UTF-8, LSB, MSB
  - The Rocksoft model parameter names: `width`, `poly`, `init`, `refin`, `refout`, `xorout`. The settings panel and the pseudocode use the same spelling.
  - Identifiers that appear in the pseudocode and in the diagram's formulas: `crc`, `feedback`, `msb`, `bit`, `byte`, `mask`, `r0` and so on
  - Key names, and the official names and aliases of presets
  - Field labels and options of the settings panel (chapter 7). The Japanese name is shown in the description pane.
  - Aliases in the description pane. They list the names used in the literature as they are, so English and katakana are also used.
- Katakana words are limited to the following: ビット (bit), バイト (byte), レジスタ (register), シフト (shift), フィードバック (feedback), ステップ (step), プリセット (preset), ループ (loop), ハードウェア (hardware), ソフトウェア (software)
- Parentheses are full-width （）, except inside the pseudocode and formulas.
- Home-made abbreviations (such as `fb`) do not appear on screen.

### One name per concept

| Concept                                                              | On-screen text (Japanese UI / English UI) | Pseudocode and diagram formulas |
| -------------------------------------------------------------------- | ----------------------------------------- | ------------------------------- |
| The value of `r[width-1]`                                            | 最上位ビット / most significant bit       | `msb`                           |
| The bit fed in on one clock                                          | 入力ビット / input bit                    | `bit`                           |
| Most significant bit XOR input bit                                   | フィードバックビット / feedback bit       | `feedback`                      |
| The number of bits in the CRC                                        | 幅 / Width                                | `width`                         |
| The generator polynomial (without the x^width term, normal notation) | 生成多項式 / Generator polynomial         | `poly`                          |
| The register value before the computation                            | 初期値 / Initial value                    | `init`                          |
| Whether each input byte is fed in LSB first                          | 入力の反転 / Reflect input                | `refin`                         |
| Whether the register is reflected before the final XOR               | 出力の反転 / Reflect output               | `refout`                        |
| The value XORed at the end                                           | 最終 XOR 値 / Final XOR value             | `xorout`                        |
| The reveng catalogue's check                                         | 検査値 / check value                      | —                               |

### Aliases

The aliases listed in the description pane are as follows. Only names whose corresponding setting could be confirmed in the literature are listed.

| Parameter | Japanese UI                                                                                                     | English UI                                                                                                                 |
| --------- | --------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `width`   | CRC のビット数、多項式の次数                                                                                    | CRC size, polynomial degree, width                                                                                         |
| `poly`    | 多項式、通常表記（normal）、polynomial。右送りの実装ではビットを反転した値（例: `0x8005` → `0xA001`）で書かれる | polynomial, normal form, generator. Right-shift implementations write it with its bits reversed (e.g. `0x8005` → `0xA001`) |
| `init`    | 初期 CRC 値、initial value                                                                                      | initial CRC value, seed, init                                                                                              |
| `refin`   | 入力の反射、LSB ファースト（true のとき）、reflected input                                                      | reflected input, LSB first (when true), RefIn                                                                              |
| `refout`  | 出力の反射、reflected output                                                                                    | reflected output, RefOut                                                                                                   |
| `xorout`  | 出力 XOR、final XOR、XorOut                                                                                     | output XOR, final XOR, XorOut                                                                                              |

A CRC with `refin` and `refout` both true can be computed by a right-shift (LSB-first) implementation, and a CRC with both false by a left-shift (MSB-first) implementation.

## 17. Display language

- On-screen text can be shown in Japanese, English, Chinese (Simplified), Spanish, German and French. The on-screen text quoted in this specification is the English UI wording (the Japanese edition, [spec.ja.md](spec.ja.md), quotes the Japanese UI wording); other languages show translations with the same meaning.
- Not translated: parameter names, the official names and aliases of presets, field labels and options of the settings panel, identifiers in the pseudocode and the diagram's formulas, the notation of numbers, and key names.
- The full names of the parameters (the Japanese name when the UI is in Japanese) and aliases shown in the description pane and the parameter name table are the names used in that language. The aliases also include English names common in the literature.
- The character-type rules of chapter 16 are for the Japanese UI. In every language, one concept is rendered with one term throughout.
- Default language: the first entry in the browser's preferred-language list (`navigator.languages`), read from the start, whose language code (such as `zh` of `zh-CN`) matches one of the 6 above. If none matches, English.
- Switching: at the right end of the status bar, a selector lists each language by its own name (日本語, English, 中文, Español, Deutsch, Français). The chosen language is kept, like the other settings, in localStorage and the URL query (`lang`, with values `ja`, `en`, `zh`, `es`, `de`, `fr`); if nothing is saved, the default language is used. Every page is shown in the same language, and the document language (`<html lang>`) follows it.

## 18. Unspecified

- `width` above 32 bits (such as CRC-64) is not handled.
- The layout is not optimized for mobile devices (a width of 1024px or more is assumed).
