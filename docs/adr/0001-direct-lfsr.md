**English** | [日本語](0001-direct-lfsr.ja.md)

# ADR-0001: Use a direct LFSR as the hardware model

- Status: Accepted
- Date: 2026-10-09

## Context

The initial plan was to draw the LFSR by appending width zeros to the end of the input (augmentation) and pushing the input bits into the register from the LSB side. This scheme maps easily onto long division of polynomials.

Later, it was decided that the CRC configuration should be switchable across the whole Rocksoft model (init / refin / refout / xorout).

## Decision

Use a direct LFSR, in which the input bit is XORed at the MSB exit and the result becomes the feedback. No zero padding is applied.

## Reasons

- The Rocksoft model's `init` is defined as the initial register value of the direct form. To get the same CRC with the zero-padding scheme, `init` has to be converted to a different value, and the initial value shown on screen would no longer match the preset's `init`.
- The `check` values in the reveng catalogue can verify the displayed calculation as is.
- With the zero-padding scheme, the MSB is always 0 for the first width clocks, so the feedback never fires during the slow playback at the start. With the direct form, `fb = 1` can happen from the first clock.

## Alternatives not adopted

- A switch that also shows the zero-padding scheme: when `init ≠ 0`, a separate screen explaining the conversion of the displayed values would be needed, blurring the focus of the teaching material.
