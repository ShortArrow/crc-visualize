import type { Messages } from "./ja";

/** 英語の画面の文。 */
export const en: Messages = {
  pages: { visualizer: "Visualizer", names: "Naming", narrow: "Narrow down" },
  workbench: { sidebarToggle: "Toggle sidebar (Ctrl+B)", language: "Language" },
  settings: {
    heading: "Settings",
    invalid: "The settings contain errors. Fix the fields marked in red.",
    invalidStatus: "Invalid settings",
  },
  errors: {
    widthRange: "Enter an integer from 1 to 32",
    notHex: "Enter a hexadecimal number",
    tooWide: (width: number) => `Enter a value that fits in ${width} bits`,
    zero: "0 is not allowed",
    notBits: "Use only 0 and 1",
    oddHex: "Enter two digits per byte",
    tooLong: (max: number) => `Input is limited to ${max} bits`,
    refinBytes: "With refin, enter whole bytes (multiples of 8 bits)",
  },
  controls: {
    first: "First (Home)",
    prev: "Step back (←)",
    playPause: "Play / pause (Space)",
    play: "Play",
    pause: "Pause",
    next: "Step forward (→)",
    last: "Last (End)",
    loop: "Loop (L)",
    speedMode: "Speed mode",
    auto: "Auto (slow at first)",
    steady: "Steady",
    rate: "Speed multiplier",
  },
  visualizer: {
    hardware: "Hardware (LFSR)",
    legend: {
      xor: "⊕ = XOR (1 if the two inputs differ)",
      one: "red = value 1",
      zero: "white = value 0",
      busy: "yellow = computing",
      crc: "green = CRC",
      param: "cyan = focused parameter",
    },
    software: "Software",
    log: "Progress",
    inputBits: (cursor: number, total: number) => `Input bits (${cursor}/${total})`,
  },
  steps: {
    init: "Initialize",
    reflectIn: "Reflect input byte (refin)",
    feedback: "Compute the feedback bit",
    shift: "Shift",
    xor: "XOR with the polynomial",
    reflectOut: "Reflect output (refout)",
    xorOut: "Final XOR (xorout)",
    done: "Done",
  },
  log: {
    byteNo: (n: number) => `byte ${n}`,
    willXor: "feedback = 1, so XOR with poly next",
    noXor: "feedback = 0, so no XOR",
    inputBit: (n: number) => `input bit ${n}`,
    inputPlusCrc: "input + CRC",
    check: (hex: string, match: boolean) => `check value ${hex} ${match ? "matches" : "does not match"}`,
  },
  code: {
    pseudo: "Pseudocode",
    language: "Code language",
    refinOff: "not run because refin is false",
    refoutOff: "not run because refout is false",
    xoroutZero: "no change because xorout is 0",
  },
  help: {
    idle: "Hover over a setting or a parameter in the code to see its name and description.",
    aliases: (list: string) => `Also called: ${list}`,
    reflectedPoly: (hex: string) => `Reflected form (the value written in right-shifting implementations): ${hex}`,
    shiftRight: "refin and refout are both true, so a right-shifting (LSB-first) implementation can compute it",
    shiftLeft: "refin and refout are both false, so a left-shifting (MSB-first) implementation can compute it",
    shiftMixed:
      "refin and refout differ, so either a right- or left-shifting implementation needs a separate bit reversal somewhere",
  },
  params: {
    width: {
      title: "Width",
      summary: "The number of bits in the CRC. It equals the number of registers and the degree of the generator polynomial.",
      aliases: ["CRC size", "polynomial degree", "width"],
    },
    poly: {
      title: "Generator polynomial",
      summary:
        "The coefficients from x^(width-1) down to x^0, leaving out the top x^width term. Written here in normal (unreflected) form.",
      aliases: ["polynomial", "normal form", "generator"],
    },
    init: {
      title: "Initial value",
      summary: "The value loaded into the register before the first input bit goes in.",
      aliases: ["initial CRC value", "seed", "init"],
    },
    refin: {
      title: "Reflect input",
      summary:
        "If true, each input byte is fed LSB first. Same as reversing the bit order within each byte and feeding MSB first.",
      aliases: ["reflected input", "LSB first (when true)", "RefIn"],
    },
    refout: {
      title: "Reflect output",
      summary: "If true, the bit order of the whole register is reversed before the final XOR.",
      aliases: ["reflected output", "RefOut"],
    },
    xorout: {
      title: "Final XOR value",
      summary: "The value XORed with the CRC at the end. 0 leaves it unchanged.",
      aliases: ["output XOR", "final XOR", "XorOut"],
    },
  },
  fields: {
    preset: {
      title: "Preset",
      summary:
        "A named CRC configuration. Choosing one fills in the 6 parameters and the input 123456789 used for the check value.",
    },
    inputMode: {
      title: "Input mode",
      summary:
        "How the input is written: bits is a run of 0s and 1s, hex is bytes in hexadecimal, text is a string as UTF-8 bytes.",
    },
    input: {
      title: "Input",
      summary:
        "The data to compute the CRC of. Write it in the input mode; it enters the register one bit at a time from the first bit.",
    },
  },
  names: {
    toc: "Contents",
    sections: {
      parts: "Anatomy of a name",
      families: "Families sharing a poly",
      aliases: "Alias table",
      paramMap: "Parameter aliases",
      paramTable: "Parameter name table",
    },
    parts: {
      head: "cyclic redundancy check",
      width: "width",
      origin: "the standard, product or organization that first used it",
      note: "Official names in the reveng catalogue take this form; the width and the second half together identify one configuration.",
    },
    families: {
      note: "Even with the same width and poly, a different init, refin/refout or xorout makes a different CRC. Values that differ from the first member are highlighted.",
      caption: (width: number, poly: string) => `width ${width}, poly ${poly}`,
      name: "Official name",
    },
    aliases: {
      ambiguous: "Names whose meaning depends on who uses them",
      oneOf: (names: string) => `one of ${names}`,
      alias: "Alias",
      name: "Official name",
    },
    paramMap: {
      note: "Hover over a name to see where it acts and its aliases; select it to jump to its row in the table below.",
    },
    paramTable: { param: "Parameter", title: "Name", meaning: "Meaning", aliases: "Aliases" },
  },
  narrow: {
    heading: "Narrow down",
    note: "Pick a parameter to split by its values, then pick a branch to reduce the candidates. Once one remains, open it in the visualizer.",
    candidates: (n: number) => `${n} candidates`,
    splitBy: "Split by:",
    open: "Open in visualizer",
    fixed: "Fixed values",
    none: "None yet",
    status: (n: number) => `Narrow down: ${n} candidates`,
  },
  listSeparator: ", ",
};
