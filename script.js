/* =========================================================
   YAMA TYPE — アプリのロジック
   質問やタイプの文章は data.js、キャラクターは characters.js にあります。
   読み込み順は data.js → characters.js → script.js です。
   ========================================================= */

/* =========================================================
   ここから下はアプリ本体のロジック
   ========================================================= */

/* ---------- 出題順のシャッフル ----------
   同じ軸の質問が隣り合わないように並べ替える */
function shuffleQuestions(list) {
  if (!SHUFFLE) return list.slice();
  const spreadOut = (arr) => arr.every((q, i) => i === 0 || q.axis !== arr[i - 1].axis);

  for (let attempt = 0; attempt < 200; attempt++) {
    const a = list.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    if (spreadOut(a)) return a;
  }
  return list.slice(); // 条件を満たす並びが見つからなかった場合
}

/* ---------- 出題リストの組み立て ----------
   軸を持つ12問をシャッフルし、そこへ軸なしのシークレット専用2問を混ぜる。
   専用2問は判定に使わないので、同じ軸が隣り合わない制約の対象外 */
function buildQuiz() {
  const list = shuffleQuestions(QUESTIONS);
  if (typeof SECRETS === "undefined" || !SECRETS.length) return list;

  // シークレット専用の問題は、毎回どちらか1問だけを混ぜる
  const pick = SECRETS[Math.floor(Math.random() * SECRETS.length)].question;
  const slot = 1 + Math.floor(Math.random() * (list.length - 1));

  const out = list.slice();
  out.splice(slot, 0, pick);
  return out;
}

let QUIZ = buildQuiz();
const answers = new Array(QUESTIONS.length).fill(null); // 0〜5（0=A強, 5=B強）
let currentPage = 0;
const totalPages = 2;   // 1ページ目6問、2ページ目は残り全部

const $ = (sel) => document.querySelector(sel);
const screens = {
  start: $("#screen-start"),
  quiz: $("#screen-quiz"),
  result: $("#screen-result"),
};

function showScreen(name) {
  Object.values(screens).forEach((s) => s.classList.remove("is-active"));
  screens[name].classList.add("is-active");
  window.scrollTo({ top: 0 });
  // スクロールに連動して出るヘッダーは、画面が切り替わったら必ず一度隠す
  // （スクロールイベントを待たずに確実に隠すための保険）
  document.getElementById("scroll-header")?.classList.remove("show");
  // 画面ごとに高さが変わるので、余白のキャラクターも位置を計算し直す
  requestAnimationFrame(() => { if (typeof renderScatterChars === "function") renderScatterChars(); });
}


/* ---------- スタート画面のキャラクター配置 ----------
   山のイラストの上に孤峰・稜線（高山）、ページ下部に静林・陽だまり（森）。
   生息エリアごとに帯を作り、それぞれの淡色を敷く */
/* 問題数は QUIZ から取るので、問題を増減しても表示が自動で追従する */
(() => {
  ["progress-total", "lead-count", "note-count"].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.textContent = QUIZ.length;
  });
})();

/* =========================================================
   スタート画面：16タイプが山に集合したビジュアル
   山の両斜面に沿って配置し、麓（手前）ほど大きく・外側へ張り出す。
   山頂の2体はすでに登頂して喜んでいる構図にしている。
   ========================================================= */
/* =========================================================
   スタート画面：12タイプが山の面に散らばったビジュアル
   輪郭の2本線ではなく、山の▲の面を4段に分けて幅いっぱいへ配置する。
   いちばん上の段だけ1体で、他の段とまったく同じ仕組みで置く
   （以前は山頂の2体だけ特別扱いにしていたが、不自然だったのでやめた）。
   表示のたびにシャッフルするので、毎回ちがう12体・少しちがう並びになる。
   ========================================================= */
function renderCluster() {
  const box = document.getElementById("cluster-wrap");
  if (!box || typeof characterSVG !== "function") return;

  // 山の輪郭を横幅ぎりぎりまで広げ、キャラクターも一回り大きく育つようにしてある
  const VB_W = 480, VB_H = 320;
  const APEX = { x: 240, y: 30 };
  const BASE_L = { x: 16, y: 290 };
  const BASE_R = { x: 464, y: 290 };

  const leftX = (t) => APEX.x + t * (BASE_L.x - APEX.x);
  const rightX = (t) => APEX.x + t * (BASE_R.x - APEX.x);
  const rowY = (t) => APEX.y + t * (BASE_L.y - APEX.y);

  // 段ごとの高さ(t)と、その段に置く数。サイズは麓に近いほど大きく育つ
  const ROWS = [[0.20, 1], [0.40, 3], [0.62, 4], [0.86, 4]];
  const sizeAt = (t) => 42 + 38 * t;

  const shuffled = Object.keys(TYPES);
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  const codes = shuffled.slice(0, 12);

  const items = [];
  let idx = 0;
  ROWS.forEach(([t, count]) => {
    const lx = leftX(t), rx = rightX(t);
    const inset = (rx - lx) * 0.08;
    const lx2 = lx + inset, rx2 = rx - inset;
    for (let i = 0; i < count; i++) {
      const code = codes[idx++];
      const s = (i + 0.5) / count;
      const x = lx2 + s * (rx2 - lx2);
      const y = rowY(t) + (i % 2 === 0 ? -1 : 1) * (6 + 8 * t);
      const size = sizeAt(t);
      const rot = (x < APEX.x ? -1 : 1) * (6 + 10 * t) + ((i % 3) - 1) * 3;
      items.push({ code, x, y, size, rot, z: Math.round(t * 100) });
    }
  });
  items.sort((a, b) => a.z - b.z);

  // 背後にうっすら見える山（左端から右端まで連なり、右は少しだけ画面外に覗く）
  const backMountain = `
    <path d="M0 ${VB_H*0.62}
             L${VB_W*0.18} ${VB_H*0.38}
             L${VB_W*0.34} ${VB_H*0.58}
             L${VB_W*0.50} ${VB_H*0.30}
             L${VB_W*0.68} ${VB_H*0.50}
             L${VB_W*0.84} ${VB_H*0.28}
             L${VB_W*1.06} ${VB_H*0.34}
             L${VB_W*1.06} ${VB_H}
             L0 ${VB_H} Z"
          fill="var(--stone)" opacity=".28"/>`;

  // 山頂の雪冠：山の輪郭そのものの座標（leftX/rightX）から求めるので、
  // 山の幅を変えても、常に輪郭にぴったり沿った形になる
  const snowEdge = 0.16;   // 雪線の高さ（山頂からの割合）
  const snowNotch = 0.10;  // 中央だけ少し高くして、雪線をギザギザにする
  const snow = `
    <path d="M${APEX.x} ${APEX.y}
             L${rightX(snowEdge)} ${rowY(snowEdge)}
             L${APEX.x} ${rowY(snowNotch)}
             L${leftX(snowEdge)} ${rowY(snowEdge)} Z"
          fill="var(--sun)" opacity=".92"/>`;

  const mountain = `
    ${backMountain}
    <path d="M${APEX.x} ${APEX.y} L${BASE_R.x} ${BASE_R.y} L${BASE_L.x} ${BASE_L.y} Z"
          fill="var(--pine)" opacity=".9"/>
    ${snow}
    <circle cx="${APEX.x}" cy="${APEX.y + 4}" r="92" fill="var(--sun)" opacity=".08"/>`;

  const sparkles = [[-100,10],[130,6],[-160,90],[150,80],[0,-18],[-90,130],[80,120]]
    .map(([dx, dy], i) => `
      <path transform="translate(${APEX.x + dx} ${APEX.y + 46 + dy}) rotate(${(i * 37) % 360})"
            d="M0 -6 L1.6 -1.6 L6 0 L1.6 1.6 L0 6 L-1.6 1.6 L-6 0 L-1.6 -1.6 Z"
            fill="var(--sun)" opacity=".55"/>`).join("");

  const layer = items.map((it, i) => {
    const half = it.size / 2;
    const inner = characterSVG(it.code, "", true).replace(/^<svg[^>]*>/, "").replace(/<\/svg>$/, "");
    const delay = (i * 0.06).toFixed(2);
    const cycle = (4.0 + (i % 5) * 0.3).toFixed(2);
    return `
      <g transform="translate(${it.x - half} ${it.y - half})">
        <g class="cl-char" style="--fd:${cycle}s;animation-delay:${delay}s,${delay}s">
          <g transform="rotate(${it.rot} ${half} ${half}) scale(${it.size / 160})">${inner}</g>
        </g>
      </g>`;
  }).join("");

  box.innerHTML = `
    <svg viewBox="0 0 ${VB_W} ${VB_H}" xmlns="http://www.w3.org/2000/svg" role="img"
         aria-label="12タイプが山に散らばったイラスト">
      ${mountain}${sparkles}${layer}
    </svg>`;
}
renderCluster();

/* =========================================================
   トップページ：about統合セクション（旧 about.html の中身を移植）
   ========================================================= */
