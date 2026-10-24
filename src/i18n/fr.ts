import type { Messages } from "./ja";

/** French UI text. */
export const fr: Messages = {
  pages: {
    visualizer: "Visualisation",
    names: "Nomenclature",
    narrow: "Affiner",
    cyclic: "Cyclique",
    redundancy: "Redondance",
    check: "Contrôle",
    equivalence: "Équivalences",
    table: "Table",
    estimate: "Estimation",
  },
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
    tooManyFrames: (max: number) => `Au plus ${max} trames (lignes)`,
    frameTooLong: (max: number) => `Une trame est limitée à ${max} octets`,
    refinBytes: "Avec refin, saisissez des octets entiers (multiples de 8 bits)",
    notIndex: "Saisissez le numéro d’octet comme un entier de 0 ou plus",
    outsideFrame: "La plage ou le champ CRC ne tient pas dans la trame choisie",
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
  frames: {
    toEnd: "fin",
    noField: "aucun",
    pick: (i: number) => `Visualiser la trame ${i}`,
    match: "Correspond au champ CRC",
    mismatch: "Ne correspond pas au champ CRC",
    unfit: "La plage ne tient pas",
  },
  debug: {
    variables: "Variables",
    breakpoints: "Points d’arrêt",
    bitsRead: "bits d’entrée lus",
    xorCount: "XOR effectués",
    empty:
      "Appuyez à gauche d’un numéro de ligne du code, sur un bit du flux d’entrée ou sur la ligne sous l’un de ses octets, pour en ajouter un.",
    removeAll: "Tout supprimer",
    remove: "Supprimer",
    enabled: "Activé",
    hitCount: "Nombre de passages (vide pour chaque fois)",
    hits: (n: number) => `${n}×`,
    byte: (k: number, hex: string) => `octet ${k} (${hex})`,
    toggleLine: "Placer ou retirer un point d’arrêt sur cette ligne",
    toggleByte: (k: number) => `Placer ou retirer un point d’arrêt sur l’octet ${k}`,
    bit: (n: number, b: string) => `bit ${n} (${b})`,
    toggleBit: (n: number) => `Placer ou retirer un point d’arrêt sur le bit ${n}`,
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
        "Les données dont on calcule le CRC. Écrites selon le format d’entrée, elles entrent dans le registre bit par bit à partir du premier. En hex, chaque ligne est une trame, et la plage CRC de la trame choisie est injectée.",
    },
    range: {
      title: "Plage CRC",
      summary:
        "Les octets sur lesquels le CRC est calculé, par numéro d’octet depuis 0 au début de chaque trame, bornes incluses. Sans fin, elle va jusqu’à la fin de la trame (avant le champ CRC s’il y en a un). On peut aussi la choisir en glissant sur les octets d’une trame.",
    },
    crcField: {
      title: "Champ CRC",
      summary:
        "Le CRC reçu, juste après la plage. Il occupe width arrondi à l’octet ; BE place l’octet de poids fort en premier, LE celui de poids faible. Il est comparé au CRC calculé.",
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
    stripTitle: (k: number, size: number) => `CRC pouvant suivre le message reçu (${k} bits) : ${size}`,
    stripLegend:
      "vert = le CRC qui correspond au message (le seul qui forme un mot de code), bord jaune = le CRC reçu. L’erreur est détectée quand ils diffèrent",
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
  currentSettings: {
    heading: "Réglages actuels",
    openVisualizer: "Modifier les réglages sur la page de visualisation",
  },
  equivalence: {
    heading: "Équivalences",
    note: "Comment les paramètres sont liés entre eux. Les exemples sont calculés avec les réglages et l’entrée actuels (ceux de « Réglages actuels » dans la barre latérale).",
    sameSection: "Substitutions qui donnent le même CRC",
    left: "Réglage d’origine",
    right: "Substitution",
    why: "Pourquoi",
    example: "Exemple avec les réglages actuels",
    match: "identique",
    prefix: "préfixe P",
    items: {
      refin: {
        title: "Entrée reflétée",
        left: "refin = true",
        right: "refin = false, en inversant d’abord l’ordre des bits de chaque octet d’entrée",
        why: "refin signifie que chaque octet entre en commençant par le LSB. Inverser d’abord l’ordre dans chaque octet puis commencer par le MSB fait entrer les bits dans le registre dans le même ordre.",
      },
      refout: {
        title: "Sortie reflétée",
        left: "refout = true",
        right:
          "refout = false ; puis refaire un XOR du CRC avec xorout, inverser l’ordre de ses bits et refaire un XOR avec xorout",
        why: "refout inverse le registre avant le XOR final. Retirer xorout, inverser puis réappliquer xorout donne le même résultat.",
      },
      rightShift: {
        title: "Implémentation à décalage à droite",
        left: "refin = refout = true",
        right:
          "Sans réflexion ; un registre qui décale à droite, avec poly et init inversés, chaque octet entrant par le LSB et le choix se faisant sur le bit de poids faible",
        why: "Refléter l’entrée et la sortie revient à calculer avec tout le registre en miroir. Un registre en miroir décale à droite, et son poly est lui aussi en miroir.",
      },
      initPrefix: {
        title: "Valeur initiale comme préfixe",
        left: "init = I",
        right: "init = 0, en ajoutant avant l’entrée un préfixe P de width bits (P(x)·x^width ≡ I (mod g(x)))",
        why: "Faire entrer P dans un registre parti de 0 laisse la valeur I. Avec init = 0, ajouter des 0 devant l’entrée ne change pas le CRC ; un init non nul permet de détecter des 0 initiaux ajoutés ou perdus.",
      },
      affine: {
        title: "Ce qu’apportent init et xorout",
        left: "init, xorout",
        right:
          "Le CRC avec init = xorout = 0, combiné par XOR avec le CRC (réglage d’origine) d’une entrée de 0 de même longueur",
        why: "Le CRC n’est fait que de XOR ; pour des entrées a et b de même longueur, crc(a ⊕ b) = crc(a) ⊕ crc(b) ⊕ crc(0…0). L’effet d’init et de xorout est une constante qui ne dépend que de la longueur.",
      },
    },
    reasons: {
      notBytes: "L’entrée n’est pas un multiple de 8 bits, on ne peut pas l’inverser octet par octet",
      notReflected: "Ne s’applique pas car refin et refout ne valent pas tous deux true",
      evenPoly: "Le bit de poids faible de poly vaut 0, on ne peut pas diviser par x et il n’existe pas de préfixe",
    },
    inferSection: "Ce que l’on déduit de ce que l’on sait",
    known: "Ce que l’on sait",
    follows: "Ce que l’on en déduit",
    rows: [
      {
        known: "refin = refout = true",
        follows:
          "Une implémentation à décalage à droite le calcule sans refléter l’entrée ni la sortie. Son code écrit poly et init inversés",
      },
      {
        known: "refin = refout = false",
        follows:
          "Une implémentation à décalage à gauche le calcule sans refléter l’entrée ni la sortie. Son code écrit poly et init tels quels",
      },
      {
        known: "refin ≠ refout",
        follows: "Qu’elle décale à droite ou à gauche, l’implémentation doit inverser les bits séparément quelque part",
      },
      {
        known: "Le code décale à droite (1 bit, choix sur le bit de poids faible)",
        follows:
          "S’il ne reflète pas l’entrée ou la sortie à part, refin = refout = true. Inverser les bits de la constante poly donne le poly normal",
      },
      {
        known: "Le code décale à gauche (1 bit, choix sur le bit de poids fort)",
        follows: "S’il ne reflète pas l’entrée ou la sortie à part, refin = refout = false. La constante poly est le poly normal",
      },
      {
        known: "Le bit de poids faible de la constante poly du code vaut 0",
        follows:
          "Un poly normal a toujours son bit de poids faible à 1 (le terme constant du générateur) ; cette constante est donc inversée et le code décale à droite",
      },
    ],
    current: "Avec les réglages actuels",
    direction: {
      right: "Une implémentation à décalage à droite le calcule sans refléter l’entrée ni la sortie",
      left: "Une implémentation à décalage à gauche le calcule sans refléter l’entrée ni la sortie",
      mixed: "Qu’elle décale à droite ou à gauche, l’implémentation doit inverser les bits séparément",
    },
    codeConstants: (poly: string, init: string) => `Le code de l’implémentation écrit poly = ${poly} et init = ${init}`,
    ambiguous:
      "La forme inversée de ce poly a aussi son bit de poids faible à 1 ; la constante seule ne dit pas si elle est normale ou inversée",
  },
  check: {
    heading: "Pourquoi un « contrôle » ?",
    note: "Comment le récepteur vérifie réellement les données. Les valeurs sont calculées avec les réglages et l’entrée actuels (ceux de « Réglages actuels » dans la barre latérale).",
    frameSection: "Suite envoyée",
    frameNote:
      "Le message est envoyé suivi de son CRC. Les CRC avec refin et refout à true sont ajoutés octet de poids faible en premier. Sélectionnez un bit pour l’inverser (comme s’il avait été abîmé en route).",
    message: (n: number) => `message (${n} bits)`,
    crc: (n: number) => `CRC (${n} bits, bord vert)`,
    values: "rouge = 1, blanc = 0",
    flipped: "bord jaune = bit inversé",
    reset: "Annuler",
    methodsSection: "Façons de vérifier",
    recheck: {
      title: "1. Recalculer et comparer",
      note: "Calculer le CRC du message reçu et le comparer au CRC reçu.",
      computed: "CRC du message",
      received: "CRC reçu",
    },
    whole: {
      title: "2. Faire passer le mot de code entier",
      note: "Calculer le CRC de toute la suite reçue avec les mêmes réglages. Sans erreur, c’est une constante qui ne dépend que des réglages, pas du message (le résidu). Avec xorout à 0 et sans réflexion, le résidu vaut 0. Comme on compare à une constante, un circuit peut vérifier sans distinguer message et CRC.",
      value: "CRC de toute la suite",
      residue: "Résidu",
      notApplicable:
        "refin et refout diffèrent ; le CRC ajouté ne s’aligne pas sur le registre et le résultat n’est pas constant",
    },
    ok: "Aucune erreur",
    ng: "Erreur",
    sameVerdict: "Quand les deux s’appliquent, les deux verdicts concordent toujours.",
    checkSection: "Valeur de contrôle",
    catalogue: "Valeur de contrôle du catalogue (check)",
    computedCheck: "CRC calculé sur 123456789",
    checkNote:
      "La valeur de contrôle ne sert pas à trouver des erreurs, mais à vérifier une implémentation. Si votre implémentation donne cette valeur pour l’entrée 123456789, les réglages sont bons.",
    custom: "Ce n’est pas un préréglage ; il n’y a pas de valeur de contrôle du catalogue.",
    limitsSection: "Ce qu’un CRC ne peut pas contrôler",
    limits: [
      "Un CRC signale seulement qu’il y a une erreur ; il ne la corrige pas. Il faut un autre mécanisme, comme demander un renvoi.",
      "Si celui qui modifie le message recalcule aussi le CRC, la modification passe inaperçue. Contre une altération volontaire, on utilise un hachage ou un MAC.",
    ],
  },
  table: {
    heading: "Méthode par table (octet par octet)",
    note: "Beaucoup de bibliothèques construisent d’abord une table T de 256 valeurs, puis calculent octet par octet. Les valeurs sont calculées avec les réglages et l’entrée actuels (ceux de « Réglages actuels » dans la barre latérale).",
    direction: { left: "Table à décalage à gauche", right: "Table à décalage à droite (refin et refout valent true)" },
    reflectNote:
      "Si refin vaut true, l’ordre des bits de chaque octet d’entrée est inversé avant usage ; si refout vaut true, le résultat est inversé à la fin.",
    tableTitle: "Table T (256 valeurs)",
    tableNote:
      "Les lignes sont les 4 bits de poids fort de l’indice, les colonnes les 4 bits de poids faible. Sélectionnez une valeur pour voir comment elle est obtenue.",
    entryTitle: (i: string, value: string) => `Comment T[${i}] = ${value} est obtenu`,
    entryNote: {
      left: "On fait entrer les 8 bits de l’indice, MSB d’abord, dans un registre à 0 pendant 8 cycles. Cela correspond à 8 cycles du calcul bit par bit.",
      right:
        "On fait entrer les 8 bits de l’indice, LSB d’abord, dans un registre à 0 qui décale à droite, pendant 8 cycles. Cela correspond à 8 cycles du calcul bit par bit.",
    },
    clock: "Cycle",
    bit: "Bit d’entrée",
    reg: "Registre",
    stepsTitle: "Calcul octet par octet",
    formula: "Mise à jour",
    start: "Valeur initiale",
    byte: "Octet",
    before: "crc avant",
    index: "Indice",
    entry: "T[indice]",
    after: "crc après",
    result: "Résultat avec la table",
    bitwise: "CRC calculé bit par bit",
    match: "identique",
    notBytes: "L’entrée n’est pas un multiple de 8 bits ; on ne peut pas calculer octet par octet.",
  },
  estimate: {
    heading: "Estimation (trouver les paramètres à partir de paires données–CRC)",
    note: "Saisissez plusieurs paires de données et leur CRC, puis choisissez Rechercher pour trouver les paramètres qui conviennent, dans le catalogue et par force brute.",
    format: "Format des données",
    data: "Données",
    crc: "CRC (hex)",
    width: "width",
    widthAuto: (n: number) => `Si vide, d’après les chiffres du CRC (actuellement ${n})`,
    addRow: "Ajouter une paire",
    removeRow: "Retirer cette paire",
    search: "Rechercher",
    catalogueTitle: "Dans le catalogue",
    noCatalogue: "Aucun préréglage ne convient.",
    bruteTitle: "Force brute",
    tooWide: (max: number) => `La force brute ne s’applique que si width vaut ${max} ou moins.`,
    needPair: "La force brute nécessite au moins deux paires de même longueur.",
    none: "Aucun paramètre ne convient.",
    initUnknown: "Sans paires de longueurs différentes, init et xorout ne sont pas uniques (valeurs pour init = 0).",
    more: (n: number) => `${n} de plus`,
    name: "Nom officiel",
    open: "Ouvrir dans la visualisation",
    hintsTitle: "Réunir des paires",
    hints: [
      "Deux paires ou plus de même longueur restreignent poly et la réflexion, indépendamment d’init et de xorout.",
      "Ajouter au moins une paire d’une autre longueur détermine aussi init et xorout.",
      "La force brute est limitée à width 16 ou moins. Les CRC plus larges sont recherchés dans le catalogue.",
    ],
    status: (n: number) => `Estimation : ${n} candidats`,
    errors: { notHex: "Illisible comme octets hexadécimaux", crc: "Saisissez une valeur hexadécimale qui tient sur width bits" },
  },
  listSeparator: ", ",
};
