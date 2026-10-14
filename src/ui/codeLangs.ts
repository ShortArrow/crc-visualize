import { CAPITAL_BOOL, C_LIKE, hexWith, imperative, type LangDef, type Template } from "./codeTemplate";

const C_LOOPS = {
  forBitsOfByte: { open: ["for (int k = 7; k >= 0; k--) {"], bind: ["int bit = (byte >> k) & 1;"] },
  ifFeedback: "if (feedback == 1) {",
  endIf: "}",
  end: "}",
} as const;

const pseudo = imperative({
  label: "",
  comment: "//",
  lit: C_LIKE,
  init: (c) => ["crc = ", c.init, ";"],
  reflectIn: (c) => ["if (", c.refin, ") byte = reflect(byte, 8);"],
  forBytes: { open: ["for (byte of input) {"] },
  forBitsOfByte: { open: ["for (bit of bitsMsbFirst(byte)) {"] },
  forBits: { open: ["for (bit of inputBits) {"] },
  feedback: (c) => ["feedback = ((crc >> (", c.width, " - 1)) & 1) ^ bit;"],
  shift: (c) => ["crc = (crc << 1) & ", c.mask, ";"],
  ifFeedback: "if (feedback == 1) {",
  xor: (c) => ["crc ^= ", c.poly, ";"],
  endIf: "}",
  end: "}",
  reflectOut: (c) => ["if (", c.refout, ") crc = reflect(crc, ", c.width, ");"],
  xorOut: (c) => ["crc ^= ", c.xorout, ";"],
  ret: "return crc;",
});

const c = imperative({
  ...C_LOOPS,
  label: "C",
  comment: "//",
  lit: C_LIKE,
  init: (c) => ["uint32_t crc = ", c.init, ";"],
  reflectIn: (c) => ["if (", c.refin, ") byte = reflect(byte, 8);"],
  forBytes: { open: ["for (size_t i = 0; i < len; i++) {"], bind: ["uint32_t byte = input[i];"] },
  forBits: { open: ["for (size_t i = 0; i < nbits; i++) {"], bind: ["int bit = bits[i];"] },
  feedback: (c) => ["int feedback = ((crc >> (", c.width, " - 1)) & 1) ^ bit;"],
  shift: (c) => ["crc = (crc << 1) & ", c.mask, ";"],
  xor: (c) => ["crc ^= ", c.poly, ";"],
  reflectOut: (c) => ["if (", c.refout, ") crc = reflect(crc, ", c.width, ");"],
  xorOut: (c) => ["crc ^= ", c.xorout, ";"],
  ret: "return crc;",
});

const csharp = imperative({
  ...C_LOOPS,
  label: "C#",
  comment: "//",
  lit: C_LIKE,
  init: (c) => ["uint crc = ", c.init, ";"],
  reflectIn: (c) => ["if (", c.refin, ") b = Reflect(b, 8);"],
  forBytes: { open: ["foreach (uint b in input) {"] },
  forBitsOfByte: { open: ["for (int k = 7; k >= 0; k--) {"], bind: ["uint bit = (b >> k) & 1;"] },
  forBits: { open: ["foreach (uint bit in inputBits) {"] },
  feedback: (c) => ["uint feedback = ((crc >> (", c.width, " - 1)) & 1) ^ bit;"],
  shift: (c) => ["crc = (crc << 1) & ", c.mask, ";"],
  xor: (c) => ["crc ^= ", c.poly, ";"],
  reflectOut: (c) => ["if (", c.refout, ") crc = Reflect(crc, ", c.width, ");"],
  xorOut: (c) => ["crc ^= ", c.xorout, ";"],
  ret: "return crc;",
});