function renderAboutSection() {
  const axisTable = document.getElementById("axis-table");
  if (!axisTable) return;   // このページにabout統合セクションがなければ何もしない

  const AXIS_MEMO = {
    PE: "目指すのは頂上？　それとも道のり？",
    SG: "歩くのはひとり？　それとも誰かと？",
    LF: "決めるのは事前？　それとも当日？",
    CA: "迷ったら引く？　それとも行く？",
  };
  axisTable.innerHTML = AXES.map((ax) => `
    <div class="ax-item">
      <div class="ax-row">
        <div class="ax-end l">
          <span class="ax-word">${ax.aName}</span>
          <span class="ax-ltr">${ax.a}</span>
          <span class="ax-en">${ax.aEn}</span>
        </div>
        <div class="ax-mid">
          <span class="ax-title">${ax.title}</span>
          <svg class="ax-arrow" viewBox="0 0 120 12" preserveAspectRatio="none" aria-hidden="true">
            <path d="M14 6 H106" stroke="#C3CFC8" stroke-width="1.6"/>
            <path d="M2 6 L14 1.6 L14 10.4 Z" fill="#1E3A31"/>
            <path d="M118 6 L106 1.6 L106 10.4 Z" fill="#46708F"/>
          </svg>
        </div>
        <div class="ax-end r">
          <span class="ax-word">${ax.bName}</span>
          <span class="ax-ltr">${ax.b}</span>
          <span class="ax-en">${ax.bEn}</span>
        </div>
      </div>
      <p class="ax-memo">${AXIS_MEMO[ax.id]}</p>
    </div>`).join("");

  document.getElementById("area-rows").innerHTML = [
    ["PS", "ピークハント", "ソロ"], ["PG", "ピークハント", "グループ"],
    ["ES", "エンジョイ", "ソロ"],   ["EG", "エンジョイ", "グループ"],
  ].map(([key, aj, bj]) => {
    const g = GROUPS[key];
    return `<div class="area-row">
      <span class="ar-cmb">${aj} × ${bj}</span>
      <span class="ar-arrow">→</span>
      <span class="ar-chip" style="background:${g.band}">
        ${areaIcon(key)}<b style="color:${g.deep}">${g.name}</b>
      </span>
    </div>`;
  }).join("");

  const MATRIX_ORDER = ["PG", "PS", "EG", "ES"];
  const codesOf = (key) => Object.keys(TYPES).filter((c) => c.slice(0, 2) === key);
  const matrix = document.getElementById("matrix");
  matrix.insertAdjacentHTML("beforeend", MATRIX_ORDER.map((key) => {
    const g = GROUPS[key];
    const side = (key === "PG" || key === "EG") ? "l" : "r";
    const row = (key === "PS" || key === "PG") ? "top" : "bottom";
    return `
      <div class="mx-cell mx-${side} mx-${row}" data-g="${key}" style="background:${g.band}">
        <span class="mx-bg" style="color:${g.deep}">${g.name}</span>
        <span class="mx-lead">${g.lead}</span>
        <span class="mx-chars">
          ${codesOf(key).map((c) => {
            const ch = CHARACTERS[c];
            return `<a class="mx-char" href="types.html?g=${key}#${c}"
                       aria-label="${ch ? ch.animal : c}の紹介を見る">${characterSVG(c, "char", true)}</a>`;
          }).join("")}
        </span>
      </div>`;
  }).join(""));

  matrix.addEventListener("click", (e) => {
    if (e.target.closest(".mx-char")) return;   // キャラクターは個別のリンクに任せる
    const cell = e.target.closest(".mx-cell");
    if (cell) location.href = `types.html?g=${cell.dataset.g}`;
  });
}
renderAboutSection();

/* =========================================================
   足跡アセット（サイト全体で共通）
   肉球・鳥・ひづめ・翼（コウモリ）の4種類。すべてcurrentColorで塗るので、
   使う場所のCSSのcolorだけで色を変えられる
   ========================================================= */
