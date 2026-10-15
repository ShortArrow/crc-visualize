**English** | [日本語](0003-diagram-follows-steps.ja.md)

# ADR-0003: Match the XORs in the LFSR diagram to the step split, joining each box with the feedback directly below the box

- Status: Accepted
- Date: 2026-10-11

## Context

A hardware LFSR computes `r'[i] = r[i-1] XOR (feedback AND poly[i])` in one clock. Textbook diagrams place the XOR gate between `r[i-1]` and `r[i]`, join the output of `r[i-1]` with the feedback, and feed the result into `r[i]`.

This visualization, on the other hand, splits one clock into two steps, `shift` (`crc = (crc << 1) & mask`) and `xor` (`crc ^= poly`), to stay in sync with the lines of the pseudocode.

Placing the gates between the boxes (in a horizontal row, and later as a Y shape below the gap between boxes) produced the following mismatches.

- At the `xor` step the shift has already happened, and `r[i-1]` holds a different value. Even so, the diagram looks as if "the XOR of `r[i-1]` and the feedback goes into `r[i]`".
- At the `shift` step, the value at a tap position moves unnaturally by passing underneath the gate.

## Decision

The LFSR diagram follows the step split.

- All boxes are connected by horizontal lines, and on `shift` every value slides straight sideways.
- An XOR gate is placed directly below each `r[i]` with `poly[i] = 1` (including `i = 0`). On `xor`, the value of `r[i]` goes down the left leg, joins the feedback coming from below at the gate, and the result goes up the right leg back into `r[i]`.

## Reasons

- Each step of the diagram does the same thing as the one pseudocode line highlighted at the same time (`<<` and `^=`).
- The inputs of `xor` are "the current value of that box" and "the feedback", which are exactly the values visible on screen.
- `r[0]` also takes the same two-stage form as the other taps: "a 0 comes in on the shift, and it is XORed from below on `xor`".

## Alternatives not adopted

- Place the gate between `r[i-1]` and `r[i]` (the hardware clock as is): the mismatches above remain.
- Keep the Y shape and only make `shift` slide sideways: two paths, a horizontal line and a Y shape, would run side by side between the boxes, making it ambiguous which one a value travels along.
