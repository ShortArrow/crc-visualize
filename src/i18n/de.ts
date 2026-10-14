import type { Messages } from "./ja";

/** ドイツ語の画面の文。 */
export const de: Messages = {
  pages: { visualizer: "Visualisierung", names: "Namensregeln", narrow: "Eingrenzen", cyclic: "Zyklisch" },
  workbench: { sidebarToggle: "Seitenleiste ein-/ausblenden (Ctrl+B)", language: "Sprache" },
  settings: {
    heading: "Einstellungen",
    invalid: "Die Einstellungen enthalten Fehler. Korrigiere die rot markierten Felder.",
    invalidStatus: "Ungültige Einstellungen",
  },
  errors: {
    widthRange: "Gib eine ganze Zahl von 1 bis 32 ein",
    notHex: "Gib eine Hexadezimalzahl ein",
    tooWide: (width: number) => `Gib einen Wert ein, der in ${width} Bit passt`,
    zero: "0 ist nicht erlaubt",
    notBits: "Nur 0 und 1 verwenden",
    oddHex: "Gib zwei Ziffern pro Byte ein",
    tooLong: (max: number) => `Die Eingabe ist auf ${max} Bit begrenzt`,
    refinBytes: "Mit refin ganze Bytes eingeben (Vielfache von 8 Bit)",
  },
  controls: {
    first: "Anfang (Home)",
    prev: "Einen Schritt zurück (←)",
    playPause: "Abspielen / Pause (Space)",
    play: "Abspielen",
    pause: "Pause",
    next: "Einen Schritt vor (→)",
    last: "Ende (End)",
    loop: "Wiederholen (L)",
    speedMode: "Geschwindigkeitsmodus",
    auto: "Automatisch (anfangs langsam)",
    steady: "Gleichmäßig",
    rate: "Geschwindigkeitsfaktor",
  },
  visualizer: {
    hardware: "Hardware (LFSR)",
    legend: {
      xor: "⊕ = XOR (1, wenn die beiden Eingänge verschieden sind)",
      one: "rot = Wert 1",
      zero: "weiß = Wert 0",
      busy: "gelb = wird berechnet",
      crc: "grün = CRC",
      param: "cyan = fokussierter Parameter",
    },
    software: "Software",
    log: "Verlauf",
    inputBits: (cursor: number, total: number) => `Eingabebits (${cursor}/${total})`,
  },
  steps: {
    init: "Initialisierung",
    reflectIn: "Eingabebyte spiegeln (refin)",
    feedback: "Rückkopplungsbit berechnen",
    shift: "Schieben",
    xor: "XOR mit dem Polynom",
    reflectOut: "Ausgabe spiegeln (refout)",
    xorOut: "Abschließendes XOR (xorout)",
    done: "Fertig",
  },
  log: {
    byteNo: (n: number) => `Byte ${n}`,
    willXor: "feedback = 1, daher als Nächstes XOR mit poly",
    noXor: "feedback = 0, daher kein XOR",
    inputBit: (n: number) => `Eingabebit ${n}`,
    inputPlusCrc: "Eingabe + CRC",
    check: (hex: string, match: boolean) => `Prüfwert ${hex} ${match ? "stimmt überein" : "stimmt nicht überein"}`,
  },
  code: {
    pseudo: "Pseudocode",
    language: "Programmiersprache",
    refinOff: "wird nicht ausgeführt, da refin false ist",
    refoutOff: "wird nicht ausgeführt, da refout false ist",
    xoroutZero: "keine Änderung, da xorout 0 ist",
  },
  help: {
    idle: "Fahre mit der Maus über eine Einstellung oder einen Parameter im Code, um Namen und Beschreibung zu sehen.",
    aliases: (list: string) => `Auch genannt: ${list}`,
    reflectedPoly: (hex: string) => `Gespiegelte Form (der Wert in rechtsschiebenden Implementierungen): ${hex}`,
    shiftRight: "refin und refout sind beide true, daher lässt sich der CRC rechtsschiebend (ab dem LSB) berechnen",
    shiftLeft: "refin und refout sind beide false, daher lässt sich der CRC linksschiebend (ab dem MSB) berechnen",
    shiftMixed:
      "refin und refout unterscheiden sich, daher braucht sowohl die rechts- als auch die linksschiebende Implementierung irgendwo eine separate Bitumkehr",
  },
  params: {
    width: {
      title: "Breite",
      summary: "Die Anzahl der Bits des CRC. Sie entspricht der Anzahl der Register und dem Grad des Generatorpolynoms.",
      aliases: ["CRC-Länge", "Grad des Polynoms", "width"],
    },
    poly: {
      title: "Generatorpolynom",
      summary:
        "Die Koeffizienten von x^(width-1) bis x^0 ohne den höchsten Term x^width. Hier in normaler (nicht gespiegelter) Form geschrieben.",
      aliases: ["Polynom", "Normalform", "polynomial"],
    },
    init: {
      title: "Startwert",
      summary: "Der Wert, der vor dem ersten Eingabebit in das Register geladen wird.",
      aliases: ["Anfangswert", "initial value"],
    },
    refin: {
      title: "Eingabe spiegeln",
      summary:
        "Bei true wird jedes Eingabebyte ab dem LSB eingespeist. Das entspricht dem Umkehren der Bitreihenfolge im Byte und dem Einspeisen ab dem MSB.",
      aliases: ["gespiegelte Eingabe", "LSB zuerst (bei true)", "reflected input"],
    },
    refout: {
      title: "Ausgabe spiegeln",
      summary: "Bei true wird vor dem abschließenden XOR die Bitreihenfolge des ganzen Registers umgekehrt.",
      aliases: ["gespiegelte Ausgabe", "reflected output"],
    },
    xorout: {
      title: "Abschließender XOR-Wert",
      summary: "Der Wert, mit dem der CRC am Ende per XOR verknüpft wird. Bei 0 ändert sich nichts.",
      aliases: ["Ausgabe-XOR", "final XOR", "XorOut"],
    },
  },
  fields: {
    preset: {
      title: "Voreinstellung",
      summary:
        "Eine benannte CRC-Konfiguration. Die Auswahl setzt die 6 Parameter und die Eingabe 123456789, mit der der Prüfwert bestätigt wird.",
    },
    inputMode: {
      title: "Eingabeformat",
      summary:
        "Wie die Eingabe geschrieben wird: bits ist eine Folge aus 0 und 1, hex sind Bytes in Hexadezimal, text ist eine Zeichenkette als UTF-8-Bytes.",
    },
    input: {
      title: "Eingabe",
      summary:
        "Die Daten, deren CRC berechnet wird. Im Eingabeformat geschrieben; sie gehen Bit für Bit ab dem ersten Bit ins Register.",
    },
  },
  names: {
    toc: "Inhalt",
    sections: {
      parts: "Aufbau eines Namens",
      families: "Familien mit gleichem poly",
      aliases: "Aliastabelle",
      paramMap: "Aliasse der Parameter",
      paramTable: "Tabelle der Parameternamen",
    },
    parts: {
      head: "zyklische Redundanzprüfung",
      width: "Breite",
      origin: "der Standard, das Produkt oder die Organisation, die ihn zuerst verwendet hat",
      note: "Die offiziellen Namen im reveng-Katalog haben diese Form; Breite und zweiter Teil zusammen bezeichnen eine Konfiguration.",
    },
    families: {
      note: "Auch bei gleicher Breite und gleichem poly ergibt ein anderes init, refin/refout oder xorout einen anderen CRC. Werte, die vom ersten Mitglied abweichen, sind hervorgehoben.",
      caption: (width: number, poly: string) => `Breite ${width}, poly ${poly}`,
      name: "Offizieller Name",
    },
    aliases: {
      ambiguous: "Namen, deren Bedeutung davon abhängt, wer sie verwendet",
      oneOf: (names: string) => `einer von ${names}`,
      alias: "Alias",
      name: "Offizieller Name",
    },
    paramMap: {
      note: "Fahre mit der Maus über einen Namen, um zu sehen, wo er wirkt und wie er noch heißt; wähle ihn, um zu seiner Zeile in der Tabelle unten zu springen.",
    },
    paramTable: { param: "Parameter", title: "Name", meaning: "Bedeutung", aliases: "Aliasse" },
  },
  narrow: {
    heading: "Eingrenzen",
    note: "Wähle einen Parameter, um nach seinen Werten zu verzweigen, und dann einen Zweig, um die Kandidaten zu verringern. Bleibt einer übrig, öffne ihn in der Visualisierung.",
    candidates: (n: number) => `${n} Kandidaten`,
    splitBy: "Verzweigen nach:",
    open: "In der Visualisierung öffnen",
    fixed: "Festgelegte Werte",
    none: "Noch keine",
    status: (n: number) => `Eingrenzen: ${n} Kandidaten`,
  },
  generators: "Generatorpolynome",
  cyclic: {
    heading: "Warum „zyklische“ Redundanzprüfung?",
    wordRing: "Ring des Codeworts",
    wordNote:
      "Ein Codewort (Nachricht gefolgt von ihrem CRC), im Uhrzeigersinn angeordnet, x^0 oben. Einmal drehen heißt mit x multiplizieren.",
    stateRing: "Ring der Zustände",
    stateNote:
      "Die Registerzustände, wenn es bei 1 beginnt und fortlaufend das Eingabebit 0 erhält. Der j-te Zustand ist x^j mod g(x).",
    forward: "Mit x multiplizieren (einmal drehen)",
    back: "Durch x teilen (einmal zurückdrehen)",
    rotated: (k: number) => `Drehungen k = ${k}`,
    word: "Gedrehte Bits",
    remainder: "Rest modulo g(x)",
    crcBit: "grüner Rand = als CRC angehängte Bits",
    explain: (n: number) =>
      `Die Länge des Rings und die Anzahl der Schritte, bis der Zustand zu x^0 zurückkehrt, sind beide n = ${n}. Da x^n mod g(x) gleich 1 ist, ändert sich der Rest nicht, wenn man beim herumlaufenden Bit x^n durch x^0 ersetzt. Ein gedrehtes Codewort bleibt also ein Codewort; Codes mit dieser Eigenschaft heißen zyklische Codes.`,
    shortened:
      "Echte CRCs werden meist auf Eingaben angewendet, die kürzer als n sind. Das ist ein verkürzter zyklischer Code: ein zyklischer Code, dessen führende Bits als 0 gelten.",
  },
  listSeparator: ", ",
};