/* 動物ごとに専用の足跡（16タイプ＋シークレット2種、計18種類） */
const FOOTPRINTS_BY_TYPE = {
  EGFA: `<svg viewBox="0 0 100 100"><ellipse cx="36" cy="28" rx="9" ry="20" fill="currentColor" transform="rotate(-12 36 28)"/> <ellipse cx="64" cy="28" rx="9" ry="20" fill="currentColor" transform="rotate(12 64 28)"/> <circle cx="47" cy="66" r="8" fill="currentColor"/> <circle cx="53" cy="84" r="8" fill="currentColor"/></svg>`,
  EGFC: `<svg viewBox="0 0 100 100"><ellipse cx="50" cy="70" rx="14" ry="11" fill="currentColor"/> <ellipse cx="28" cy="42" rx="4.2" ry="9" fill="currentColor" transform="rotate(-34 28 42)"/> <ellipse cx="39" cy="28" rx="4.2" ry="10.5" fill="currentColor" transform="rotate(-15 39 28)"/> <ellipse cx="50" cy="23" rx="4.2" ry="11" fill="currentColor"/> <ellipse cx="61" cy="28" rx="4.2" ry="10.5" fill="currentColor" transform="rotate(15 61 28)"/> <ellipse cx="72" cy="42" rx="4.2" ry="9" fill="currentColor" transform="rotate(34 72 42)"/></svg>`,
  EGLA: `<svg viewBox="0 0 100 100"><path d="M50 46 L20 12 Q50 28 80 12 Z" fill="currentColor" opacity=".55"/> <path d="M50 92 L50 46" stroke="currentColor" stroke-width="8" stroke-linecap="round"/> <path d="M50 46 L28 12" stroke="currentColor" stroke-width="8" stroke-linecap="round"/> <path d="M50 46 L50 6" stroke="currentColor" stroke-width="8" stroke-linecap="round"/> <path d="M50 46 L72 12" stroke="currentColor" stroke-width="8" stroke-linecap="round"/> <path d="M50 92 L38 78" stroke="currentColor" stroke-width="7" stroke-linecap="round"/></svg>`,
  EGLC: `<svg viewBox="0 0 100 100"><path d="M44 12 C30 12 22 28 24 48 C26 66 35.2 82 44 86 C46 74 46 24 44 12 Z" fill="currentColor"/> <path d="M56 12 C70 12 78 28 76 48 C74 66 64.8 82 56 86 C54 74 54 24 56 12 Z" fill="currentColor"/></svg>`,
  ESFA: `<svg viewBox="0 0 100 100"><ellipse cx="50" cy="72" rx="14" ry="18" fill="currentColor"/> <ellipse cx="34" cy="34" rx="6.5" ry="10" fill="currentColor" transform="rotate(-16 34 34)"/> <ellipse cx="45" cy="22" rx="6.5" ry="11" fill="currentColor" transform="rotate(-5 45 22)"/> <ellipse cx="57" cy="22" rx="6.5" ry="11" fill="currentColor" transform="rotate(5 57 22)"/> <ellipse cx="68" cy="34" rx="6.5" ry="10" fill="currentColor" transform="rotate(16 68 34)"/></svg>`,
  ESFC: `<svg viewBox="0 0 100 100"><ellipse cx="50" cy="70" rx="19" ry="16" fill="currentColor"/> <ellipse cx="33" cy="38" rx="7.5" ry="9" fill="currentColor" transform="rotate(-18 33 38)"/> <ellipse cx="44" cy="29" rx="7.5" ry="10" fill="currentColor" transform="rotate(-6 44 29)"/> <ellipse cx="57" cy="29" rx="7.5" ry="10" fill="currentColor" transform="rotate(6 57 29)"/> <ellipse cx="68" cy="38" rx="7.5" ry="9" fill="currentColor" transform="rotate(18 68 38)"/></svg>`,
  ESLA: `<svg viewBox="0 0 100 100"><ellipse cx="50" cy="70" rx="18" ry="15" fill="currentColor"/> <ellipse cx="28" cy="40" rx="6.5" ry="9" fill="currentColor" transform="rotate(-28 28 40)"/> <ellipse cx="40" cy="28" rx="6.5" ry="9.5" fill="currentColor" transform="rotate(-10 40 28)"/> <ellipse cx="52" cy="25" rx="6.5" ry="9.5" fill="currentColor"/> <ellipse cx="64" cy="28" rx="6.5" ry="9.5" fill="currentColor" transform="rotate(10 64 28)"/> <ellipse cx="76" cy="40" rx="6.5" ry="9" fill="currentColor" transform="rotate(28 76 40)"/></svg>`,
  ESLC: `<svg viewBox="0 0 100 100"><g transform="translate(9.0 9.0) scale(0.82)">   <ellipse cx="50" cy="70" rx="14" ry="11" fill="currentColor"/>   <ellipse cx="30" cy="46" rx="4.6" ry="6.5" fill="currentColor" transform="rotate(-30 30 46)"/>   <ellipse cx="41" cy="35" rx="4.6" ry="6.8" fill="currentColor" transform="rotate(-12 41 35)"/>   <ellipse cx="50" cy="32" rx="4.6" ry="6.8" fill="currentColor"/>   <ellipse cx="59" cy="35" rx="4.6" ry="6.8" fill="currentColor" transform="rotate(12 59 35)"/>   <ellipse cx="70" cy="46" rx="4.6" ry="6.5" fill="currentColor" transform="rotate(30 70 46)"/> </g></svg>`,
  PGFA: `<svg viewBox="0 0 100 100"><ellipse cx="52" cy="66" rx="20" ry="17" fill="currentColor"/> <ellipse cx="32" cy="38" rx="6" ry="9" fill="currentColor" transform="rotate(-20 32 38)"/> <ellipse cx="45" cy="26" rx="6" ry="10" fill="currentColor" transform="rotate(-6 45 26)"/> <ellipse cx="59" cy="24" rx="6" ry="10" fill="currentColor" transform="rotate(6 59 24)"/> <ellipse cx="72" cy="32" rx="6" ry="9.5" fill="currentColor" transform="rotate(22 72 32)"/> <ellipse cx="20" cy="66" rx="7" ry="10" fill="currentColor" transform="rotate(-72 20 66)"/></svg>`,
  PGFC: `<svg viewBox="0 0 100 100"><path d="M50 92 L50 46" stroke="currentColor" stroke-width="6" stroke-linecap="round"/> <path d="M50 46 L25 12" stroke="currentColor" stroke-width="6" stroke-linecap="round"/> <path d="M50 46 L50 6" stroke="currentColor" stroke-width="6" stroke-linecap="round"/> <path d="M50 46 L75 12" stroke="currentColor" stroke-width="6" stroke-linecap="round"/></svg>`,
  PGLA: `<svg viewBox="0 0 100 100"><path d="M50 92 L50 46" stroke="currentColor" stroke-width="9" stroke-linecap="round"/> <path d="M50 46 L21 12" stroke="currentColor" stroke-width="9" stroke-linecap="round"/> <path d="M50 46 L50 6" stroke="currentColor" stroke-width="9" stroke-linecap="round"/> <path d="M50 46 L79 12" stroke="currentColor" stroke-width="9" stroke-linecap="round"/> <path d="M50 92 L38 78" stroke="currentColor" stroke-width="8" stroke-linecap="round"/></svg>`,
  PGLC: `<svg viewBox="0 0 100 100"><path d="M50 46 L20 12 Q50 28 80 12 Z" fill="currentColor" opacity=".55"/> <path d="M50 92 L50 46" stroke="currentColor" stroke-width="11" stroke-linecap="round"/> <path d="M50 46 L23 12" stroke="currentColor" stroke-width="11" stroke-linecap="round"/> <path d="M50 46 L50 6" stroke="currentColor" stroke-width="11" stroke-linecap="round"/> <path d="M50 46 L77 12" stroke="currentColor" stroke-width="11" stroke-linecap="round"/> <path d="M50 92 L38 78" stroke="currentColor" stroke-width="10" stroke-linecap="round"/></svg>`,
  PSFA: `<svg viewBox="0 0 100 100"><ellipse cx="50" cy="70" rx="26" ry="18" fill="currentColor"/> <ellipse cx="24" cy="38" rx="7" ry="9" fill="currentColor" transform="rotate(-30 24 38)"/> <circle cx="20" cy="30" r="2" fill="currentColor"/> <ellipse cx="38" cy="25" rx="8" ry="10.5" fill="currentColor" transform="rotate(-12 38 25)"/> <circle cx="34" cy="15" r="2.1" fill="currentColor"/> <ellipse cx="54" cy="21" rx="9" ry="12" fill="currentColor"/> <circle cx="54" cy="9" r="2.3" fill="currentColor"/> <ellipse cx="70" cy="26" rx="9.5" ry="12.5" fill="currentColor" transform="rotate(14 70 26)"/> <circle cx="75" cy="14" r="2.4" fill="currentColor"/> <ellipse cx="83" cy="40" rx="8.5" ry="10.5" fill="currentColor" transform="rotate(30 83 40)"/> <circle cx="90" cy="32" r="2.2" fill="currentColor"/></svg>`,
  PSFC: `<svg viewBox="0 0 100 100"><ellipse cx="50" cy="68" rx="15" ry="12" fill="currentColor"/> <ellipse cx="27" cy="40" rx="5.5" ry="8" fill="currentColor" transform="rotate(-32 27 40)"/> <ellipse cx="38" cy="28" rx="5.5" ry="8" fill="currentColor" transform="rotate(-14 38 28)"/> <ellipse cx="50" cy="24" rx="5.5" ry="8" fill="currentColor"/> <ellipse cx="62" cy="28" rx="5.5" ry="8" fill="currentColor" transform="rotate(14 62 28)"/> <ellipse cx="73" cy="40" rx="5.5" ry="8" fill="currentColor" transform="rotate(32 73 40)"/></svg>`,
  PSLA: `<svg viewBox="0 0 100 100"><path d="M50 92 L50 46" stroke="currentColor" stroke-width="10" stroke-linecap="round"/> <path d="M50 46 L19 12" stroke="currentColor" stroke-width="10" stroke-linecap="round"/> <path d="M50 46 L50 6" stroke="currentColor" stroke-width="10" stroke-linecap="round"/> <path d="M50 46 L81 12" stroke="currentColor" stroke-width="10" stroke-linecap="round"/> <path d="M50 92 L38 78" stroke="currentColor" stroke-width="9" stroke-linecap="round"/></svg>`,
  PSLC: `<svg viewBox="0 0 100 100"><path d="M46 12 C32 12 24 28 26 48 C28 66 37.2 82 46 86 C48 74 48 24 46 12 Z" fill="currentColor"/> <path d="M54 12 C68 12 76 28 74 48 C72 66 62.8 82 54 86 C52 74 52 24 54 12 Z" fill="currentColor"/></svg>`,
  "secret-bat": `<svg viewBox="0 0 100 100"><path d="M50 70 C34 66 20 54 14 34 C24 40 32 42 40 40 C34 30 30 20 30 10        C40 18 46 28 48 38 C48 26 50 14 54 6 C58 16 58 28 56 38        C62 26 68 18 76 12 C74 22 68 32 60 40 C68 40 76 36 84 28        C80 46 68 58 54 64 Z" fill="currentColor"/> <ellipse cx="50" cy="78" rx="10" ry="8" fill="currentColor"/></svg>`,
  "secret-ptarmigan": `<svg viewBox="0 0 100 100"><path d="M50 46 L20 12 Q50 28 80 12 Z" fill="currentColor" opacity=".55"/> <path d="M50 92 L50 46" stroke="currentColor" stroke-width="13" stroke-linecap="round"/> <path d="M50 46 L23 12" stroke="currentColor" stroke-width="13" stroke-linecap="round"/> <path d="M50 46 L50 6" stroke="currentColor" stroke-width="13" stroke-linecap="round"/> <path d="M50 46 L77 12" stroke="currentColor" stroke-width="13" stroke-linecap="round"/> <path d="M50 92 L38 78" stroke="currentColor" stroke-width="12" stroke-linecap="round"/></svg>`,
};

// FOOTPRINTSという名前は他の箇所（背景散らし・区切り線）から共通で参照されるので、
// 中身をタイプ別データに差し替える形にしている
const FOOTPRINTS = FOOTPRINTS_BY_TYPE;

// 診断タイプ・シークレット → 足跡（そのまま自分自身のコードを使う）
// シークレットのidは通常のタイプコードと書式が違うので、対応表だけ残す
const SECRET_FOOTPRINT = { bat: "secret-bat", ptarmigan: "secret-ptarmigan" };

function footprintInner(key) {
  return (FOOTPRINTS[key] || FOOTPRINTS.paw).trim().replace(/^<svg[^>]*>/, "").replace(/<\/svg>$/, "");
}

/* 歩行風の区切り線：同じ向き・一方向に進みつつ、左右の足が交互に着地しているような
   控えめな縦のずれを付ける。
   pxWidthには実際のコンテナ幅（px）を渡す。viewBoxをその幅に一致させることで、
   svgをwidth:100%で表示しても足跡の大きさが伸び縮みせず、個数だけが幅に応じて増減する */
function trailDividerSVG(footKey, pxWidth) {
  const spacing = 34;   // 足跡1つあたりに使う横幅の目安（px）
  const size = 17, offset = 4, h = 30;
  const w = Math.max(pxWidth, spacing * 4);
  const count = Math.max(4, Math.floor(w / spacing));
  const step = w / (count + 1);
  const inner = footprintInner(footKey);
  const items = Array.from({ length: count }, (_, i) => {
    const x = step * (i + 1);
    const y = h / 2 + (i % 2 === 0 ? -offset : offset);
    return `<g transform="translate(${x - size / 2} ${y - size / 2}) rotate(-90 ${size / 2} ${size / 2}) scale(${size / 100})" opacity=".8">${inner}</g>`;
  }).join("");
  return `<svg viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none">${items}</svg>`;
}

/* トップページの区切り：足跡の種類はランダム（毎回変わる）。
   種類は一度選んだら、リサイズ時も同じ種類を保つ */
let heroFootprintKey = null;
let aboutFootprintKey = null;
let resultFootprintKey = null;
function renderHeroFootprintDivider() {
  const box = document.getElementById("hero-footprint-divider");
  if (!box) return;
  if (!heroFootprintKey) {
    const keys = Object.keys(FOOTPRINTS);
    heroFootprintKey = keys[Math.floor(Math.random() * keys.length)];
  }
  box.innerHTML = trailDividerSVG(heroFootprintKey, box.clientWidth || box.getBoundingClientRect().width);
}
renderHeroFootprintDivider();

/* about セクション末尾（16タイプの詳細をもっと見る の下）の区切り。こちらもランダム */
function renderAboutFootprintDivider() {
  const box = document.getElementById("about-footprint-divider");
  if (!box) return;
  if (!aboutFootprintKey) {
    const keys = Object.keys(FOOTPRINTS);
    aboutFootprintKey = keys[Math.floor(Math.random() * keys.length)];
  }
  box.innerHTML = trailDividerSVG(aboutFootprintKey, box.clientWidth || box.getBoundingClientRect().width);
}
renderAboutFootprintDivider();