const typescript = imperative({
  ...C_LOOPS,
  label: "TypeScript",
  comment: "//",
  lit: C_LIKE,
  init: (c) => ["let crc = ", c.init, ";"],
  reflectIn: (c) => ["if (", c.refin, ") byte = reflect(byte, 8);"],
  forBytes: { open: ["for (let byte of input) {"] },
  forBitsOfByte: { open: ["for (let k = 7; k >= 0; k--) {"], bind: ["const bit = (byte >> k) & 1;"] },
  forBits: { open: ["for (const bit of inputBits) {"] },
  feedback: (c) => ["const feedback = ((crc >>> (", c.width, " - 1)) & 1) ^ bit;"],
  shift: (c) => ["crc = ((crc << 1) & ", c.mask, ") >>> 0;"],
  xor: (c) => ["crc = (crc ^ ", c.poly, ") >>> 0;"],
  reflectOut: (c) => ["if (", c.refout, ") crc = reflect(crc, ", c.width, ");"],
  xorOut: (c) => ["crc = (crc ^ ", c.xorout, ") >>> 0;"],
  ret: "return crc;",
});

const rust = imperative({
  label: "Rust",
  comment: "//",
  lit: C_LIKE,
  init: (c) => ["let mut crc: u32 = ", c.init, ";"],
  reflectIn: (c) => ["let byte = if ", c.refin, " { reflect(byte, 8) } else { byte };"],
  forBytes: { open: ["for &byte in input {"] },
  forBitsOfByte: { open: ["for k in (0..8).rev() {"], bind: ["let bit = (byte as u32 >> k) & 1;"] },
  forBits: { open: ["for &bit in input_bits {"] },
  feedback: (c) => ["let feedback = ((crc >> (", c.width, " - 1)) & 1) ^ bit;"],
  shift: (c) => ["crc = (crc << 1) & ", c.mask, ";"],
  ifFeedback: "if feedback == 1 {",
  xor: (c) => ["crc ^= ", c.poly, ";"],
  endIf: "}",
  end: "}",
  reflectOut: (c) => ["if ", c.refout, " { crc = reflect(crc, ", c.width, "); }"],
  xorOut: (c) => ["crc ^= ", c.xorout, ";"],
  ret: "crc",
});

const zig = imperative({
  label: "Zig",
  comment: "//",
  lit: C_LIKE,
  init: (c) => ["var crc: u32 = ", c.init, ";"],
  reflectIn: (c) => ["if (", c.refin, ") byte = reflect(byte, 8);"],
  forBytes: { open: ["for (input) |b| {"], bind: ["var byte: u32 = b;"] },
  forBitsOfByte: { open: ["for (0..8) |i| {"], bind: ["const bit = (byte >> @intCast(7 - i)) & 1;"] },
  forBits: { open: ["for (input_bits) |bit| {"] },
  feedback: (c) => ["const feedback = ((crc >> (", c.width, " - 1)) & 1) ^ bit;"],
  shift: (c) => ["crc = (crc << 1) & ", c.mask, ";"],
  ifFeedback: "if (feedback == 1) {",
  xor: (c) => ["crc ^= ", c.poly, ";"],
  endIf: "}",
  end: "}",
  reflectOut: (c) => ["if (", c.refout, ") crc = reflect(crc, ", c.width, ");"],
  xorOut: (c) => ["crc ^= ", c.xorout, ";"],
  ret: "return crc;",
});

const python = imperative({
  label: "Python",
  comment: "#",
  lit: CAPITAL_BOOL,
  init: (c) => ["crc = ", c.init],
  reflectIn: (c) => ["if ", c.refin, ": byte = reflect(byte, 8)"],
  forBytes: { open: ["for byte in data:"] },
  forBitsOfByte: { open: ["for k in range(7, -1, -1):"], bind: ["bit = (byte >> k) & 1"] },
  forBits: { open: ["for bit in input_bits:"] },
  feedback: (c) => ["feedback = ((crc >> (", c.width, " - 1)) & 1) ^ bit"],
  shift: (c) => ["crc = (crc << 1) & ", c.mask],
  ifFeedback: "if feedback == 1:",
  xor: (c) => ["crc ^= ", c.poly],
  reflectOut: (c) => ["if ", c.refout, ": crc = reflect(crc, ", c.width, ")"],
  xorOut: (c) => ["crc ^= ", c.xorout],
  ret: "return crc",
});

