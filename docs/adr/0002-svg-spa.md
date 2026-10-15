**English** | [日本語](0002-svg-spa.ja.md)

# ADR-0002: Draw with a React + SVG SPA instead of Motion Canvas

- Status: Accepted
- Date: 2026-10-09

## Context

The initial plan was to make video-like animations with Motion Canvas. Later, it was decided to make an SPA in which users can switch the CRC configuration. When the configuration changes, the number of steps, and so the length of the animation, changes too.

## Decision

Build a Vite + React + TypeScript SPA that draws the precomputed step sequence in SVG. Motion between steps is interpolated with CSS transitions.

## Reasons

- Drawing becomes a pure function of the step number, so pause, frame stepping, reverse playback and seeking are all achieved with the same mechanism.
- A configuration change only requires rebuilding the step sequence. With the approach of passing the configuration to the Motion Canvas Player through variables, recalculating the duration and coordinating with the surrounding UI would have to be done within the player's constraints.