/* =========================================================
   余白の足跡散らし（ページ全体・全画面共通）
   グリッドベース配置：120px四方のマス目に区切り、1マスにつき最大1個までとして
   重なりを防ぐ。さらに全マスの20〜30%だけを間引いて選び、
   選ばれたマスの中心から数pxランダムにズラして（ジッター）配置する。
   動物本体ではなく足跡だけを、中央のコンテンツを避けつつ配置する。
   全部try/catchで守り、万が一失敗しても他の機能に影響しないようにしてある。
   ========================================================= */
function renderScatterChars() {
  try {
    if (window.innerWidth < 768) {
      const old = document.getElementById("scatter-layer");
      if (old) old.remove();
      return;
    }

    let layer = document.getElementById("scatter-layer");
    if (!layer) {
      layer = document.createElement("div");
      layer.id = "scatter-layer";
      document.body.insertBefore(layer, document.body.firstChild);
    }
    layer.innerHTML = "";

    // 今表示されている内容の実際の高さに合わせる（SPAの画面ごとに高さが違うため）
    const activeScreen = document.querySelector(".screen.is-active");
    const height = Math.max(
      activeScreen ? activeScreen.scrollHeight : 0,
      document.body.scrollHeight,
      window.innerHeight
    );
    layer.style.height = height + "px";

    // コンテンツの半幅の目安（index.htmlは480px幅、types.htmlは720px幅で中央寄せされているため）
    const contentHalf = document.body.classList.contains("list-page-body") ? 360 : 240;
    const viewportHalf = window.innerWidth / 2;

    const keys = Object.keys(FOOTPRINTS);
    const CELL = 120;          // マス目のサイズ(px)
    const FILL_RATIO = 0.25;   // 全マスのうち配置するマスの割合（20〜30%の中央値）
    const JITTER = CELL * 0.28; // マス中心からのズレの最大量(px)

    const cols = Math.ceil(window.innerWidth / CELL);
    const rows = Math.ceil(height / CELL);

    // まず、中央のコンテンツ帯にかからないマスだけを候補として集める
    const candidates = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const cx = c * CELL + CELL / 2;
        const cy = r * CELL + CELL / 2;
        if (Math.abs(cx - viewportHalf) < contentHalf + 20) continue;
        candidates.push({ cx, cy });
      }
    }

    // 候補マスをシャッフルしてから、全体の20〜30%だけを間引いて選ぶ
    for (let i = candidates.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
    }
    const pickCount = Math.round(candidates.length * FILL_RATIO);
    const chosen = candidates.slice(0, pickCount);

    chosen.forEach(({ cx, cy }) => {
      // マスの中心から、数pxだけランダムにズラす（ジッター効果）
      const x = cx + (Math.random() * 2 - 1) * JITTER;
      const y = cy + (Math.random() * 2 - 1) * JITTER;
      const size = 14 + Math.random() * 14;
      const key = keys[Math.floor(Math.random() * keys.length)];
      const rot = Math.round(Math.random() * 360);

      const el = document.createElement("div");
      el.className = "scatter-print";
      el.style.left = x + "px";
      el.style.top = y + "px";
      el.style.width = size + "px";
      el.style.transform = `rotate(${rot}deg)`;
      el.innerHTML = FOOTPRINTS[key];
      layer.appendChild(el);
    });
  } catch (err) {
    // 装飾のための機能なので、失敗しても他の動作を止めない
    console.error("scatter render error", err);
  }
}
renderScatterChars();

let scatterUpdateTimer = null;
function scheduleScatterUpdate() {
  clearTimeout(scatterUpdateTimer);
  scatterUpdateTimer = setTimeout(() => {
    renderScatterChars();
    // 区切り線も、幅が変わったら足跡の個数を計算し直す（種類は変えない）
    renderHeroFootprintDivider();
    renderAboutFootprintDivider();
    const resultDivider = document.getElementById("result-footprint-divider");
    if (resultDivider && resultFootprintKey) {
      resultDivider.innerHTML = trailDividerSVG(resultFootprintKey, resultDivider.clientWidth || resultDivider.getBoundingClientRect().width);
    }
  }, 200);
}
window.addEventListener("resize", scheduleScatterUpdate);

/* =========================================================
   スクロール追従ヘッダー
   下スクロールで隠れ、上スクロールでスッと出てくる。
   質問・結果画面では出さない（診断の途中でリセットするミスタップを防ぐため）
   ========================================================= */
(function initScrollHeader() {
  const header = document.getElementById("scroll-header");
  if (!header) return;

  let lastY = window.scrollY;
  let ticking = false;

  function onScroll() {
    // 質問・結果画面のあいだは、スクロールに関わらずヘッダーを出さない
    const startActive = document.getElementById("screen-start")?.classList.contains("is-active");
    if (!startActive) {
      header.classList.remove("show");
      lastY = window.scrollY;
      return;
    }
    const y = window.scrollY;
    if (y < 80) {
      header.classList.remove("show");   // 一番上の方は本体のCTAが見えているので不要
    } else if (y < lastY) {
      header.classList.add("show");      // 上スクロール
    } else if (y > lastY) {
      header.classList.remove("show");   // 下スクロール
    }
    lastY = y;
  }

  window.addEventListener("scroll", () => {
    if (!ticking) {
      requestAnimationFrame(() => { onScroll(); ticking = false; });
      ticking = true;
    }
  }, { passive: true });

  // 診断をはじめる：トップページ本体の開始ボタンと同じ動作にする
  document.getElementById("sh-cta")?.addEventListener("click", () => {
    document.getElementById("btn-start")?.click();
    header.classList.remove("show");
  });
  document.getElementById("sh-logo")?.addEventListener("click", (e) => {
    e.preventDefault();
    header.classList.remove("show");
    window.scrollTo({ top: 0, behavior: "smooth" });
  });
})();

/* =========================================================
   スクロール連動アニメーション
   見出し・カード・マトリクスの4エリアが、画面に入ったタイミングでふわっと現れる
   ========================================================= */
(function initScrollReveal() {
  document.querySelectorAll(".about-lead, .legend, .matrix").forEach((el) => el.classList.add("sr-reveal"));
  document.querySelectorAll(".mx-cell").forEach((el, i) => {
    el.classList.add("sr-reveal-pop");
    el.style.setProperty("--reveal-d", (i * 0.08).toFixed(2) + "s");
  });

  const targets = document.querySelectorAll(".sr-reveal, .sr-reveal-pop");
  if (!targets.length) return;

  const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (prefersReduced || typeof IntersectionObserver === "undefined") {
    targets.forEach((el) => el.classList.add("in-view"));
    return;
  }

  const io = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("in-view");
        io.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15, rootMargin: "0px 0px -40px 0px" });
  targets.forEach((el) => io.observe(el));
})();

/* 結果画面から「診断の仕組み」を押したとき：
   aboutセクションはスタート画面の中にあるので、まずスタート画面に戻ってからスクロールする */