const ruby = imperative({
  label: "Ruby",
  comment: "#",
  lit: C_LIKE,
  init: (c) => ["crc = ", c.init],
  reflectIn: (c) => ["byte = reflect(byte, 8) if ", c.refin],
  forBytes: { open: ["data.each_byte do |byte|"] },
  forBitsOfByte: { open: ["7.downto(0) do |k|"], bind: ["bit = (byte >> k) & 1"] },
  forBits: { open: ["input_bits.each do |bit|"] },
  feedback: (c) => ["feedback = ((crc >> (", c.width, " - 1)) & 1) ^ bit"],
  shift: (c) => ["crc = (crc << 1) & ", c.mask],
  ifFeedback: "if feedback == 1",
  xor: (c) => ["crc ^= ", c.poly],
  endIf: "end",
  end: "end",
  reflectOut: (c) => ["crc = reflect(crc, ", c.width, ") if ", c.refout],
  xorOut: (c) => ["crc ^= ", c.xorout],
  ret: "crc",
});

const lua = imperative({
  label: "Lua",
  comment: "--",
  lit: C_LIKE,
  init: (c) => ["local crc = ", c.init],
  reflectIn: (c) => ["if ", c.refin, " then byte = reflect(byte, 8) end"],
  forBytes: { open: ["for _, byte in ipairs(data) do"] },
  forBitsOfByte: { open: ["for k = 7, 0, -1 do"], bind: ["local bit = (byte >> k) & 1"] },
  forBits: { open: ["for _, bit in ipairs(input_bits) do"] },
  feedback: (c) => ["local feedback = ((crc >> (", c.width, " - 1)) & 1) ~ bit"],
  shift: (c) => ["crc = (crc << 1) & ", c.mask],
  ifFeedback: "if feedback == 1 then",
  xor: (c) => ["crc = crc ~ ", c.poly],
  endIf: "end",
  end: "end",
  reflectOut: (c) => ["if ", c.refout, " then crc = reflect(crc, ", c.width, ") end"],
  xorOut: (c) => ["crc = crc ~ ", c.xorout],
  ret: "return crc",
});

const perl = imperative({
  label: "Perl",
  comment: "#",
  lit: { ...C_LIKE, bool: (b) => (b ? "1" : "0") },
  init: (c) => ["my $crc = ", c.init, ";"],
  reflectIn: (c) => ["$byte = reflect($byte, 8) if ", c.refin, ";"],
  forBytes: { open: ["for my $byte (@data) {"] },
  forBitsOfByte: { open: ["for my $k (reverse 0 .. 7) {"], bind: ["my $bit = ($byte >> $k) & 1;"] },
  forBits: { open: ["for my $bit (@input_bits) {"] },
  feedback: (c) => ["my $feedback = (($crc >> (", c.width, " - 1)) & 1) ^ $bit;"],
  shift: (c) => ["$crc = ($crc << 1) & ", c.mask, ";"],
  ifFeedback: "if ($feedback == 1) {",
  xor: (c) => ["$crc ^= ", c.poly, ";"],
  endIf: "}",
  end: "}",
  reflectOut: (c) => ["$crc = reflect($crc, ", c.width, ") if ", c.refout, ";"],
  xorOut: (c) => ["$crc ^= ", c.xorout, ";"],
  ret: "return $crc;",
});

const pascal = imperative({
  label: "Pascal",
  comment: "//",
  lit: { hex: hexWith("$"), bool: CAPITAL_BOOL.bool },
  init: (c) => ["crc := ", c.init, ";"],
  reflectIn: (c) => ["if ", c.refin, " then b := Reflect(b, 8);"],
  forBytes: { open: ["for b in data do", "begin"] },
  forBitsOfByte: { open: ["for k := 7 downto 0 do", "begin"], bind: ["bit := (b shr k) and 1;"] },
  forBits: { open: ["for bit in inputBits do", "begin"] },
  feedback: (c) => ["feedback := ((crc shr (", c.width, " - 1)) and 1) xor bit;"],
  shift: (c) => ["crc := (crc shl 1) and ", c.mask, ";"],
  ifFeedback: "if feedback = 1 then",
  xor: (c) => ["crc := crc xor ", c.poly, ";"],
  end: "end;",
  reflectOut: (c) => ["if ", c.refout, " then crc := Reflect(crc, ", c.width, ");"],
  xorOut: (c) => ["crc := crc xor ", c.xorout, ";"],
  ret: "Result := crc;",
});

