import type { Messages } from "./ja";

/** Spanish UI text. */
export const es: Messages = {
  pages: {
    visualizer: "Visualizador",
    names: "Nomenclatura",
    narrow: "Filtrar",
    cyclic: "Cíclico",
    redundancy: "Redundancia",
    check: "Comprobación",
    equivalence: "Equivalencias",
    table: "Tabla",
    estimate: "Estimación",
  },
  workbench: { sidebarToggle: "Mostrar/ocultar barra lateral (Ctrl+B)", language: "Idioma" },
  settings: {
    heading: "Configuración",
    invalid: "La configuración tiene errores. Corrige los campos marcados en rojo.",
    invalidStatus: "Configuración no válida",
  },
  errors: {
    widthRange: "Introduce un entero de 1 a 32",
    notHex: "Introduce un número hexadecimal",
    tooWide: (width: number) => `Introduce un valor que quepa en ${width} bits`,
    zero: "No se permite 0",
    notBits: "Usa solo 0 y 1",
    oddHex: "Introduce dos dígitos por byte",
    tooLong: (max: number) => `La entrada admite como máximo ${max} bits`,
    refinBytes: "Con refin, introduce bytes completos (múltiplos de 8 bits)",
    notIndex: "Introduce el número de byte como un entero de 0 o más",
    outsideFrame: "El rango o el campo CRC no cabe en la trama seleccionada",
  },
  controls: {
    first: "Inicio (Home)",
    prev: "Retroceder un paso (←)",
    playPause: "Reproducir / pausar (Space)",
    play: "Reproducir",
    pause: "Pausar",
    next: "Avanzar un paso (→)",
    last: "Final (End)",
    loop: "Repetir (L)",
    speedMode: "Modo de velocidad",
    auto: "Automático (lento al principio)",
    steady: "Constante",
    rate: "Multiplicador de velocidad",
  },
  visualizer: {
    hardware: "Hardware (LFSR)",
    legend: {
      xor: "⊕ = XOR (1 si las dos entradas difieren)",
      one: "rojo = valor 1",
      zero: "blanco = valor 0",
      busy: "amarillo = calculando",
      crc: "verde = CRC",
      param: "cian = parámetro enfocado",
    },
    software: "Software",
    log: "Progreso",
    inputBits: (cursor: number, total: number) => `Bits de entrada (${cursor}/${total})`,
  },
  steps: {
    init: "Inicialización",
    reflectIn: "Invertir el byte de entrada (refin)",
    feedback: "Calcular el bit de realimentación",
    shift: "Desplazamiento",
    xor: "XOR con el polinomio",
    reflectOut: "Invertir la salida (refout)",
    xorOut: "XOR final (xorout)",
    done: "Terminado",
  },
  log: {
    byteNo: (n: number) => `byte ${n}`,
    willXor: "feedback = 1, así que a continuación XOR con poly",
    noXor: "feedback = 0, así que no hay XOR",
    inputBit: (n: number) => `bit de entrada ${n}`,
    inputPlusCrc: "entrada + CRC",
    check: (hex: string, match: boolean) => `valor de comprobación ${hex}: ${match ? "coincide" : "no coincide"}`,
  },
  code: {
    pseudo: "Pseudocódigo",
    language: "Lenguaje del código",
    refinOff: "no se ejecuta porque refin es false",
    refoutOff: "no se ejecuta porque refout es false",
    xoroutZero: "sin cambios porque xorout es 0",
  },
  frames: {
    toEnd: "final",
    noField: "ninguno",
    pick: (i: number) => `Visualizar la trama ${i}`,
    match: "Coincide con el campo CRC",
    mismatch: "No coincide con el campo CRC",
    unfit: "El rango no cabe",
  },
  debug: {
    variables: "Variables",
    breakpoints: "Puntos de interrupción",
    bitsRead: "bits de entrada leídos",
    xorCount: "XOR realizados",
    empty:
      "Pulsa a la izquierda de un número de línea del código, un bit del flujo de entrada o la línea bajo uno de sus bytes, para añadir uno.",
    removeAll: "Quitar todos",
    remove: "Quitar",
    enabled: "Activado",
    hitCount: "Número de aciertos (vacío para todas las veces)",
    hits: (n: number) => `${n}×`,
    byte: (k: number, hex: string) => `byte ${k} (${hex})`,
    toggleLine: "Poner o quitar un punto de interrupción en esta línea",
    toggleByte: (k: number) => `Poner o quitar un punto de interrupción en el byte ${k}`,
    bit: (n: number, b: string) => `bit ${n} (${b})`,
    toggleBit: (n: number) => `Poner o quitar un punto de interrupción en el bit ${n}`,
  },
  help: {
    idle: "Pasa el ratón sobre un ajuste o un parámetro del código para ver su nombre y descripción.",
    aliases: (list: string) => `También llamado: ${list}`,
    reflectedPoly: (hex: string) =>
      `Forma reflejada (el valor que se escribe en implementaciones con desplazamiento a la derecha): ${hex}`,
    shiftRight:
      "refin y refout son ambos true, así que se puede calcular con una implementación de desplazamiento a la derecha (desde el LSB)",
    shiftLeft:
      "refin y refout son ambos false, así que se puede calcular con una implementación de desplazamiento a la izquierda (desde el MSB)",
    shiftMixed:
      "refin y refout difieren, así que tanto con desplazamiento a la derecha como a la izquierda hace falta invertir los bits aparte en algún punto",
  },
  params: {
    width: {
      title: "Ancho",
      summary: "El número de bits del CRC. Coincide con el número de registros y con el grado del polinomio generador.",
      aliases: ["tamaño del CRC", "grado del polinomio", "width"],
    },
    poly: {
      title: "Polinomio generador",
      summary:
        "Los coeficientes de x^(width-1) a x^0, sin el término superior x^width. Aquí se escribe en forma normal (sin reflejar).",
      aliases: ["polinomio", "forma normal", "polynomial"],
    },
    init: {
      title: "Valor inicial",
      summary: "El valor que se carga en el registro antes de introducir el primer bit de entrada.",
      aliases: ["valor inicial del CRC", "initial value"],
    },
    refin: {
      title: "Entrada reflejada",
      summary:
        "Si es true, cada byte de entrada se introduce empezando por el LSB. Equivale a invertir el orden de bits del byte y empezar por el MSB.",
      aliases: ["reflexión de entrada", "LSB primero (si es true)", "reflected input"],
    },
    refout: {
      title: "Salida reflejada",
      summary: "Si es true, se invierte el orden de bits de todo el registro antes del XOR final.",
      aliases: ["reflexión de salida", "reflected output"],
    },
    xorout: {
      title: "Valor de XOR final",
      summary: "El valor con el que se hace XOR al CRC al final. Con 0 no cambia.",
      aliases: ["XOR de salida", "final XOR", "XorOut"],
    },
  },
  fields: {
    preset: {
      title: "Preajuste",
      summary:
        "Una configuración de CRC con nombre. Al elegirla se rellenan los 6 parámetros y la entrada 123456789 para comprobar el valor de comprobación.",
    },
    inputMode: {
      title: "Formato de entrada",
      summary:
        "Cómo se escribe la entrada: bits es una secuencia de 0 y 1, hex son bytes en hexadecimal y text es una cadena convertida a bytes UTF-8.",
    },
    input: {
      title: "Entrada",
      summary:
        "Los datos cuyo CRC se calcula. Se escriben según el formato de entrada y entran en el registro bit a bit desde el primero. En hex, cada línea es una trama, y se introduce el rango CRC de la trama seleccionada.",
    },
    range: {
      title: "Rango CRC",
      summary:
        "Los bytes sobre los que se calcula el CRC, por número de byte desde 0 al inicio de cada trama, ambos extremos incluidos. Sin final, llega al final de la trama (antes del campo CRC si lo hay). También se elige arrastrando sobre los bytes de una trama.",
    },
    crcField: {
      title: "Campo CRC",
      summary:
        "El CRC recibido, justo después del rango. Ocupa width redondeado a bytes enteros; BE pone primero el byte alto, LE el bajo. Se compara con el CRC calculado.",
    },
  },
  names: {
    toc: "Índice",
    sections: {
      parts: "Partes de un nombre",
      families: "Familias con el mismo poly",
      aliases: "Tabla de alias",
      paramMap: "Alias de los parámetros",
      paramTable: "Tabla de nombres de parámetros",
    },
    parts: {
      head: "comprobación de redundancia cíclica",
      width: "ancho",
      origin: "el estándar, producto u organización que lo usó primero",
      note: "Los nombres oficiales del catálogo reveng tienen esta forma; el ancho y la segunda parte juntos identifican una configuración.",
    },
    families: {
      note: "Aunque el ancho y el poly sean iguales, un init, refin/refout o xorout distinto da otro CRC. Se resaltan los valores que difieren del primer miembro.",
      caption: (width: number, poly: string) => `ancho ${width}, poly ${poly}`,
      name: "Nombre oficial",
    },
    aliases: {
      ambiguous: "Nombres cuyo significado depende de quién los use",
      oneOf: (names: string) => `uno de ${names}`,
      alias: "Alias",
      name: "Nombre oficial",
    },
    paramMap: {
      note: "Pasa el ratón sobre un nombre para ver dónde actúa y sus alias; selecciónalo para ir a su fila en la tabla de abajo.",
    },
    paramTable: { param: "Parámetro", title: "Nombre", meaning: "Significado", aliases: "Alias" },
  },
  narrow: {
    heading: "Filtrar",
    note: "Elige un parámetro para dividir por sus valores y luego una rama para reducir los candidatos. Cuando quede uno, ábrelo en el visualizador.",
    candidates: (n: number) => `${n} candidatos`,
    splitBy: "Dividir por:",
    open: "Abrir en el visualizador",
    fixed: "Valores fijados",
    none: "Ninguno todavía",
    status: (n: number) => `Filtrar: ${n} candidatos`,
  },
  generators: "Polinomios generadores",
  cyclic: {
    heading: "¿Por qué comprobación de redundancia «cíclica»?",
    wordRing: "Anillo de la palabra de código",
    wordNote:
      "Una palabra de código (el mensaje seguido de su CRC) dispuesta en sentido horario con x^0 arriba. Girarla una vez equivale a multiplicarla por x.",
    stateRing: "Anillo de estados",
    stateNote:
      "Los estados del registro cuando empieza en 1 y recibe continuamente el bit de entrada 0. El estado j es x^j mod g(x).",
    forward: "Multiplicar por x (girar una vez)",
    back: "Dividir por x (girar una vez hacia atrás)",
    rotated: (k: number) => `giros k = ${k}`,
    word: "Bits girados",
    remainder: "Resto módulo g(x)",
    crcBit: "borde verde = bits añadidos como CRC",
    explain: (n: number) =>
      `La longitud del anillo y el número de pasos hasta que el estado vuelve a x^0 son ambos n = ${n}. Como x^n mod g(x) es 1, sustituir x^n por x^0 en el bit que da la vuelta no cambia el resto. Por eso una palabra de código girada sigue siendo una palabra de código; los códigos con esta propiedad se llaman códigos cíclicos.`,
    shortened:
      "Los CRC reales suelen aplicarse a entradas más cortas que n. Eso es un código cíclico acortado: un código cíclico cuyos bits iniciales se toman como 0.",
  },
  redundancy: {
    heading: "¿Por qué comprobación de «redundancia»?",
    whatSection: "Qué es redundante",
    sent: "Palabra de código enviada",
    message: (k: number) => `mensaje ${k} bits`,
    crc: (w: number) => `CRC ${w} bits`,
    whatNote:
      "Los bits del CRC se calculan a partir del mensaje y no aportan información nueva. Gracias a estos bits de más, el receptor puede comprobar los datos dividiendo por g(x).",
    spaceSection: "Las palabras de código son una parte de todas las cadenas",
    allWords: (n: number) => `cadenas de ${n} bits`,
    codewords: "Palabras de código divisibles por g(x)",
    ratio: "Proporción de palabras de código",
    spaceNote: (w: number) =>
      `Una cadena dañada coincide por azar con alguna palabra de código con una probabilidad de aproximadamente 1/2^${w}. Cuanto mayor es width, más difícil es que un error pase inadvertido.`,
    gridLegend: "verde = palabra de código, borde amarillo = cadena recibida",
    stripTitle: (k: number, size: number) => `CRC que podrían seguir al mensaje recibido (${k} bits): ${size}`,
    stripLegend:
      "verde = el CRC que corresponde al mensaje (el único que forma una palabra de código), borde amarillo = el CRC recibido. El error se detecta cuando difieren",
    checkSection: "Dañar y comprobar",
    received: "Cadena recibida (selecciona un bit para invertirlo)",
    error: "Error e (enviada XOR recibida)",
    burst: "Longitud del error",
    remainder: "Resto módulo g(x)",
    remainderNote: "El resto de la cadena recibida es igual al resto de e módulo g(x).",
    verdict: {
      clean: "Sin error",
      detected: "Error detectado (el resto no es 0)",
      missed: "Error no detectado (la cadena dañada también es palabra de código, así que el resto es 0)",
    },
    reset: "Deshacer",
    missedExample: "Ejemplo no detectado",
    guarantee: (w: number) =>
      `Todo error de 1 bit y todo error de longitud ${w} o menos se detecta. Un error pasa inadvertido solo cuando e es divisible por g(x). El ejemplo no detectado pone e igual a g(x), de longitud ${w + 1}.`,
  },
  currentSettings: {
    heading: "Configuración actual",
    openVisualizer: "Cambiar la configuración en el visualizador",
  },
  equivalence: {
    heading: "Equivalencias",
    note: "Cómo se relacionan los parámetros entre sí. Los ejemplos se calculan con la configuración y la entrada actuales (las mismas que en el visualizador).",
    sameSection: "Sustituciones que dan el mismo CRC",
    left: "Configuración original",
    right: "Sustitución",
    why: "Por qué",
    example: "Ejemplo con la configuración actual",
    match: "coincide",
    prefix: "prefijo P",
    items: {
      refin: {
        title: "Entrada reflejada",
        left: "refin = true",
        right: "refin = false, invirtiendo antes el orden de bits de cada byte de entrada",
        why: "refin significa que cada byte entra empezando por el LSB. Si primero se invierte el orden dentro de cada byte y luego se introduce desde el MSB, los bits entran en el registro en el mismo orden.",
      },
      refout: {
        title: "Salida reflejada",
        left: "refout = true",
        right:
          "refout = false; después se hace XOR del CRC con xorout, se invierte su orden de bits y se vuelve a hacer XOR con xorout",
        why: "refout invierte el registro antes del XOR final. Quitar xorout, invertir y volver a aplicar xorout da el mismo resultado.",
      },
      rightShift: {
        title: "Implementación con desplazamiento a la derecha",
        left: "refin = refout = true",
        right:
          "Sin reflexiones; un registro que desplaza a la derecha, con poly e init invertidos, introduciendo cada byte desde el LSB y decidiendo por el bit más bajo",
        why: "Reflejar entrada y salida equivale a calcular con todo el registro en espejo. Un registro en espejo desplaza a la derecha, y su poly también queda en espejo.",
      },
      initPrefix: {
        title: "Valor inicial como prefijo",
        left: "init = I",
        right: "init = 0, añadiendo antes de la entrada un prefijo P de width bits (P(x)·x^width ≡ I (mod g(x)))",
        why: "Al introducir P en un registro que empieza en 0, queda el valor I. Con init = 0, añadir ceros delante de la entrada no cambia el CRC; un init distinto de 0 permite detectar ceros iniciales añadidos o perdidos.",
      },
      affine: {
        title: "Lo que aportan init y xorout",
        left: "init, xorout",
        right:
          "El CRC con init = xorout = 0, combinado por XOR con el CRC (configuración original) de una entrada de ceros de la misma longitud",
        why: "El CRC se construye solo con XOR, así que para entradas a y b de igual longitud, crc(a ⊕ b) = crc(a) ⊕ crc(b) ⊕ crc(0…0). El efecto de init y xorout es una constante que solo depende de la longitud.",
      },
    },
    reasons: {
      notBytes: "La entrada no es múltiplo de 8 bits, así que no se puede invertir byte a byte",
      notReflected: "No se aplica porque refin y refout no son ambos true",
      evenPoly: "El bit más bajo de poly es 0, así que no se puede dividir por x y no existe prefijo",
    },
    inferSection: "Lo que se deduce de lo que sabes",
    known: "Lo que sabes",
    follows: "Lo que se deduce",
    rows: [
      {
        known: "refin = refout = true",
        follows:
          "Una implementación con desplazamiento a la derecha lo calcula sin reflejar entrada ni salida. Su código escribe poly e init invertidos",
      },
      {
        known: "refin = refout = false",
        follows:
          "Una implementación con desplazamiento a la izquierda lo calcula sin reflejar entrada ni salida. Su código escribe poly e init tal cual",
      },
      {
        known: "refin ≠ refout",
        follows: "Desplace a la derecha o a la izquierda, hace falta invertir bits aparte en algún punto",
      },
      {
        known: "El código desplaza a la derecha (1 bit, decidiendo por el bit más bajo)",
        follows:
          "Si no refleja entrada ni salida aparte, refin = refout = true. Invertir los bits de la constante poly da el poly normal",
      },
      {
        known: "El código desplaza a la izquierda (1 bit, decidiendo por el bit más alto)",
        follows: "Si no refleja entrada ni salida aparte, refin = refout = false. La constante poly es el poly normal",
      },
      {
        known: "El bit más bajo de la constante poly del código es 0",
        follows:
          "Un poly normal siempre tiene el bit más bajo a 1 (el término constante del generador), así que la constante está invertida y el código desplaza a la derecha",
      },
    ],
    current: "Con la configuración actual",
    direction: {
      right: "Una implementación con desplazamiento a la derecha lo calcula sin reflejar entrada ni salida",
      left: "Una implementación con desplazamiento a la izquierda lo calcula sin reflejar entrada ni salida",
      mixed: "Desplace a la derecha o a la izquierda, hace falta invertir bits aparte",
    },
    codeConstants: (poly: string, init: string) => `El código de la implementación escribe poly = ${poly} e init = ${init}`,
    ambiguous:
      "La forma invertida de este poly también tiene el bit más bajo a 1, así que la constante sola no indica si es normal o invertida",
  },
  check: {
    heading: "¿Por qué «comprobación»?",
    note: "Cómo comprueba realmente el receptor los datos. Los valores se calculan con la configuración y la entrada actuales (las mismas que en el visualizador).",
    frameSection: "Cadena enviada",
    frameNote:
      "Se envía el mensaje seguido de su CRC. Los CRC con refin y refout true se añaden empezando por el byte bajo. Selecciona un bit para invertirlo (como si se dañara por el camino).",
    message: (n: number) => `mensaje (${n} bits)`,
    crc: (n: number) => `CRC (${n} bits, borde verde)`,
    values: "rojo = 1, blanco = 0",
    flipped: "borde amarillo = bit invertido",
    reset: "Deshacer",
    methodsSection: "Formas de comprobar",
    recheck: {
      title: "1. Recalcular y comparar",
      note: "Calcular el CRC del mensaje recibido y compararlo con el CRC recibido.",
      computed: "CRC del mensaje",
      received: "CRC recibido",
    },
    whole: {
      title: "2. Pasar la palabra de código entera",
      note: "Calcular el CRC de toda la cadena recibida con la misma configuración. Sin errores es una constante que solo depende de la configuración, no del mensaje (el residuo). Con xorout 0 y sin reflexión, el residuo es 0. Como se compara con una constante, el hardware puede comprobar sin distinguir mensaje y CRC.",
      value: "CRC de toda la cadena",
      residue: "Residuo",
      notApplicable:
        "refin y refout difieren, así que el CRC añadido no se alinea con el registro y el resultado no es constante",
    },
    ok: "Sin error",
    ng: "Con error",
    sameVerdict: "Cuando ambas se aplican, los dos resultados siempre coinciden.",
    checkSection: "Valor de comprobación",
    catalogue: "Valor de comprobación del catálogo (check)",
    computedCheck: "CRC calculado de 123456789",
    checkNote:
      "El valor de comprobación no sirve para encontrar errores, sino para verificar una implementación. Si tu implementación da este valor para la entrada 123456789, la configuración es correcta.",
    custom: "No es un preajuste, así que no hay valor de comprobación del catálogo.",
    limitsSection: "Lo que un CRC no puede comprobar",
    limits: [
      "Un CRC solo indica que hay un error; no lo corrige. Hace falta otro mecanismo, como pedir un reenvío.",
      "Si quien cambia el mensaje también recalcula el CRC, el cambio pasa inadvertido. Contra la manipulación deliberada se usa un hash o un MAC.",
    ],
  },
  table: {
    heading: "Método de tabla (byte a byte)",
    note: "Muchas bibliotecas construyen primero una tabla T de 256 valores y luego calculan byte a byte. Los valores se calculan con la configuración y la entrada actuales (las mismas que en el visualizador).",
    direction: {
      left: "Tabla con desplazamiento a la izquierda",
      right: "Tabla con desplazamiento a la derecha (refin y refout son true)",
    },
    reflectNote:
      "Si refin es true, se invierte el orden de bits de cada byte de entrada antes de usarlo; si refout es true, se invierte el resultado al final.",
    tableTitle: "Tabla T (256 valores)",
    tableNote:
      "Las filas son los 4 bits altos del índice y las columnas los 4 bits bajos. Selecciona un valor para ver cómo se obtiene.",
    entryTitle: (i: string, value: string) => `Cómo se obtiene T[${i}] = ${value}`,
    entryNote: {
      left: "Se introducen los 8 bits del índice, empezando por el MSB, en un registro a 0 durante 8 ciclos. Equivale a 8 ciclos del cálculo bit a bit.",
      right:
        "Se introducen los 8 bits del índice, empezando por el LSB, en un registro a 0 que desplaza a la derecha, durante 8 ciclos. Equivale a 8 ciclos del cálculo bit a bit.",
    },
    clock: "Ciclo",
    bit: "Bit de entrada",
    reg: "Registro",
    stepsTitle: "Cálculo byte a byte",
    formula: "Actualización",
    start: "Valor inicial",
    byte: "Byte",
    before: "crc antes",
    index: "Índice",
    entry: "T[índice]",
    after: "crc después",
    result: "Resultado con tabla",
    bitwise: "CRC calculado bit a bit",
    match: "coincide",
    notBytes: "La entrada no es múltiplo de 8 bits, así que no se puede calcular byte a byte.",
  },
  estimate: {
    heading: "Estimación (buscar parámetros a partir de pares de datos y CRC)",
    note: "Introduce varios pares de datos y su CRC y elige Buscar para encontrar parámetros que encajen, en el catálogo y por fuerza bruta.",
    format: "Formato de los datos",
    data: "Datos",
    crc: "CRC (hex)",
    width: "width",
    widthAuto: (n: number) => `Si está vacío, según los dígitos del CRC (ahora ${n})`,
    addRow: "Añadir un par",
    removeRow: "Quitar este par",
    search: "Buscar",
    catalogueTitle: "En el catálogo",
    noCatalogue: "Ningún preajuste encaja.",
    bruteTitle: "Fuerza bruta",
    tooWide: (max: number) => `La fuerza bruta solo se aplica cuando width es ${max} o menos.`,
    needPair: "La fuerza bruta necesita al menos dos pares de la misma longitud.",
    none: "No se encontraron parámetros que encajen.",
    initUnknown: "Sin pares de longitudes distintas, init y xorout no son únicos (valores para init = 0).",
    more: (n: number) => `${n} más`,
    name: "Nombre oficial",
    open: "Abrir en el visualizador",
    hintsTitle: "Cómo reunir pares",
    hints: [
      "Dos o más pares de la misma longitud acotan poly y la reflexión sin depender de init ni xorout.",
      "Añadir al menos un par de otra longitud determina también init y xorout.",
      "La fuerza bruta se limita a width 16 o menos. Los CRC más anchos se buscan en el catálogo.",
    ],
    status: (n: number) => `Estimación: ${n} candidatos`,
    errors: {
      notHex: "No se puede leer como bytes hexadecimales",
      crc: "Introduce un valor hexadecimal que quepa en width bits",
    },
  },
  listSeparator: ", ",
};