const linkAboutFromResult = document.getElementById("link-about-from-result");
if (linkAboutFromResult) {
  linkAboutFromResult.addEventListener("click", (e) => {
    e.preventDefault();
    showScreen("start");
    requestAnimationFrame(() => {
      document.getElementById("about")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });
}

/* スタート画面本体から「診断の仕組み」を押したとき：
   ページ内を滑らかにスクロール（同じページの中を移動している感覚が伝わるように） */
const linkAboutFromHero = document.getElementById("link-about-from-hero");
if (linkAboutFromHero) {
  linkAboutFromHero.addEventListener("click", (e) => {
    e.preventDefault();
    document.getElementById("about")?.scrollIntoView({ behavior: "smooth", block: "start" });
  });
}

/* ---------- 質問ページの描画 ---------- */
function renderPage() {
  const page = $("#quiz-page");
  page.innerHTML = "";
  page.classList.remove("page-in");
  void page.offsetWidth;
  page.classList.add("page-in");

  const start = currentPage * QUESTIONS_PER_PAGE;
  const end = currentPage === totalPages - 1 ? QUIZ.length : Math.min(start + QUESTIONS_PER_PAGE, QUIZ.length);

  for (let i = start; i < end; i++) {
    const q = QUIZ[i];
    const card = document.createElement("div");
    card.className = "q-card";
    card.dataset.index = i;
    // ページ内での順番だけずらす。1枚ずつ少し遅れて現れるように
    card.style.setProperty("--cd", ((i - start) * 0.09).toFixed(2) + "s");

    const strength = ["とてもAに近い", "Aに近い", "やや A", "やや B", "Bに近い", "とてもBに近い"];
    const dots = [0, 1, 2, 3, 4, 5].map((v) => {
      const sel = answers[i] === v ? " selected" : "";
      return `<button type="button" class="dot${sel}" data-v="${v}"
        aria-label="${strength[v]}"></button>`;
    }).join("");

    card.innerHTML = `
      <span class="q-num">Q${i + 1}</span>
      <p class="q-text">${q.text}</p>
      <div class="opt-label opt-a">A. ${q.a}</div>
      <div class="opt-label opt-b">B. ${q.b}</div>
      <div class="scale">
        <div class="dots">${dots}</div>
        <div class="scale-notes">
          <span>Aに近い</span>
          <span>Bに近い</span>
        </div>
      </div>
    `;
    page.appendChild(card);
  }

  $("#btn-back").style.visibility = "visible";
  $("#btn-next").textContent = currentPage === totalPages - 1 ? "結果を見る" : "つぎへ";
  updateProgress();
}

/* ---------- ドット選択 ---------- */
$("#quiz-page").addEventListener("click", (e) => {
  const dot = e.target.closest(".dot");
  if (!dot) return;
  const card = dot.closest(".q-card");
  const idx = Number(card.dataset.index);
  answers[idx] = Number(dot.dataset.v);

  card.querySelectorAll(".dot").forEach((d) => {
    d.classList.remove("selected");
    d.querySelector(".dot-ripple")?.remove();
  });
  dot.classList.add("selected");
  card.classList.remove("needs-answer");

  // 選んだ瞬間、色つきの波紋をふわっと広げて消す
  const ripple = document.createElement("span");
  ripple.className = "dot-ripple";
  ripple.style.color = Number(dot.dataset.v) <= 2 ? "var(--pine)" : "var(--fjord)";
  dot.appendChild(ripple);
  ripple.addEventListener("animationend", () => ripple.remove());

  updateProgress();
  scrollToNext(idx);
});

/* ---------- 回答したら次の質問へ送る ----------
   まだ答えていないカードを優先し、なければページ末のボタンへ送る */
function scrollToNext(fromIndex) {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  const pageStart = currentPage * QUESTIONS_PER_PAGE;
  const pageEnd = currentPage === totalPages - 1 ? QUIZ.length : Math.min(pageStart + QUESTIONS_PER_PAGE, QUIZ.length);

  let target = null;
  for (let i = fromIndex + 1; i < pageEnd; i++) {
    if (answers[i] === null) { target = i; break; }
  }
  if (target === null && fromIndex + 1 < pageEnd) target = fromIndex + 1;

  setTimeout(() => {
    if (target !== null) {
      const next = document.querySelector(`.q-card[data-index="${target}"]`);
      if (next) next.scrollIntoView({ behavior: "smooth", block: "center" });
    } else {
      // ページ最後の質問に答えたら「つぎへ」ボタンを見せる
      $("#btn-next").scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, 260);
}

/* ---------- 登山道プログレス ----------
   左端が登山口、右端が山頂。歩いた分だけ道に色がつき、現在地の丸が進む */
let routeLength = 0;

function updateProgress() {
  const done = answers.filter((a) => a !== null).length;
  const ratio = QUIZ.length ? done / QUIZ.length : 0;
  const route = document.getElementById("climb-path");
  const walked = document.getElementById("climb-progress");
  const marker = document.getElementById("climb-marker");

  if (route && walked) {
    if (!routeLength) {
      try {
        routeLength = route.getTotalLength();
        walked.style.strokeDasharray = routeLength;
      } catch (e) { routeLength = 0; }
    }
    if (routeLength) {
      walked.style.strokeDashoffset = routeLength * (1 - ratio);
      try {
        const p = route.getPointAtLength(routeLength * ratio);
        marker.setAttribute("cx", p.x);
        marker.setAttribute("cy", p.y);
        // 1問答えるごとに、マーカーをぴょんと跳ねさせる
        marker.classList.remove("hop");
        void marker.offsetWidth;
        marker.classList.add("hop");
      } catch (e) {}
    }
  }

  const wasPeakPassed = document.getElementById("sign-peak").classList.contains("passed");
  document.getElementById("sign-mid").classList.toggle("passed", ratio >= 0.5);
  document.getElementById("sign-peak").classList.toggle("passed", done === QUIZ.length);
  $("#progress-count").textContent = done;
  $("#progress-bar-wrap").setAttribute("aria-valuenow", done);

  // 最後の質問に答えた瞬間だけ、山頂にキラキラを出す
  if (!wasPeakPassed && done === QUIZ.length) {
    const spark = document.getElementById("summit-spark");
    if (spark) {
      spark.classList.remove("show");
      void spark.getBBox();
      spark.classList.add("show");
    }
  }
}

/* ---------- ページ移動 ---------- */
$("#btn-start").addEventListener("click", () => {
  track("quiz_start");
  currentPage = 0;
  showScreen("quiz");
  renderPage();
});

$("#btn-back").addEventListener("click", () => {
  if (currentPage === 0) {
    showScreen("start");
  } else {
    currentPage--;
    renderPage();
  }
});

$("#btn-next").addEventListener("click", () => {
  const start = currentPage * QUESTIONS_PER_PAGE;
  const end = currentPage === totalPages - 1 ? QUIZ.length : Math.min(start + QUESTIONS_PER_PAGE, QUIZ.length);
  for (let i = start; i < end; i++) {
    if (answers[i] === null) {
      const card = document.querySelector(`.q-card[data-index="${i}"]`);
      card.classList.add("needs-answer");
      card.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
  }
  if (currentPage < totalPages - 1) {
    currentPage++;
    track("quiz_page", { page: currentPage + 1 });
    renderPage();
    window.scrollTo({ top: 0, behavior: "smooth" });
  } else {
    showResult();
  }
});


/* ---------- 相性のいいタイプ ----------
   息が合う相手  : 計画軸だけが逆のタイプ（感覚派と計画派で補完し合う）
   刺激をくれる相手: 目的軸だけが逆のタイプ（同じ登り方で、山の楽しみ方が違う） */
function flipAxis(code, axisIndex) {
  const ax = AXES[axisIndex];
  const chars = code.split("");
  chars[axisIndex] = chars[axisIndex] === ax.a ? ax.b : ax.a;
  return chars.join("");
}

function findMatches(code, secret) {
  const w = (typeof MATCH_WHY !== "undefined" && MATCH_WHY[code]) || {};
  const list = [
    { label: "補い合える相手",     code: flipAxis(code, 2), why: w.calm || "" },
    { label: "歩き方が似ている相手", code: flipAxis(code, 0), why: w.spark || "" },
  ];

  if (secret) {
    // シークレットのときは3人目に同じタイプの通常の姿が出る
    list.push({
      label: "相性は文句なし",
      code: code,
      why: typeof SECRET_MATCH_WHY !== "undefined" ? SECRET_MATCH_WHY : "",
    });
  } else {
    // 目的と仲間の両方が逆の相手。相手から見てもあなたが出る
    list.push({
      label: "刺激をくれる相手",
      code: flipAxis(flipAxis(code, 0), 1),
      why: w.opp || "",
    });
  }
  return list;
}

/* ---------- 判定ロジック ----------
   6段階の回答を「1文字目側に何%寄っているか」に変換して平均する。
     v=0 → 100%  v=1 → 80%  v=2 → 60%
     v=3 →  40%  v=4 → 20%  v=5 →  0%
   rev が true の質問は、選択肢Aが2文字目側を指すため向きを反転させる。
   こうすると「どちらかといえばA」を3回選んでも60%にとどまり、
   100%は3問すべてで端を選んだときにだけ出る。 */
function calcResult() {
  const share = {};
  AXES.forEach((ax) => (share[ax.id] = []));

  QUIZ.forEach((q, i) => {
    if (!q.axis) return;                            // シークレット専用の問題は判定に使わない
    const v = answers[i];
    const towardOptionA = ((5 - v) / 5) * 100;      // 選択肢Aへの寄り
    const towardFirstLetter = q.rev ? 100 - towardOptionA : towardOptionA;
    share[q.axis].push(towardFirstLetter);
  });

  let code = "";
  const detail = [];
  AXES.forEach((ax) => {
    const list = share[ax.id];
    const aPct = list.length
      ? Math.round(list.reduce((sum, x) => sum + x, 0) / list.length)
      : 50;
    const aWins = aPct >= 50;                        // 同点は1文字目側に倒す
    code += aWins ? ax.a : ax.b;
    detail.push({ ...ax, aPct, bPct: 100 - aPct, aWins });
  });
  return { code, detail };
}

/* ---------- シークレットの判定 ----------
   専用問題でAの端（いちばん強い回答）を選び、
   かつ結果が code と完全一致したときだけ成立する */
function findSecret(code) {
  if (typeof SECRETS === "undefined") return null;

  for (let i = 0; i < QUIZ.length; i++) {
    const id = QUIZ[i].secret;
    if (!id) continue;
    const sec = SECRETS.find((x) => x.id === id);
    if (!sec || code !== sec.code) continue;
    if (answers[i] === 0) return sec;               // 選択肢A側のいちばん端
  }
  return null;
}

/* ---------- 結果表示 ---------- */
/* ---------- 計測（Google Analytics） ----------
   gtag が読み込めていない環境でも落ちないようにする */
/* GA4で「どのボタンから来たか」が分かるよう、チャネルごとにUTMを付ける。
   utm_source: x / line / copy_link など　utm_medium: social　utm_campaign: 用途 */
function withUtm(url, source, campaign) {
  const u = new URL(url);
  u.searchParams.set("utm_source", source);
  u.searchParams.set("utm_medium", "social");
  u.searchParams.set("utm_campaign", campaign);
  return u.toString();
}

function track(name, params) {
  if (typeof gtag === "function") gtag("event", name, params || {});
}

function showResult() {
  const { code, detail } = calcResult();
  const type = TYPES[code] || { name: "未知のタイプ", desc: "" };

  const g = groupOf(code);
  const plate = $("#result-code");
  plate.textContent = code;
  plate.style.background = g.deep;
  $("#result-hero").style.background = g.band;
  const grp = $("#result-group");
  grp.textContent = "生息エリア：" + g.name;
  grp.style.color = g.deep;
  const ch = CHARACTERS[code];
  const secret = findSecret(code);

  // 結果の区切り線は、診断結果の動物の足跡で固定（シークレットならシークレット側の種類）
  const resultDivider = document.getElementById("result-footprint-divider");
  if (resultDivider) {
    resultFootprintKey = secret ? (SECRET_FOOTPRINT[secret.id] || "PGLA") : code;
    resultDivider.innerHTML = trailDividerSVG(resultFootprintKey, resultDivider.clientWidth || resultDivider.getBoundingClientRect().width);
  }

  $("#result-char").innerHTML = secret
    ? secretSVG(secret.id, "char char-lg")
    : characterSVG(code, "char char-lg");
  $("#result-animal").textContent = secret ? secret.animal : (ch ? ch.animal : type.name);
  $("#result-name").textContent = secret ? secret.typeName : type.name;
  $("#result-animal-print").innerHTML = `<svg viewBox="0 0 100 100">${footprintInner(resultFootprintKey)}</svg>`;
  $("#secret-badge").hidden = !secret;
  $("#secret-lead").hidden = !secret;
  $("#secret-spark").hidden = !secret;
  $("#secret-note").hidden = !secret;
  if (secret) $("#secret-note").textContent = secret.note;
  document.querySelector(".result").classList.toggle("is-secret", !!secret);
  const item = secret ? SECRET_CHARACTERS[secret.id].item : (ch ? ch.item : "");
  $("#result-item").innerHTML = item ? `<b>持ちもの</b>${item}` : "";
  $("#result-copy").textContent = "「" + (secret ? secret.copy : type.copy) + "」";
  $("#result-features").textContent = secret ? secret.features : type.features;
  $("#result-caution").textContent = secret ? secret.caution : type.caution;

  // 4軸のタグ（Pピークハント / G生息エリア …）
  $("#result-axtags").innerHTML = code.split("").map((ch, i) => {
    const ax = AXES[i];
    const isFirst = ch === ax.a;
    return `<span class="axtag ${isFirst ? "s-a" : "s-b"}">
      <b>${ch}</b>${isFirst ? ax.aName : ax.bName}</span>`;
  }).join("");

  $("#result-match").innerHTML = findMatches(code, secret)
    .map((m) => {
      const t = TYPES[m.code] || { name: "—" };
      const mc = CHARACTERS[m.code];
      return `
      <a class="match" href="types.html#${m.code}" style="background:${groupOf(m.code).band}">
        <span class="match-label">${m.label}</span>
        ${characterSVG(m.code, "char char-sm")}
        <span class="match-code" style="background:${groupOf(m.code).deep}">${m.code}</span>
        <span class="match-name">${mc ? mc.animal : t.name}</span>
        <span class="match-type">${t.name}</span>
        <span class="match-why">${m.why}</span>
      </a>`;
    })
    .join("");

  /* おすすめの山（結果画面のみ。シークレットは専用の3座） */
  const mts = secret
    ? (typeof SECRET_MOUNTAINS !== "undefined" ? SECRET_MOUNTAINS[secret.id] : null)
    : (typeof MOUNTAINS !== "undefined" ? MOUNTAINS[code] : null);

  if (mts && mts.length) {
    $("#result-mountains").innerHTML = mts
      .map((m) => `
        <div class="mt">
          <p class="mt-name">${m.name}${m.note ? '<span class="mt-flag">要注意</span>' : ""}</p>
          ${m.pref ? `<p class="mt-pref">（${m.pref}）</p>` : ""}
          <p class="mt-why">${m.why}</p>
        </div>`)
      .join("");
    const hasNote = mts.some((m) => m.note);
    const noteEl = $("#result-mt-note");
    noteEl.hidden = !hasNote;
    if (hasNote) noteEl.textContent = typeof MOUNTAIN_NOTE !== "undefined" ? MOUNTAIN_NOTE : "";
  }

  $("#result-axes").innerHTML = detail
    .map((d) => {
      const winPct = d.aWins ? d.aPct : d.bPct;
      return `
      <div class="axis">
        <div class="axis-labels">
          <span class="${d.aWins ? "win" : "lose"}">
            ${d.a} ${d.aName}<b>${d.aPct}%</b>
          </span>
          <span class="${d.aWins ? "lose" : "win"}">
            <b>${d.bPct}%</b>${d.bName} ${d.b}
          </span>
        </div>
        <div class="axis-track">
          <div class="axis-bar ${d.aWins ? "side-a" : "side-b"}" style="width:${winPct}%"></div>
        </div>
      </div>`;
    })
    .join("");

  /* ---------- シェア用の文言 ----------
     X：結果＋診断への案内だけの短い形
     LINE：結果＋一言の布教文＋診断への案内（友だち1人への会話を想定した長め） */
  const shareAnimal = secret ? secret.animal : (ch ? ch.animal : type.name);
  const shareType = secret ? secret.typeName : type.name;
  const shareCopy = secret ? secret.copy : type.copy;
  const head = secret ? "【シークレット】" : "";

  // 共有先は、そのタイプの紹介ページ（診断していない人が開いても意味が通る）
  const shareUrl = `${SITE_URL}/types.html?g=${code.slice(0, 2)}#${code}`;

  function buildShareTexts(source) {
    const resultUrl = withUtm(shareUrl, source, "share_result");
    const ctaUrl = withUtm(`${SITE_URL}/`, source, "share_cta");
    const resultLine = `${head}私の登山タイプは【${shareAnimal}｜${shareType}】でした！\n${resultUrl}`;
    const ctaBlock = `▼診断はこちら\n${ctaUrl}\n${SHARE_HASHTAG}`;
    return { resultLine, ctaBlock };
  }

  const xParts = buildShareTexts("x");
  const textX = `${xParts.resultLine}\n\n${xParts.ctaBlock}`;

  const lineParts = buildShareTexts("line");
  const textLine =
    `${lineParts.resultLine}\n\n` +
    `13の質問に答えるだけ。\nあなたの登山スタイルが、16タイプの動物で分かります。\n\n` +
    lineParts.ctaBlock;

  // 互換用（他の場所でtextを参照している箇所向け。中身はXと同じ短い形にしておく）
  const text = textX;

  // 大きなシェアボタン。背景は生息エリアのdeep色に連動させる。押すとモーダルが開く
  const cta = $("#btn-cta");
  if (cta) {
    cta.style.background = g.deep;
    $("#cta-char").innerHTML = secret
      ? secretSVG(secret.id, "char")            // シークレットは情景ごと（円あり）
      : characterSVG(code, "char", true);       // 通常は背景円なし
  }

  // シェア用モーダルの中身も、この結果に合わせて用意しておく
  fillShareModal({ code, g, secret, detail, animal: shareAnimal, typeName: shareType,
                   copy: shareCopy, text, textX, textLine, shareUrl });

  track("diagnosis_complete", {
    type_code: code,
    animal: shareAnimal,
    type_name: shareType,
    area: g.name,
    is_secret: secret ? "yes" : "no",
    secret_id: secret ? secret.id : "",
  });

  showScreen("result");
  revealResult();

  requestAnimationFrame(() => {
    document.querySelectorAll(".axis-bar").forEach((bar) => {
      const w = bar.style.width;
      bar.style.width = "0%";
      requestAnimationFrame(() => (bar.style.width = w));
    });
  });
}

/* ---------- 結果を順番に見せる ----------
   上から順に少しずつ遅らせて現れるようにする */
function revealResult() {
  const box = document.querySelector(".result");
  if (!box) return;

  const items = [];
  Array.from(box.children).forEach((el) => {
    if (el.id === "result-hero") {
      Array.from(el.children).forEach((h) => {
        if (!h.classList.contains("wave")) items.push(h);
      });
    } else {
      items.push(el);
    }
  });

  box.classList.remove("reveal");
  items.forEach((el, i) => el.style.setProperty("--i", i));
  void box.offsetWidth;   // アニメーションをやり直させる
  box.classList.add("reveal");
}

/* ---------- もう一度 ---------- */
$("#btn-retry").addEventListener("click", () => {
  track("quiz_retry");
  answers.fill(null);
  currentPage = 0;
  QUIZ = buildQuiz(); // 順番を引き直す
  showScreen("start");
});


/* =========================================================
   シェア用モーダル（ボトムシート）
   ========================================================= */

/* =========================================================
   シェア用画像（縦長 9:16・確定デザイン）
   モーダルのプレビューとPNG生成の両方でこのSVGを使う
   ========================================================= */
const SHARE_GOLD = "#A5761F";
const SHARE_SUN = "#D99A2E";
const SHARE_DOMAIN = SITE_URL.replace(/^https?:\/\//, "");

/* キャラクターSVGの中身だけ取り出す（外側のsvgタグを剥がす） */
function svgInner(markup) {
  return markup.replace(/^<svg[^>]*>/, "").replace(/<\/svg>$/, "");
}

function shareImageSVG(d) {
  const g = d.g;
  const deep = g.deep;

  const header = `
    <text x="180" y="32" text-anchor="middle" font-family="Outfit,sans-serif" font-weight="500"
          font-size="9.5" letter-spacing="2.4" fill="${deep}" opacity=".75">16 TYPES OF HIKERS</text>
    <text x="180" y="74" text-anchor="middle" font-family="'Zen Maru Gothic',sans-serif"
          font-size="13.5" font-weight="700" fill="${deep}">あなたの登山タイプは</text>`;

  const ridge = `
    <path d="M0 552 L70 506 L140 546 L215 492 L290 538 L360 508 L360 640 L0 640 Z" fill="${deep}" opacity=".14"/>
    <path d="M0 588 L80 548 L160 582 L240 540 L320 578 L360 562 L360 640 L0 640 Z" fill="${deep}" opacity=".22"/>`;

  const charPart = d.secret
    ? `<g transform="translate(100,84) scale(1.0)">${svgInner(secretSVG(d.secret.id, ""))}</g>`
    : `<g transform="translate(100,84) scale(1.0)">${svgInner(characterSVG(d.code, "", false))}</g>`;

  /* シークレット演出：金の粒とSECRET！リボンだけ */
  const sparkles = d.secret ? [
    [54, 106, 2.6], [302, 98, 2.2], [40, 198, 2.0], [318, 186, 2.6], [180, 92, 1.8],
    [72, 256, 1.8], [294, 250, 2.2], [108, 98, 1.6], [254, 94, 1.6],
  ].map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="#E4BE6A"/>`).join("") : "";

  const ribbon = d.secret ? `
    <g transform="translate(240 102) rotate(9)">
      <rect x="0" y="0" width="72" height="23" rx="11.5" fill="${SHARE_GOLD}"/>
      <text x="36" y="16" text-anchor="middle" font-family="Outfit,sans-serif"
            font-size="12" font-weight="700" letter-spacing="1.5" fill="#FFF6E2">SECRET！</text>
    </g>` : "";

  const namePart = `
    <text x="180" y="272" text-anchor="middle" font-family="'Zen Maru Gothic',sans-serif"
          font-size="${d.secret ? 24 : 27}" font-weight="900" fill="#1E3A31">${d.animal}</text>
    <text x="180" y="299" text-anchor="middle" font-family="'Zen Maru Gothic',sans-serif"
          font-size="15" font-weight="700" fill="${deep}">${d.typeName}</text>
    <text x="180" y="323" text-anchor="middle" font-family="'Zen Maru Gothic',sans-serif"
          font-size="11" fill="#3d4d46">「${d.copy}」</text>`;

  const chip = `
    <rect x="103" y="336" width="76" height="23" rx="11.5" fill="${deep}"/>
    <text x="141" y="352" text-anchor="middle" font-family="Outfit,sans-serif" font-size="12.5"
          font-weight="700" letter-spacing="2" fill="#fff">${d.code}</text>
    <text x="187" y="352" font-family="'Zen Maru Gothic',sans-serif" font-size="11"
          font-weight="700" fill="${deep}">生息エリア：${g.name}</text>`;

  /* 4軸バー：detailの実%で描く。勝ち側の文字はオーカー、負け側は薄く */
  const bars = d.detail.map((ax, i) => {
    const y = 384 + i * 20;
    const pct = ax.aWins ? ax.aPct : ax.bPct;
    const wFill = 180 * pct / 100;
    return `
      <text x="58" y="${y + 3.5}" text-anchor="end" font-family="'Zen Maru Gothic',sans-serif" font-size="7.6"
            font-weight="${ax.aWins ? 900 : 500}" fill="${ax.aWins ? "#1E3A31" : "#AFBDB6"}">${ax.aName}</text>
      <text x="69" y="${y + 4}" text-anchor="middle" font-family="Outfit,sans-serif" font-size="10.5"
            font-weight="700" fill="${ax.aWins ? SHARE_SUN : "#C6D0CA"}">${ax.a}</text>
      <rect x="80" y="${y - 2.75}" width="180" height="5.5" rx="2.75" fill="#FFFFFF" opacity=".65"/>
      <rect x="${ax.aWins ? 80 : 80 + 180 - wFill}" y="${y - 2.75}" width="${wFill}" height="5.5" rx="2.75"
            fill="${ax.aWins ? "#1E3A31" : "#46708F"}"/>
      <text x="271" y="${y + 4}" text-anchor="middle" font-family="Outfit,sans-serif" font-size="10.5"
            font-weight="700" fill="${ax.aWins ? "#C6D0CA" : SHARE_SUN}">${ax.b}</text>
      <text x="282" y="${y + 3.5}" font-family="'Zen Maru Gothic',sans-serif" font-size="7.6"
            font-weight="${ax.aWins ? 500 : 900}" fill="${ax.aWins ? "#AFBDB6" : "#1E3A31"}">${ax.bName}</text>`;
  }).join("");

  /* 一緒に登ると面白い相手：結果画面と同じ相手を画像＋名前だけで */
  const matchCells = findMatches(d.code, d.secret).map((m, i) => {
    const cx = 76 + i * 104;
    const mc = CHARACTERS[m.code];
    return `
      <circle cx="${cx}" cy="536" r="34" fill="#FFFFFF" opacity=".85"/>
      <g transform="translate(${cx - 27},509) scale(.3375)">${svgInner(characterSVG(m.code, "", false))}</g>
      <text x="${cx}" y="586" text-anchor="middle" font-family="'Zen Maru Gothic',sans-serif"
            font-size="10.5" font-weight="700" fill="#1E3A31">${mc ? mc.animal : m.code}</text>`;
  }).join("");
  const matches = `
    <text x="180" y="490" text-anchor="middle" font-family="'Zen Maru Gothic',sans-serif"
          font-size="12.5" font-weight="900" fill="#1E3A31">一緒に登ると面白い相手</text>
    ${matchCells}`;

  const footer = `
    <text x="180" y="606" text-anchor="middle" font-family="Outfit,sans-serif" font-weight="500"
          font-size="10.5" letter-spacing="1" fill="${deep}">${SHARE_DOMAIN}</text>
    <text x="180" y="622" text-anchor="middle" font-family="'Zen Maru Gothic',sans-serif"
          font-size="9.5" fill="${deep}" opacity=".8">${SHARE_HASHTAG}</text>`;

  return `<svg viewBox="0 0 360 640" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="シェア用画像">
    <rect width="360" height="640" fill="${g.circle}"/>
    ${ridge}${header}${sparkles}${charPart}${ribbon}${namePart}${chip}${bars}${matches}${footer}
  </svg>`;
}

/* =========================================================
   シェア用画像のPNG生成（1080×1920）
   SVGにWebフォントを埋め込んでからcanvasに描く。
   日本語フォントは使う文字だけをGoogle Fontsから取り寄せる（text=）。
   取り寄せに失敗しても、代替フォントでPNG自体は作れるようにする。
   ========================================================= */
let sharePngCache = null;   // { key, blob }

/* 画像内で使う文字を集める（フォントのサブセット指定用） */
function collectShareChars(d) {
  const parts = [
    "16 TYPES OF HIKERS", "あなたの登山タイプは", "SECRET！",
    d.animal, d.typeName, "「" + d.copy + "」", d.code, "生息エリア：" + d.g.name,
    "一緒に登ると面白い相手", SHARE_DOMAIN, SHARE_HASHTAG,
  ];
  d.detail.forEach((ax) => parts.push(ax.aName, ax.bName, ax.a, ax.b));
  findMatches(d.code, d.secret).forEach((m) => {
    const mc = CHARACTERS[m.code];
    parts.push(mc ? mc.animal : m.code);
  });
  return [...new Set(parts.join("").split(""))].join("");
}

/* Google Fontsから、使う文字だけのフォントを取り寄せてCSSにする */
async function buildShareFontCSS(d) {
  const text = encodeURIComponent(collectShareChars(d));
  const cssUrl =
    "https://fonts.googleapis.com/css2" +
    "?family=Zen+Maru+Gothic:wght@400;500;700;900" +
    "&family=Outfit:wght@500;700" +
    `&text=${text}&display=swap`;
  let css = await (await fetch(cssUrl)).text();

  // CSS内のフォントURLを、中身ごと埋め込んだdata:URLに置き換える
  const urls = [...new Set([...css.matchAll(/url\((https:[^)]+)\)/g)].map((m) => m[1]))];
  for (const u of urls) {
    const buf = await (await fetch(u)).arrayBuffer();
    let bin = "";
    const bytes = new Uint8Array(buf);
    for (let i = 0; i < bytes.length; i += 0x8000) {
      bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    }
    css = css.split(u).join(`data:font/woff2;base64,${btoa(bin)}`);
  }
  return css;
}

/* SVG → 1080×1920 のPNG Blob */
async function makeSharePNG(d) {
  let fontCSS = "";
  try {
    fontCSS = await buildShareFontCSS(d);
  } catch (e) {
    fontCSS = "";   // フォントが取れなくても代替フォントで続行する
  }

  let svg = shareImageSVG(d);
  svg = svg.replace(
    "<svg ",
    `<svg width="1080" height="1920" `
  );
  if (fontCSS) {
    svg = svg.replace(/(<svg[^>]*>)/, `$1<style>${fontCSS.replace(/</g, "")}</style>`);
  }

  const url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml;charset=utf-8" }));
  try {
    const img = new Image();
    img.decoding = "async";
    await new Promise((ok, ng) => {
      img.onload = ok;
      img.onerror = () => ng(new Error("svg load error"));
      img.src = url;
    });
    const canvas = document.createElement("canvas");
    canvas.width = 1080;
    canvas.height = 1920;
    canvas.getContext("2d").drawImage(img, 0, 0, 1080, 1920);
    return await new Promise((ok, ng) =>
      canvas.toBlob((b) => (b ? ok(b) : ng(new Error("png error"))), "image/png"));
  } finally {
    URL.revokeObjectURL(url);
  }
}

/* 生成結果は結果ごとに1回だけ作って使い回す */
async function getSharePNG(d) {
  const key = d.code + (d.secret ? ":" + d.secret.id : "");
  if (sharePngCache && sharePngCache.key === key) return sharePngCache.blob;
  const blob = await makeSharePNG(d);
  sharePngCache = { key, blob };
  return blob;
}

function downloadBlob(blob, name) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

/* 結果に合わせてモーダルの中身を用意する（showResultから呼ばれる） */
let shareData = null;   // いまの結果。PNG生成やボタンから参照する
// シークレットキャラの匂わせシルエット用：動物本体だけを抜き出したデータ
// （月・星・止まり木などの背景演出は除いてある。characters.jsのSECRET_CHARACTERSと対で管理）
const TEASE_SILHOUETTES = {
  bat: `
    <path d="M66 34 Q40 30 20 44 Q8 54 8 70 Q24 58 42 60 Q34 72 34 86
             Q54 76 66 58 Z" fill="#4A3E48"/>
    <path d="M94 34 Q120 30 140 44 Q152 54 152 70 Q136 58 118 60 Q126 72 126 86
             Q106 76 94 58 Z" fill="#4A3E48"/>
    <ellipse cx="80" cy="56" rx="22" ry="25" fill="#5C4E5A"/>
    <ellipse cx="80" cy="50" rx="13" ry="16" fill="#7A6A76"/>
    <path d="M58 118 Q52 142 68 134 Q66 122 70 112 Z" fill="#5C4E5A"/>
    <path d="M102 118 Q108 142 92 134 Q94 122 90 112 Z" fill="#5C4E5A"/>
    <circle cx="80" cy="98" r="25" fill="#6A5A66"/>
    <ellipse cx="80" cy="86" rx="12" ry="9" fill="#8A7684"/>
    <path d="M56 112 Q80 124 104 112 L102 105 Q80 116 58 105 Z" fill="#3E4A52"/>
    <rect x="69" y="114" width="22" height="15" rx="4" fill="#4E6B7A"/>
    <circle cx="80" cy="121.5" r="5.2" fill="#FFE9A8"/>`,
  ptarmigan: `
    <ellipse cx="110" cy="110" rx="18" ry="9" fill="#E4EBF0" transform="rotate(20 110 110)"/>
    <circle cx="80" cy="101" r="33" fill="#FDFEFE"/>
    <ellipse cx="80" cy="108" rx="21" ry="20" fill="#FFFFFF"/>
    <ellipse cx="54" cy="102" rx="11" ry="17" fill="#F0F5F8" transform="rotate(-8 54 102)"/>
    <ellipse cx="106" cy="102" rx="11" ry="17" fill="#F0F5F8" transform="rotate(8 106 102)"/>
    <ellipse cx="70" cy="128" rx="10" ry="10" fill="#F2F7FA"/>
    <ellipse cx="90" cy="128" rx="10" ry="10" fill="#F2F7FA"/>
    <circle cx="80" cy="58" r="27" fill="#FFFFFF"/>`,
};
function renderTeaseSilhouettes() {
  const box = document.getElementById("tease-silhouettes");
  if (!box) return;
  box.innerHTML =
    `<svg viewBox="0 0 160 160" class="char">${TEASE_SILHOUETTES.bat}</svg>` +
    `<svg viewBox="0 0 160 160" class="char">${TEASE_SILHOUETTES.ptarmigan}</svg>` +
    `<svg class="spark" viewBox="0 0 24 24"><path fill="currentColor" d="M12 2l2.2 6.8H21l-5.6 4.1L17.6 20 12 15.8 6.4 20l2.2-7.1L3 8.8h6.8z"/></svg>`;
}

function fillShareModal(d) {
  shareData = d;
  sharePngCache = null;   // 結果が変わったら作り直す
  const pv = $("#smodal-pv");
  if (!pv) return;
  pv.innerHTML = shareImageSVG(d);
  renderTeaseSilhouettes();

  // X：文章にURLを書き込み済みなので、textだけを渡す（urlを別で足すと二重に付くため）
  $("#sm-x").href =
    "https://twitter.com/intent/tweet?text=" + encodeURIComponent(d.textX);

  // LINE：lineit/share の text は一部環境（iPhone Safariなど）で無視され、
  // urlだけが送られてしまう既知の不具合があるため、公式のテキスト共有スキームを使う。
  // こちらは常に指定した文章がそのまま送られる
  $("#sm-line").href =
    "https://line.me/R/msg/text/?" + encodeURIComponent(d.textLine);

  $("#sm-copy").dataset.url = withUtm(d.shareUrl, "copy_link", "share_result");
}

/* 開閉 */
const smodal = document.getElementById("smodal");
function openShareModal() {
  if (!smodal) return;
  smodal.hidden = false;
  // hidden解除の直後だとtransitionが飛ぶので、描画を1フレーム待つ
  requestAnimationFrame(() => requestAnimationFrame(() => smodal.classList.add("open")));
  document.body.style.overflow = "hidden";
  track("share_open", {});
}
function closeShareModal() {
  if (!smodal) return;
  smodal.classList.remove("open");
  document.body.style.overflow = "";
  setTimeout(() => { smodal.hidden = true; }, 260);
}
if (smodal) {
  document.getElementById("btn-cta").addEventListener("click", openShareModal);
  document.getElementById("smodal-veil").addEventListener("click", closeShareModal);
  document.getElementById("smodal-close").addEventListener("click", closeShareModal);
  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !smodal.hidden) closeShareModal();
  });
}

