import type { StepKind } from "../domain/trace";

/**
 * 日本語の画面の文。全ての言語の辞書はこれと同じ形（Messages）を持つ。
 * 関数の項目は、数や値を差し込んで文を作る。
 */
export const ja = {
  pages: {
    visualizer: "可視化",
    names: "名前の規則",
    narrow: "絞り込み",
    cyclic: "巡回",
    redundancy: "冗長",
    check: "検査",
    equivalence: "置き換え",
  },
  workbench: { sidebarToggle: "サイドバーの開閉（Ctrl+B）", language: "表示言語" },
  settings: {
    heading: "設定",
    invalid: "設定に誤りがあります。赤い項目を直してください。",
    invalidStatus: "設定に誤りがあります",
  },
  errors: {
    widthRange: "1〜32 の整数を入れてください",
    notHex: "16 進数で入れてください",
    tooWide: (width: number) => `${width} ビットに収まる値にしてください`,
    zero: "0 は指定できません",
    notBits: "0 と 1 だけで入れてください",
    oddHex: "2 桁ずつ（バイト単位）で入れてください",
    tooLong: (max: number) => `入力は ${max} ビットまでです`,
    refinBytes: "refin を使うときは 8 ビット単位で入れてください",
  },
  controls: {
    first: "先頭（Home）",
    prev: "1 ステップ戻る（←）",
    playPause: "再生 / 一時停止（Space）",
    play: "再生",
    pause: "一時停止",
    next: "1 ステップ進む（→）",
    last: "末尾（End）",
    loop: "ループ再生（L）",
    speedMode: "速度モード",
    auto: "自動（序盤は低速）",
    steady: "一定",
    rate: "速度倍率",
  },
  visualizer: {
    hardware: "ハードウェア（LFSR）",
    legend: {
      xor: "⊕ = XOR（2 入力が異なれば 1）",
      one: "赤 = 値 1",
      zero: "白 = 値 0",
      busy: "黄 = 計算中",
      crc: "緑 = CRC",
      param: "水色 = 注目中のパラメータ",
    },
    software: "ソフトウェア",
    log: "経過",
    inputBits: (cursor: number, total: number) => `入力ビット（${cursor}/${total}）`,
  },
  steps: {
    init: "初期化",
    reflectIn: "入力バイトを反転（refin）",
    feedback: "フィードバックビットの計算",
    shift: "シフト",
    xor: "多項式と XOR",
    reflectOut: "出力を反転（refout）",
    xorOut: "最終 XOR（xorout）",
    done: "完了",
  } satisfies Record<StepKind, string>,
  log: {
    byteNo: (n: number) => `${n} バイト目`,
    willXor: "feedback = 1 なので次に poly と XOR する",
    noXor: "feedback = 0 なので XOR しない",
    inputBit: (n: number) => `入力ビット ${n}`,
    inputPlusCrc: "入力 + CRC",
    check: (hex: string, match: boolean) => `検査値 ${hex} ${match ? "と一致" : "と不一致"}`,
  },
  code: {
    pseudo: "擬似コード",
    language: "コードの言語",
    refinOff: "refin が false なので実行しない",
    refoutOff: "refout が false なので実行しない",
    xoroutZero: "xorout が 0 なので値は変わらない",
  },
  help: {
    idle: "設定項目かコードのパラメータにマウスを乗せると、日本語名と説明を表示します。",
    aliases: (list: string) => `別名: ${list}`,
    reflectedPoly: (hex: string) => `反転表記（右送りの実装で書かれる値）: ${hex}`,
    shiftRight: "refin と refout がともに true なので、右送り（LSB から処理する）の実装で計算できる",
    shiftLeft: "refin と refout がともに false なので、左送り（MSB から処理する）の実装で計算できる",
    shiftMixed: "refin と refout が異なるので、右送りと左送りのどちらの実装でも、どこかでビットの反転が別に要る",
  },
  /** パラメータの説明。title は画面での名前、aliases は資料で使われる別の呼び名（英語の呼び名も載せる）。 */
  params: {
    width: {
      title: "幅",
      summary: "CRC のビット数。レジスタの個数と同じで、生成多項式の次数でもある。",
      aliases: ["CRC のビット数", "多項式の次数", "width"],
    },
    poly: {
      title: "生成多項式",
      summary: "最上位の x^width の項を除いた係数を、x^(width-1) から x^0 の順に並べた値。ここでは反転していない通常表記で書く。",
      aliases: ["多項式", "通常表記（normal）", "polynomial"],
    },
    init: {
      title: "初期値",
      summary: "最初の入力ビットを投入する前に、レジスタへ入れておく値。",
      aliases: ["初期 CRC 値", "initial value"],
    },
    refin: {
      title: "入力の反転",
      summary: "true なら、入力の各バイトを LSB から投入する。バイト内のビット順を反転してから MSB から投入するのと同じ。",
      aliases: ["入力の反射", "LSB ファースト（true のとき）", "reflected input"],
    },
    refout: {
      title: "出力の反転",
      summary: "true なら、最終 XOR の前にレジスタ全体のビット順を反転する。",
      aliases: ["出力の反射", "reflected output"],
    },
    xorout: {
      title: "最終 XOR 値",
      summary: "最後に CRC と XOR する値。0 なら値は変わらない。",
      aliases: ["出力 XOR", "final XOR", "XorOut"],
    },
  },
  /** パラメータ以外の設定項目の名前と説明。 */
  fields: {
    preset: {
      title: "プリセット",
      summary: "名前の付いた CRC の設定。選ぶと 6 つのパラメータと、検査値を確かめる入力 123456789 を入れる。",
    },
    inputMode: {
      title: "入力形式",
      summary: "入力の書き方。bits は 0 と 1 の並び、hex は 16 進のバイト列、text は文字列を UTF-8 のバイト列にしたもの。",
    },
    input: {
      title: "入力",
      summary: "CRC を計算するデータ。入力形式に従って書き、先頭のビットから順にレジスタへ投入する。",
    },
  },
  names: {
    toc: "目次",
    sections: {
      parts: "名前の分解",
      families: "同じ poly の一族",
      aliases: "別名の対応表",
      paramMap: "パラメータ名の別名",
      paramTable: "パラメータ名の対応表",
    },
    parts: {
      head: "巡回冗長検査",
      width: "幅",
      origin: "最初に使われた規格・製品・団体などの名前",
      note: "reveng カタログの正式名はこの形で、幅と後半の名前の組で 1 つの設定を指します。",
    },
    families: {
      note: "幅と poly が同じでも、init・refin/refout・xorout の違いで別の CRC になります。一族の先頭と違う値を強調します。",
      caption: (width: number, poly: string) => `幅 ${width}・poly ${poly}`,
      name: "正式名",
    },
    aliases: {
      ambiguous: "流儀によって指すものが割れる呼び名",
      oneOf: (names: string) => `${names} のどれか`,
      alias: "別名",
      name: "正式名",
    },
    paramMap: { note: "名前にマウスを乗せると効く場所と別名を示し、選ぶと下の表のその行へ移ります。" },
    paramTable: { param: "パラメータ名", title: "日本語名", meaning: "意味", aliases: "別名" },
  },
  narrow: {
    heading: "絞り込み",
    note: "パラメータを 1 つ選んで値ごとに分け、枝を選んで候補を減らす。1 つに決まったら可視化で開ける。",
    candidates: (n: number) => `候補 ${n}`,
    splitBy: "分ける:",
    open: "可視化で開く",
    fixed: "固定した値",
    none: "まだ無い",
    status: (n: number) => `絞り込み: 候補 ${n}`,
  },
  /** 生成多項式の一覧の見出し。 */
  generators: "生成多項式",
  cyclic: {
    heading: "なぜ「巡回」冗長検査か",
    wordRing: "符号語の輪",
    wordNote: "本文の後ろに CRC を付けた符号語を、x^0 を真上に時計回りに並べた。1 回回すと x を掛けたことになる。",
    stateRing: "状態の輪",
    stateNote: "レジスタに 1 を入れ、入力ビット 0 を送り続けたときの状態。j 回目は x^j を g(x) で割った余り。",
    forward: "x を掛ける（1 回回す）",
    back: "x で割る（1 回戻す）",
    rotated: (k: number) => `回した数 k = ${k}`,
    word: "回したビット列",
    remainder: "g(x) で割った余り",
    crcBit: "緑の縁 = CRC として付けたビット",
    explain: (n: number) =>
      `輪の長さも、状態が x^0 に戻るまでの回数も n = ${n}。x^n を g(x) で割った余りは 1 なので、回り込んだビットの x^n を x^0 に置き換えても余りは変わらない。だから符号語を回しても符号語のままで、この性質を持つ符号を巡回符号と呼ぶ。`,
    shortened: "実際の CRC はふつう n より短い入力に使う。巡回符号の先頭を 0 と見なして短くしたもの（短縮巡回符号）にあたる。",
  },
  redundancy: {
    heading: "なぜ「冗長」検査か",
    whatSection: "何が冗長か",
    sent: "送った符号語",
    message: (k: number) => `本文 ${k} ビット`,
    crc: (w: number) => `CRC ${w} ビット`,
    whatNote:
      "CRC のビットは本文から計算で決まり、新しい情報は何も持たない。この余分なビットのおかげで、受け取った側が g(x) で割って確かめられる。",
    spaceSection: "符号語は並び全体の一部",
    allWords: (n: number) => `${n} ビットの並び`,
    codewords: "g(x) で割り切れる符号語",
    ratio: "符号語の割合",
    spaceNote: (w: number) => `壊れた並びが偶然どれかの符号語になる割合はおよそ 1/2^${w}。width を増やすほど見逃しにくくなる。`,
    gridLegend: "緑 = 符号語、黄の枠 = 受け取った並び",
    checkSection: "壊して確かめる",
    received: "受け取った並び（ビットを選ぶと反転）",
    error: "誤り e（送った並び XOR 受け取った並び）",
    burst: "誤りの長さ",
    remainder: "g(x) で割った余り",
    remainderNote: "受け取った並びの余りは、e を g(x) で割った余りに等しい。",
    verdict: {
      clean: "誤りなし",
      detected: "誤りを見つけた（余りが 0 でない）",
      missed: "見逃した（壊れた並びも符号語なので余りが 0）",
    },
    reset: "元に戻す",
    missedExample: "見逃す例",
    guarantee: (w: number) =>
      `1 ビットの誤りと、長さ ${w} 以下の誤りは必ず見つかる。見逃すのは e が g(x) で割り切れるときだけ。「見逃す例」は e を g(x) そのものにしたもので、長さは ${w + 1}。`,
  },
  /** 他のページで今の設定を示すサイドバー。 */
  currentSettings: {
    heading: "今の設定",
    openVisualizer: "可視化のページで設定を変える",
  },
  equivalence: {
    heading: "置き換え",
    note: "パラメータどうしの関係。計算例は、今の設定と入力（可視化のページと同じもの）で求めた値。",
    sameSection: "同じ CRC になる置き換え",
    left: "元の設定",
    right: "置き換え",
    why: "理由",
    example: "今の設定での計算例",
    match: "一致",
    prefix: "前置き P",
    items: {
      refin: {
        title: "入力の反転",
        left: "refin = true",
        right: "refin = false にして、入力の各バイトのビットの並びを反転しておく",
        why: "refin は各バイトを LSB から入れること。先にバイトの中の並びを逆にしてから MSB から入れても、レジスタに入る順は同じになる。",
      },
      refout: {
        title: "出力の反転",
        left: "refout = true",
        right: "refout = false にして、出た CRC に xorout を XOR し直してからビットの並びを反転し、もう一度 xorout を XOR する",
        why: "refout は最終 XOR の前にレジスタを反転すること。xorout を一度外してから反転し、付け直せば同じになる。",
      },
      rightShift: {
        title: "右送りの実装",
        left: "refin = refout = true",
        right:
          "反転をせず、右へシフトするレジスタで計算する。poly と init はビットの並びを反転した値を使い、各バイトを LSB から入れて最下位ビットで分ける",
        why: "入力も出力も反転するなら、レジスタ全体を左右逆に置いて計算したのと同じ。左右逆のレジスタは右へシフトし、poly も左右逆の値になる。",
      },
      initPrefix: {
        title: "初期値と前置き",
        left: "init = I",
        right: "init = 0 にして、入力の前に width ビットの前置き P を足す（P(x)·x^width ≡ I (mod g(x))）",
        why: "init = 0 のレジスタに P を入れ終えると、レジスタの値は I になる。init = 0 だと入力の前に 0 をいくつ足しても CRC が変わらないので、0 でない init で先頭の 0 の増減も見つけられるようにしている。",
      },
      affine: {
        title: "初期値と最終 XOR の分",
        left: "init・xorout",
        right: "init = xorout = 0 で計算した CRC に、同じ長さの全て 0 の入力の CRC（元の設定）を XOR する",
        why: "CRC の計算は XOR だけでできているので、長さの同じ入力 a、b について crc(a ⊕ b) = crc(a) ⊕ crc(b) ⊕ crc(0…0) が成り立つ。init と xorout の効き目は、入力の長さだけで決まる定数になる。",
      },
    },
    reasons: {
      notBytes: "入力が 8 ビットの倍数でないので、バイトごとに反転できない",
      notReflected: "refin と refout が両方 true ではないので当てはまらない",
      evenPoly: "poly の最下位ビットが 0 なので x で割れず、前置きが求まらない",
    },
    inferSection: "分かっていることから分かること",
    known: "分かっていること",
    follows: "分かること",
    rows: [
      {
        known: "refin = refout = true",
        follows:
          "右送りの実装で、入出力を反転せずに計算できる。その実装のコードには、poly と init はビットの並びを反転した値で書かれる",
      },
      {
        known: "refin = refout = false",
        follows: "左送りの実装で、入出力を反転せずに計算できる。コードには poly と init がそのまま書かれる",
      },
      { known: "refin ≠ refout", follows: "右送りでも左送りでも、どこかで別にビットの並びを反転する処理が要る" },
      {
        known: "実装のコードが右送り（1 ビット右へシフトし、最下位ビットで分かれる）",
        follows:
          "入出力の反転を別に書いていなければ refin = refout = true。コードの poly の定数をビット反転すると通常表記の poly になる",
      },
      {
        known: "実装のコードが左送り（1 ビット左へシフトし、最上位ビットで分かれる）",
        follows: "入出力の反転を別に書いていなければ refin = refout = false。コードの poly の定数はそのまま通常表記",
      },
      {
        known: "コードの poly の定数の最下位ビットが 0",
        follows: "通常表記の poly は最下位ビットが 1（生成多項式の定数項）なので、この定数は反転した値で、実装は右送り",
      },
    ],
    current: "今の設定では",
    direction: {
      right: "右送りの実装で、入出力を反転せずに計算できる",
      left: "左送りの実装で、入出力を反転せずに計算できる",
      mixed: "右送りでも左送りでも、別にビットの並びを反転する処理が要る",
    },
    codeConstants: (poly: string, init: string) => `実装のコードには poly = ${poly}、init = ${init} と書かれる`,
    ambiguous: "この poly はビットを反転した値も最下位ビットが 1 なので、定数だけでは通常表記か反転した値か決まらない",
  },
  check: {
    heading: "なぜ「検査」か",
    note: "受け取った側が実際にどう確かめるか。値は今の設定と入力（可視化のページと同じもの）で求めたもの。",
    frameSection: "送る並び",
    frameNote:
      "本文の後ろにその CRC を付けて送る。refin と refout が true の CRC は下位のバイトから付ける。ビットを選ぶと反転する（届くまでに壊れたことにする）。",
    message: "本文",
    crc: "CRC",
    reset: "元に戻す",
    methodsSection: "確かめ方",
    recheck: {
      title: "1. 計算し直して比べる",
      note: "受け取った本文の CRC を計算し、受け取った CRC と比べる。",
      computed: "本文の CRC",
      received: "受け取った CRC",
    },
    whole: {
      title: "2. 符号語ごと通す",
      note: "受け取った並び全体を同じ設定で計算する。誤りが無ければ、本文によらず設定だけで決まる一定の値（残余）になる。xorout が 0 で反転が無ければ残余は 0。比べる相手が定数なので、回路では本文と CRC を区別せずに確かめられる。",
      value: "並び全体の CRC",
      residue: "残余",
      notApplicable: "refin と refout が違うので、付けた CRC がレジスタの並びと揃わず、一定の値にならない",
    },
    ok: "誤りなし",
    ng: "誤りあり",
    sameVerdict: "当てはまる限り、2 つの判定は常に同じになる。",
    checkSection: "検査値",
    catalogue: "カタログの検査値（check）",
    computedCheck: "123456789 で計算した CRC",
    checkNote:
      "検査値は誤りを見つけるためのものではなく、実装が正しいかを確かめる目安。入力 123456789 を自分の実装で計算してこの値になれば、設定が合っている。",
    custom: "プリセットではないので、カタログの検査値は無い。",
    limitsSection: "検査できないこと",
    limits: [
      "CRC は誤りがあることを知らせるだけで、直さない。誤りが分かったら、送り直してもらうなどの別の仕組みが要る。",
      "本文を書き換えた側が CRC も付け直せば見抜けない。意図的な改ざんへの備えには、ハッシュや MAC を使う。",
    ],
  },
  /** 一覧の区切り。 */
  listSeparator: "、",
};

export type Messages = typeof ja;