const powershell = imperative({
  label: "PowerShell",
  comment: "#",
  lit: { ...C_LIKE, bool: (b) => (b ? "$true" : "$false") },
  init: (c) => ["$crc = ", c.init],
  reflectIn: (c) => ["if (", c.refin, ") { $byte = Reflect $byte 8 }"],
  forBytes: { open: ["foreach ($byte in $data) {"] },
  forBitsOfByte: { open: ["for ($k = 7; $k -ge 0; $k--) {"], bind: ["$bit = ($byte -shr $k) -band 1"] },
  forBits: { open: ["foreach ($bit in $inputBits) {"] },
  feedback: (c) => ["$feedback = (($crc -shr (", c.width, " - 1)) -band 1) -bxor $bit"],
  shift: (c) => ["$crc = ($crc -shl 1) -band ", c.mask],
  ifFeedback: "if ($feedback -eq 1) {",
  xor: (c) => ["$crc = $crc -bxor ", c.poly],
  endIf: "}",
  end: "}",
  reflectOut: (c) => ["if (", c.refout, ") { $crc = Reflect $crc ", c.width, " }"],
  xorOut: (c) => ["$crc = $crc -bxor ", c.xorout],
  ret: "return $crc",
});

const bash = imperative({
  label: "Bash",
  comment: "#",
  lit: C_LIKE,
  init: (c) => ["crc=$(( ", c.init, " ))"],
  reflectIn: (c) => ["if ", c.refin, '; then byte=$(reflect "$byte" 8); fi'],
  forBytes: { open: ['for byte in "${data[@]}"; do'] },
  forBitsOfByte: { open: ["for (( k = 7; k >= 0; k-- )); do"], bind: ["bit=$(( (byte >> k) & 1 ))"] },
  forBits: { open: ['for bit in "${input_bits[@]}"; do'] },
  feedback: (c) => ["feedback=$(( ((crc >> (", c.width, " - 1)) & 1) ^ bit ))"],
  shift: (c) => ["crc=$(( (crc << 1) & ", c.mask, " ))"],
  ifFeedback: "if (( feedback == 1 )); then",
  xor: (c) => ["crc=$(( crc ^ ", c.poly, " ))"],
  endIf: "fi",
  end: "done",
  reflectOut: (c) => ["if ", c.refout, '; then crc=$(reflect "$crc" ', c.width, "); fi"],
  xorOut: (c) => ["crc=$(( crc ^ ", c.xorout, " ))"],
  ret: 'echo "$crc"',
});

const haskell: LangDef = {
  label: "Haskell",
  comment: "--",
  lit: CAPITAL_BOOL,
  template: (c, p): Template[] => [
    p.refin
      ? { parts: ["checksum input = finish (foldl step start input)"], runs: "done" }
      : { parts: ["checksum inputBits = finish (foldl clock start bits)"], runs: "done" },
    { parts: ["  where"] },
    { parts: ["    start = ", c.init], runs: "init" },
    p.refin
      ? {
          parts: ["    step crc byte = foldl clock crc (bitsMsbFirst (if ", c.refin, " then reflect byte 8 else byte))"],
          runs: "reflectIn",
        }
      : { parts: ["    bits = if ", c.refin, " then reflectBytes inputBits else inputBits"], runs: "reflectIn" },
    { parts: ["    clock crc bit ="] },
    { parts: ["      let feedback = ((crc `shiftR` (", c.width, " - 1)) .&. 1) `xor` bit"], runs: "feedback" },
    { parts: ["          shifted = (crc `shiftL` 1) .&. ", c.mask], runs: "shift" },
    { parts: ["      in if feedback == 1"], role: "if" },
    { parts: ["           then shifted `xor` ", c.poly], runs: "xor", role: "ifBody" },
    { parts: ["           else shifted"] },
    { parts: ["    finish crc ="] },
    { parts: ["      let reflected = if ", c.refout, " then reflect crc ", c.width, " else crc"], runs: "reflectOut" },
    { parts: ["      in reflected `xor` ", c.xorout], runs: "xorOut" },
  ],
};