/* トースト */
let toastTimer = null;
function toast(msg) {
  const t = document.getElementById("toast");
  if (!t) return;
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove("show"), 1800);
}

/* リンクをコピー */
const smCopy = document.getElementById("sm-copy");
if (smCopy) smCopy.addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(smCopy.dataset.url || SITE_URL);
    toast("リンクをコピーしました");
  } catch {
    toast("コピーできませんでした");
  }
  track("share_click", { channel: "copy", placement: "modal" });
});

/* 画像を用意する（ダウンロード・Instagram共通） */
let shareBusy = false;   // 生成中の連打よけ
async function saveShareImage() {
  if (!shareData || shareBusy) return false;
  shareBusy = true;
  toast("画像を作成しています…");
  try {
    const blob = await getSharePNG(shareData);
    const name = `yamatype_${shareData.code}${shareData.secret ? "_secret" : ""}.png`;
    downloadBlob(blob, name);
    return true;
  } catch (e) {
    toast("画像を作成できませんでした");
    return false;
  } finally {
    shareBusy = false;
  }
}

/* 画像を表示：別タブでPNGをそのまま開く（iPhoneはダウンロードよりキャプチャの方が速いため）
   ポップアップブロック対策として、タブ自体はクリックした瞬間（awaitの前）に開いておき、
   画像ができてからそこにURLを差し込む */
