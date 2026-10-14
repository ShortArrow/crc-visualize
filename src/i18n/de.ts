import type { Messages } from "./ja";

/** ドイツ語の画面の文。 */
export const de: Messages = {
  pages: {
    visualizer: "Visualisierung",
    names: "Namensregeln",
    narrow: "Eingrenzen",
    cyclic: "Zyklisch",
    redundancy: "Redundanz",
    equivalence: "Äquivalenzen",
  },
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
  redundancy: {
    heading: "Warum „Redundanz“-Prüfung?",
    whatSection: "Was redundant ist",
    sent: "Gesendetes Codewort",
    message: (k: number) => `Nachricht ${k} Bits`,
    crc: (w: number) => `CRC ${w} Bits`,
    whatNote:
      "Die CRC-Bits werden aus der Nachricht berechnet und tragen keine neue Information. Erst diese zusätzlichen Bits erlauben dem Empfänger, die Daten durch Division durch g(x) zu prüfen.",
    spaceSection: "Codewörter sind nur ein Teil aller Bitfolgen",
    allWords: (n: number) => `${n}-Bit-Folgen`,
    codewords: "Durch g(x) teilbare Codewörter",
    ratio: "Anteil der Codewörter",
    spaceNote: (w: number) =>
      `Eine beschädigte Folge ist zufällig mit einer Wahrscheinlichkeit von etwa 1/2^${w} ein Codewort. Je größer width, desto seltener wird ein Fehler übersehen.`,
    gridLegend: "grün = Codewort, gelber Rand = empfangene Folge",
    checkSection: "Beschädigen und prüfen",
    received: "Empfangene Folge (Bit auswählen, um es zu kippen)",
    error: "Fehler e (gesendet XOR empfangen)",
    burst: "Fehlerlänge",
    remainder: "Rest modulo g(x)",
    remainderNote: "Der Rest der empfangenen Folge ist gleich dem Rest von e modulo g(x).",
    verdict: {
      clean: "Kein Fehler",
      detected: "Fehler erkannt (Rest ist nicht 0)",
      missed: "Fehler übersehen (die beschädigte Folge ist ebenfalls ein Codewort, daher ist der Rest 0)",
    },
    reset: "Zurücksetzen",
    missedExample: "Übersehenes Beispiel",
    guarantee: (w: number) =>
      `Jeder 1-Bit-Fehler und jeder Fehler der Länge ${w} oder weniger wird erkannt. Übersehen wird ein Fehler nur, wenn e durch g(x) teilbar ist. Das übersehene Beispiel setzt e auf g(x) selbst, mit der Länge ${w + 1}.`,
  },
  currentSettings: {
    heading: "Aktuelle Einstellungen",
    openVisualizer: "Einstellungen auf der Visualisierungsseite ändern",
  },
  equivalence: {
    heading: "Äquivalenzen",
    note: "Wie die Parameter zusammenhängen. Die Beispiele werden mit den aktuellen Einstellungen und der aktuellen Eingabe berechnet (wie auf der Visualisierungsseite).",
    sameSection: "Ersetzungen mit demselben CRC",
    left: "Ursprüngliche Einstellung",
    right: "Ersetzung",
    why: "Warum",
    example: "Beispiel mit den aktuellen Einstellungen",
    match: "gleich",
    prefix: "Präfix P",
    items: {
      refin: {
        title: "Gespiegelte Eingabe",
        left: "refin = true",
        right: "refin = false, wobei vorher die Bitreihenfolge jedes Eingabebytes umgedreht wird",
        why: "refin heißt, dass jedes Byte mit dem LSB zuerst eingeht. Dreht man zuerst die Reihenfolge innerhalb jedes Bytes um und gibt dann mit dem MSB zuerst ein, gelangen die Bits in derselben Reihenfolge ins Register.",
      },
      refout: {
        title: "Gespiegelte Ausgabe",
        left: "refout = true",
        right:
          "refout = false; danach den CRC erneut mit xorout verknüpfen, seine Bitreihenfolge umdrehen und noch einmal mit xorout verknüpfen",
        why: "refout spiegelt das Register vor dem abschließenden XOR. xorout entfernen, spiegeln und xorout wieder anwenden ergibt dasselbe.",
      },
      rightShift: {
        title: "Implementierung mit Rechtsschieben",
        left: "refin = refout = true",
        right:
          "Ohne Spiegelung; ein nach rechts schiebendes Register mit gespiegeltem poly und init, das jedes Byte mit dem LSB zuerst aufnimmt und nach dem niedrigsten Bit verzweigt",
        why: "Ein- und Ausgabe zu spiegeln ist dasselbe, wie mit dem ganzen Register gespiegelt zu rechnen. Ein gespiegeltes Register schiebt nach rechts, und sein poly ist ebenfalls gespiegelt.",
      },
      initPrefix: {
        title: "Startwert als Präfix",
        left: "init = I",
        right: "init = 0, mit einem width-Bit-Präfix P vor der Eingabe (P(x)·x^width ≡ I (mod g(x)))",
        why: "Gibt man P in ein Register mit Startwert 0 ein, bleibt der Wert I. Mit init = 0 ändern beliebig viele vorangestellte 0-Bits den CRC nicht; ein init ungleich 0 macht hinzugekommene oder verlorene führende Nullen erkennbar.",
      },
      affine: {
        title: "Was init und xorout beitragen",
        left: "init, xorout",
        right:
          "Der CRC mit init = xorout = 0, per XOR verknüpft mit dem CRC (ursprüngliche Einstellung) einer gleich langen Eingabe aus lauter Nullen",
        why: "Der CRC besteht nur aus XOR, daher gilt für gleich lange Eingaben a und b: crc(a ⊕ b) = crc(a) ⊕ crc(b) ⊕ crc(0…0). Die Wirkung von init und xorout ist eine Konstante, die nur von der Eingabelänge abhängt.",
      },
    },
    reasons: {
      notBytes: "Die Eingabe ist kein Vielfaches von 8 Bits und lässt sich nicht byteweise umdrehen",
      notReflected: "Gilt nicht, weil refin und refout nicht beide true sind",
      evenPoly: "Das niedrigste Bit von poly ist 0, daher lässt sich x nicht herausdividieren und es gibt kein Präfix",
    },
    inferSection: "Was aus dem Bekannten folgt",
    known: "Bekannt",
    follows: "Daraus folgt",
    rows: [
      {
        known: "refin = refout = true",
        follows:
          "Eine Implementierung mit Rechtsschieben berechnet ihn ohne Spiegelung von Ein- und Ausgabe. Ihr Code schreibt poly und init gespiegelt",
      },
      {
        known: "refin = refout = false",
        follows:
          "Eine Implementierung mit Linksschieben berechnet ihn ohne Spiegelung von Ein- und Ausgabe. Ihr Code schreibt poly und init unverändert",
      },
      { known: "refin ≠ refout", follows: "Ob nach rechts oder links geschoben wird, irgendwo ist eine eigene Bitumkehr nötig" },
      {
        known: "Der Code schiebt nach rechts (1 Bit, Verzweigung nach dem niedrigsten Bit)",
        follows:
          "Spiegelt er Ein- und Ausgabe nicht gesondert, ist refin = refout = true. Die Bitumkehr der poly-Konstante ergibt das normale poly",
      },
      {
        known: "Der Code schiebt nach links (1 Bit, Verzweigung nach dem höchsten Bit)",
        follows:
          "Spiegelt er Ein- und Ausgabe nicht gesondert, ist refin = refout = false. Die poly-Konstante ist das normale poly",
      },
      {
        known: "Das niedrigste Bit der poly-Konstante im Code ist 0",
        follows:
          "Ein normales poly hat immer das niedrigste Bit 1 (das konstante Glied des Generators), also ist diese Konstante gespiegelt und der Code schiebt nach rechts",
      },
    ],
    current: "Mit den aktuellen Einstellungen",
    direction: {
      right: "Eine Implementierung mit Rechtsschieben berechnet ihn ohne Spiegelung von Ein- und Ausgabe",
      left: "Eine Implementierung mit Linksschieben berechnet ihn ohne Spiegelung von Ein- und Ausgabe",
      mixed: "Ob nach rechts oder links geschoben wird, eine eigene Bitumkehr ist nötig",
    },
    codeConstants: (poly: string, init: string) => `Der Code der Implementierung schreibt poly = ${poly} und init = ${init}`,
    ambiguous:
      "Auch die gespiegelte Form dieses poly hat das niedrigste Bit 1, daher verrät die Konstante allein nicht, ob sie normal oder gespiegelt ist",
  },
  listSeparator: ", ",
};
