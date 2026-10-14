import type { Messages } from "./ja";

/** フランス語の画面の文。 */
export const fr: Messages = {
  pages: { visualizer: "Visualisation", names: "Nomenclature", narrow: "Affiner", cyclic: "Cyclique", redundancy: "Redondance" },
  workbench: { sidebarToggle: "Afficher/masquer la barre latérale (Ctrl+B)", language: "Langue" },
  settings: {
    heading: "Paramètres",
    invalid: "Les paramètres contiennent des erreurs. Corrigez les champs en rouge.",
    invalidStatus: "Paramètres invalides",
  },
  errors: {
    widthRange: "Saisissez un entier de 1 à 32",
    notHex: "Saisissez un nombre hexadécimal",
    tooWide: (width: number) => `Saisissez une valeur qui tient sur ${width} bits`,
    zero: "0 n’est pas autorisé",
    notBits: "Utilisez uniquement 0 et 1",
    oddHex: "Saisissez deux chiffres par octet",
    tooLong: (max: number) => `L’entrée est limitée à ${max} bits`,
    refinBytes: "Avec refin, saisissez des octets entiers (multiples de 8 bits)",
  },
  controls: {
    first: "Début (Home)",
    prev: "Reculer d’une étape (←)",
    playPause: "Lecture / pause (Space)",
    play: "Lecture",
    pause: "Pause",
    next: "Avancer d’une étape (→)",
    last: "Fin (End)",
    loop: "Boucle (L)",
    speedMode: "Mode de vitesse",
    auto: "Automatique (lent au début)",
    steady: "Constant",
    rate: "Multiplicateur de vitesse",
  },
  visualizer: {
    hardware: "Matériel (LFSR)",
    legend: {
      xor: "⊕ = XOR (1 si les deux entrées diffèrent)",
      one: "rouge = valeur 1",
      zero: "blanc = valeur 0",
      busy: "jaune = calcul en cours",
      crc: "vert = CRC",
      param: "cyan = paramètre ciblé",
    },
    software: "Logiciel",
    log: "Déroulement",
    inputBits: (cursor: number, total: number) => `Bits d’entrée (${cursor}/${total})`,
  },
  steps: {
    init: "Initialisation",
    reflectIn: "Refléter l’octet d’entrée (refin)",
    feedback: "Calcul du bit de rétroaction",
    shift: "Décalage",
    xor: "XOR avec le polynôme",
    reflectOut: "Refléter la sortie (refout)",
    xorOut: "XOR final (xorout)",
    done: "Terminé",
  },
  log: {
    byteNo: (n: number) => `octet ${n}`,
    willXor: "feedback = 1, donc XOR avec poly ensuite",
    noXor: "feedback = 0, donc pas de XOR",
    inputBit: (n: number) => `bit d’entrée ${n}`,
    inputPlusCrc: "entrée + CRC",
    check: (hex: string, match: boolean) => `valeur de contrôle ${hex} : ${match ? "concordante" : "non concordante"}`,
  },
  code: {
    pseudo: "Pseudo-code",
    language: "Langage du code",
    refinOff: "non exécuté car refin vaut false",
    refoutOff: "non exécuté car refout vaut false",
    xoroutZero: "aucun changement car xorout vaut 0",
  },
  help: {
    idle: "Survolez un paramètre des réglages ou du code pour afficher son nom et sa description.",
    aliases: (list: string) => `Autres noms : ${list}`,
    reflectedPoly: (hex: string) => `Forme reflétée (la valeur écrite dans les implémentations à décalage à droite) : ${hex}`,
    shiftRight: "refin et refout valent tous deux true : une implémentation à décalage à droite (depuis le LSB) peut le calculer",
    shiftLeft: "refin et refout valent tous deux false : une implémentation à décalage à gauche (depuis le MSB) peut le calculer",
    shiftMixed:
      "refin et refout diffèrent : qu’elle décale à droite ou à gauche, l’implémentation doit inverser les bits séparément à un moment donné",
  },
  params: {
    width: {
      title: "Largeur",
      summary: "Le nombre de bits du CRC. Il est égal au nombre de registres et au degré du polynôme générateur.",
      aliases: ["taille du CRC", "degré du polynôme", "width"],
    },
    poly: {
      title: "Polynôme générateur",
      summary:
        "Les coefficients de x^(width-1) à x^0, sans le terme de tête x^width. Écrit ici sous forme normale (non reflétée).",
      aliases: ["polynôme", "forme normale", "polynomial"],
    },
    init: {
      title: "Valeur initiale",
      summary: "La valeur chargée dans le registre avant d’y faire entrer le premier bit.",
      aliases: ["valeur initiale du CRC", "initial value"],
    },
    refin: {
      title: "Entrée reflétée",
      summary:
        "Si true, chaque octet d’entrée entre en commençant par le LSB. Cela revient à inverser l’ordre des bits de l’octet puis à commencer par le MSB.",
      aliases: ["réflexion de l’entrée", "LSB d’abord (si true)", "reflected input"],
    },
    refout: {
      title: "Sortie reflétée",
      summary: "Si true, l’ordre des bits de tout le registre est inversé avant le XOR final.",
      aliases: ["réflexion de la sortie", "reflected output"],
    },
    xorout: {
      title: "Valeur du XOR final",
      summary: "La valeur combinée par XOR avec le CRC à la fin. Avec 0, rien ne change.",
      aliases: ["XOR de sortie", "final XOR", "XorOut"],
    },
  },
  fields: {
    preset: {
      title: "Préréglage",
      summary:
        "Une configuration de CRC nommée. La choisir remplit les 6 paramètres et l’entrée 123456789 qui sert à vérifier la valeur de contrôle.",
    },
    inputMode: {
      title: "Format d’entrée",
      summary:
        "La façon d’écrire l’entrée : bits est une suite de 0 et de 1, hex des octets en hexadécimal, text une chaîne convertie en octets UTF-8.",
    },
    input: {
      title: "Entrée",
      summary:
        "Les données dont on calcule le CRC. Écrites selon le format d’entrée, elles entrent dans le registre bit par bit à partir du premier.",
    },
  },
  names: {
    toc: "Sommaire",
    sections: {
      parts: "Anatomie d’un nom",
      families: "Familles partageant un poly",
      aliases: "Table des alias",
      paramMap: "Alias des paramètres",
      paramTable: "Table des noms de paramètres",
    },
    parts: {
      head: "contrôle de redondance cyclique",
      width: "largeur",
      origin: "la norme, le produit ou l’organisme qui l’a utilisé en premier",
      note: "Les noms officiels du catalogue reveng ont cette forme ; la largeur et la seconde partie désignent ensemble une configuration.",
    },
    families: {
      note: "Même avec la même largeur et le même poly, un init, refin/refout ou xorout différent donne un autre CRC. Les valeurs qui diffèrent du premier membre sont mises en évidence.",
      caption: (width: number, poly: string) => `largeur ${width}, poly ${poly}`,
      name: "Nom officiel",
    },
    aliases: {
      ambiguous: "Noms dont le sens dépend de qui les emploie",
      oneOf: (names: string) => `l’un de ${names}`,
      alias: "Alias",
      name: "Nom officiel",
    },
    paramMap: {
      note: "Survolez un nom pour voir où il agit et ses autres noms ; sélectionnez-le pour aller à sa ligne dans la table ci-dessous.",
    },
    paramTable: { param: "Paramètre", title: "Nom", meaning: "Signification", aliases: "Alias" },
  },
  narrow: {
    heading: "Affiner",
    note: "Choisissez un paramètre pour séparer selon ses valeurs, puis une branche pour réduire les candidats. Quand il n’en reste qu’un, ouvrez-le dans la visualisation.",
    candidates: (n: number) => `${n} candidats`,
    splitBy: "Séparer par :",
    open: "Ouvrir dans la visualisation",
    fixed: "Valeurs fixées",
    none: "Aucune pour l’instant",
    status: (n: number) => `Affiner : ${n} candidats`,
  },
  generators: "Polynômes générateurs",
  cyclic: {
    heading: "Pourquoi un contrôle de redondance « cyclique » ?",
    wordRing: "Anneau du mot de code",
    wordNote:
      "Un mot de code (le message suivi de son CRC) disposé dans le sens horaire, x^0 en haut. Le tourner une fois revient à le multiplier par x.",
    stateRing: "Anneau des états",
    stateNote:
      "Les états du registre quand il part de 1 et reçoit sans cesse le bit d’entrée 0. Le j-ième état est x^j mod g(x).",
    forward: "Multiplier par x (tourner une fois)",
    back: "Diviser par x (tourner une fois en arrière)",
    rotated: (k: number) => `rotations k = ${k}`,
    word: "Bits tournés",
    remainder: "Reste modulo g(x)",
    crcBit: "bord vert = bits ajoutés comme CRC",
    explain: (n: number) =>
      `La longueur de l’anneau et le nombre de pas avant que l’état revienne à x^0 valent tous deux n = ${n}. Comme x^n mod g(x) vaut 1, remplacer x^n par x^0 pour le bit qui fait le tour ne change pas le reste. Un mot de code tourné reste donc un mot de code ; les codes ayant cette propriété sont appelés codes cycliques.`,
    shortened:
      "Les CRC réels s’appliquent le plus souvent à des entrées plus courtes que n. C’est un code cyclique raccourci : un code cyclique dont les premiers bits sont pris égaux à 0.",
  },
  redundancy: {
    heading: "Pourquoi un contrôle de « redondance » ?",
    whatSection: "Ce qui est redondant",
    sent: "Mot de code envoyé",
    message: (k: number) => `message ${k} bits`,
    crc: (w: number) => `CRC ${w} bits`,
    whatNote:
      "Les bits du CRC sont calculés à partir du message et n’apportent aucune information nouvelle. Ce sont ces bits en plus qui permettent au récepteur de vérifier les données en divisant par g(x).",
    spaceSection: "Les mots de code ne sont qu’une partie de toutes les suites",
    allWords: (n: number) => `suites de ${n} bits`,
    codewords: "Mots de code divisibles par g(x)",
    ratio: "Proportion de mots de code",
    spaceNote: (w: number) =>
      `Une suite abîmée tombe par hasard sur un mot de code avec une probabilité d’environ 1/2^${w}. Plus width est grand, plus une erreur est difficile à manquer.`,
    gridLegend: "vert = mot de code, bord jaune = suite reçue",
    checkSection: "Abîmer et vérifier",
    received: "Suite reçue (sélectionnez un bit pour l’inverser)",
    error: "Erreur e (envoyée XOR reçue)",
    burst: "Longueur de l’erreur",
    remainder: "Reste modulo g(x)",
    remainderNote: "Le reste de la suite reçue est égal au reste de e modulo g(x).",
    verdict: {
      clean: "Aucune erreur",
      detected: "Erreur détectée (le reste n’est pas 0)",
      missed: "Erreur manquée (la suite abîmée est aussi un mot de code, donc le reste vaut 0)",
    },
    reset: "Annuler",
    missedExample: "Exemple manqué",
    guarantee: (w: number) =>
      `Toute erreur d’1 bit et toute erreur de longueur ${w} ou moins est détectée. Une erreur n’est manquée que si e est divisible par g(x). L’exemple manqué prend e égal à g(x), de longueur ${w + 1}.`,
  },
  listSeparator: ", ",
};
