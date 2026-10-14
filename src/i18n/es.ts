import type { Messages } from "./ja";

/** スペイン語の画面の文。 */
export const es: Messages = {
  pages: { visualizer: "Visualizador", names: "Nomenclatura", narrow: "Filtrar" },
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
    refinOff: "no se ejecuta porque refin es false",
    refoutOff: "no se ejecuta porque refout es false",
    xoroutZero: "sin cambios porque xorout es 0",
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
        "Los datos cuyo CRC se calcula. Se escriben según el formato de entrada y entran en el registro bit a bit desde el primero.",
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
  listSeparator: ", ",
};