const erlang: LangDef = {
  label: "Erlang",
  comment: "%",
  lit: { ...C_LIKE, hex: hexWith("16#") },
  template: (c, p): Template[] => [
    { parts: [p.refin ? "checksum(Input) ->" : "checksum(InputBits) ->"] },
    { parts: ["    Start = ", c.init, ","], runs: "init" },
    ...(p.refin
      ? [{ parts: ["    finish(lists:foldl(fun step/2, Start, Input))."], runs: "done" } as const]
      : [
          {
            parts: ["    Bits = case ", c.refin, " of true -> reflect_bytes(InputBits); false -> InputBits end,"],
            runs: "reflectIn",
          } as const,
          { parts: ["    finish(lists:foldl(fun clock/2, Start, Bits))."], runs: "done" } as const,
        ]),
    ...(p.refin
      ? [
          { parts: [""] },
          { parts: ["step(Byte, Crc) ->"] },
          {
            parts: ["    Bits = bits_msb_first(case ", c.refin, " of true -> reflect(Byte, 8); false -> Byte end),"],
            runs: "reflectIn",
          } as const,
          { parts: ["    lists:foldl(fun clock/2, Crc, Bits)."] },
        ]
      : []),
    { parts: [""] },
    { parts: ["clock(Bit, Crc) ->"] },
    { parts: ["    Feedback = ((Crc bsr (", c.width, " - 1)) band 1) bxor Bit,"], runs: "feedback" },
    { parts: ["    Shifted = (Crc bsl 1) band ", c.mask, ","], runs: "shift" },
    { parts: ["    case Feedback of"], role: "if" },
    { parts: ["        1 -> Shifted bxor ", c.poly, ";"], runs: "xor", role: "ifBody" },
    { parts: ["        0 -> Shifted"] },
    { parts: ["    end."] },
    { parts: [""] },
    { parts: ["finish(Crc) ->"] },
    {
      parts: ["    Reflected = case ", c.refout, " of true -> reflect(Crc, ", c.width, "); false -> Crc end,"],
      runs: "reflectOut",
    },
    { parts: ["    Reflected bxor ", c.xorout, "."], runs: "xorOut" },
  ],
};

const fsharp: LangDef = {
  label: "F#",
  comment: "//",
  lit: { ...C_LIKE, hex: hexWith("0x", "u") },
  template: (c, p): Template[] => [
    { parts: [p.refin ? "let checksum (input: byte list) =" : "let checksum (inputBits: uint32 list) ="] },
    { parts: ["    let start = ", c.init], runs: "init" },
    { parts: ["    let clock crc bit ="] },
    { parts: ["        let feedback = ((crc >>> (", c.width, " - 1)) &&& 1u) ^^^ bit"], runs: "feedback" },
    { parts: ["        let shifted = (crc <<< 1) &&& ", c.mask], runs: "shift" },
    { parts: ["        if feedback = 1u then"], role: "if" },
    { parts: ["            shifted ^^^ ", c.poly], runs: "xor", role: "ifBody" },
    { parts: ["        else shifted"] },
    ...(p.refin
      ? [
          { parts: ["    let step crc (b: byte) ="] },
          { parts: ["        let b = if ", c.refin, " then reflect (uint32 b) 8 else uint32 b"], runs: "reflectIn" } as const,
          { parts: ["        bitsMsbFirst b |> List.fold clock crc"] },
          { parts: ["    let crc = input |> List.fold step start"] },
        ]
      : [
          { parts: ["    let bits = if ", c.refin, " then reflectBytes inputBits else inputBits"], runs: "reflectIn" } as const,
          { parts: ["    let crc = bits |> List.fold clock start"] },
        ]),
    { parts: ["    let reflected = if ", c.refout, " then reflect crc ", c.width, " else crc"], runs: "reflectOut" },
    { parts: ["    let result = reflected ^^^ ", c.xorout], runs: "xorOut" },
    { parts: ["    result"], runs: "done" },
  ],
};

/** コードを書ける言語。キーは URL のクエリ code の値。pseudo の名前は表示言語で出す。 */
export const CODE_LANGS = {
  pseudo,
  c,
  csharp,
  typescript,
  rust,
  zig,
  python,
  ruby,
  lua,
  perl,
  pascal,
  powershell,
  bash,
  haskell,
  erlang,
  fsharp,
} satisfies Record<string, LangDef>;

export type CodeLang = keyof typeof CODE_LANGS;