async function showShareImage() {
  if (!shareData || shareBusy) return false;
  const win = window.open("", "_blank");
  shareBusy = true;
  toast("画像を作成しています…");
  try {
    const blob = await getSharePNG(shareData);
    const url = URL.createObjectURL(blob);
    if (win) {
      win.location.href = url;
    } else {
      // ポップアップがブロックされた場合はダウンロードにフォールバック
      const name = `yamatype_${shareData.code}${shareData.secret ? "_secret" : ""}.png`;
      downloadBlob(blob, name);
      toast("ポップアップがブロックされたため保存しました");
    }
    return true;
  } catch (e) {
    if (win) win.close();
    toast("画像を作成できませんでした");
    return false;
  } finally {
    shareBusy = false;
  }
}

const smDl = document.getElementById("sm-dl");
if (smDl) smDl.addEventListener("click", async () => {
  await showShareImage();
  track("share_click", { channel: "view_image", placement: "modal" });
});

/* Instagram：直接投稿はできないので、画像を保存してからアプリを開く */
const smIg = document.getElementById("sm-ig");
if (smIg) smIg.addEventListener("click", async () => {
  const ok = await saveShareImage();
  if (ok) {
    const mobile = /iPhone|iPad|Android/i.test(navigator.userAgent);
    if (mobile) {
      toast("画像を保存しました。Instagramを開きます");
      setTimeout(() => { location.href = "instagram://story-camera"; }, 900);
    } else {
      toast("画像を保存しました。Instagramアプリから投稿してください");
    }
  }
  track("share_click", { channel: "instagram", placement: "modal" });
});

/* シェアが押されたときの計測（大ボタンはshare_openで計測） */
[
  ["sm-x", "x", "modal"],
  ["sm-line", "line", "modal"],
].forEach(([id, channel, placement]) => {
  const el = document.getElementById(id);
  if (el) el.addEventListener("click", () => {
    track("share_click", { channel, placement });
  });
});
