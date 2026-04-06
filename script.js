/**
 * script.js – スケジュールデータの取得・表示
 *
 * データソースの優先順位:
 *   1. config.js の SHEETS_CSV_URL が設定されている → Google スプレッドシートから取得
 *   2. 未設定 → data.json のサンプルデータを使用
 *
 * スプレッドシートの列順は自動検出します（ヘッダー行を読み取る）。
 * Google フォームで自動追加される「Timestamp」列にも対応しています。
 *
 * 対応しているヘッダー名（どの列にあっても自動で認識）:
 *   日付, date       → 日付
 *   曜日, day        → 曜日
 *   時間, time       → 開演時間
 *   会場, venue      → 会場
 *   出演者, members  → 出演メンバー
 *   チャージ, charge → チャージ
 *   備考, note       → 備考
 */

// ── ナビゲーション（ハンバーガーメニュー） ────────────────
document.getElementById("navToggle").addEventListener("click", () => {
  document.getElementById("navLinks").classList.toggle("open");
});
document.querySelectorAll(".nav-links a").forEach(link => {
  link.addEventListener("click", () => {
    document.getElementById("navLinks").classList.remove("open");
  });
});

// ── ヘッダー名と内部フィールド名のマッピング ─────────────
const HEADER_MAP = {
  "日付":    "date",
  "date":    "date",
  "曜日":    "day",
  "day":     "day",
  "時間":    "time",
  "time":    "time",
  "開演時間": "time",
  "会場":    "venue",
  "venue":   "venue",
  "出演者":   "members",
  "出演メンバー": "members",
  "members": "members",
  "チャージ": "charge",
  "charge":  "charge",
  "料金":    "charge",
  "備考":    "note",
  "note":    "note",
};

// ── データ取得 ────────────────────────────────────────────
async function loadSchedule() {
  try {
    let events;

    if (CONFIG.SHEETS_CSV_URL && CONFIG.SHEETS_CSV_URL.trim() !== "") {
      events = await fetchFromSheets(CONFIG.SHEETS_CSV_URL.trim());
    } else {
      const res = await fetch("data.json");
      if (!res.ok) throw new Error("data.json の読み込みに失敗しました");
      events = await res.json();
    }

    renderSchedule(events);
  } catch (err) {
    console.error(err);
    document.getElementById("loading").textContent = "スケジュールの読み込みに失敗しました。";
  }
}

// Google スプレッドシート（公開 CSV）からデータ取得
async function fetchFromSheets(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error("スプレッドシートの取得に失敗しました");
  const text = await res.text();
  return parseCSV(text);
}

// CSV 全体を行×列の2次元配列にパース（改行を含む quoted フィールドに対応）
function parseCSVRows(csv) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < csv.length; i++) {
    const ch = csv[i];
    const next = csv[i + 1];

    if (inQuotes) {
      if (ch === '"' && next === '"') {
        field += '"'; i++;           // "" → エスケープされた "
      } else if (ch === '"') {
        inQuotes = false;            // quoted フィールドの終端
      } else {
        field += ch;                 // quoted 内の文字（改行も含む）
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ',') {
        row.push(field); field = ""; // フィールド区切り
      } else if (ch === '\r' && next === '\n') {
        row.push(field); rows.push(row); row = []; field = ""; i++; // CRLF 行区切り
      } else if (ch === '\n') {
        row.push(field); rows.push(row); row = []; field = "";       // LF 行区切り
      } else {
        field += ch;
      }
    }
  }
  // 末尾の行
  if (field || row.length > 0) { row.push(field); rows.push(row); }
  return rows;
}

// CSV → イベントオブジェクト配列（ヘッダー行で列を自動検出）
function parseCSV(csv) {
  const rows = parseCSVRows(csv.trim());
  if (rows.length < 2) return [];

  // 1行目: ヘッダー行を解析して列インデックスを特定
  const headers = rows[0].map(h => h.trim());
  const colIndex = {};  // フィールド名 → 列インデックス

  headers.forEach((h, i) => {
    const normalized = h.replace(/\s/g, "").toLowerCase();
    for (const [key, field] of Object.entries(HEADER_MAP)) {
      if (normalized === key.toLowerCase().replace(/\s/g, "")) {
        if (colIndex[field] === undefined) colIndex[field] = i;
      }
    }
  });

  // 2行目以降: データ行をイベントオブジェクトに変換
  return rows.slice(1).map(cols => {
    const get = field => (colIndex[field] !== undefined ? (cols[colIndex[field]] || "").trim() : "");
    return {
      date:    get("date"),
      day:     get("day"),
      time:    get("time"),
      venue:   get("venue"),
      members: get("members"),
      charge:  get("charge"),
      note:    get("note"),
    };
  }).filter(e => e.date !== ""); // 日付が空の行を除外
}

// ── 日付ユーティリティ ────────────────────────────────────
function parseDate(dateStr) {
  if (!dateStr) return new Date(NaN);
  // "2026-04-11", "2026/04/11", "2026/4/11", "4/11/2026" などに対応
  const s = dateStr.trim();

  // YYYY-MM-DD または YYYY/MM/DD または YYYY/M/D
  if (/^\d{4}[-\/]\d{1,2}[-\/]\d{1,2}$/.test(s)) {
    return new Date(s.replace(/\//g, "-"));
  }
  // M/D/YYYY（Google フォームの一部ロケール）
  const mdyMatch = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (mdyMatch) {
    const [, m, d, y] = mdyMatch;
    return new Date(`${y}-${m.padStart(2,"0")}-${d.padStart(2,"0")}`);
  }
  // それ以外はそのまま Date に渡す
  return new Date(s);
}

function isUpcoming(dateStr) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = parseDate(dateStr);
  return !isNaN(d) && d >= today;
}

function getMonthLabel(dateStr) {
  const d = parseDate(dateStr);
  if (isNaN(d)) return "不明";
  return d.toLocaleDateString(CONFIG.LOCALE, { year: "numeric", month: "long" });
}

function formatDate(dateStr, dayStr) {
  const d = parseDate(dateStr);
  if (isNaN(d)) return dateStr;
  const m = d.getMonth() + 1;
  const day = d.getDate();
  const dayLabel = dayStr || ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"][d.getDay()];
  return `${m}/${day} (${dayLabel})`;
}

// ── レンダリング ──────────────────────────────────────────
function renderSchedule(events) {
  document.getElementById("loading").style.display = "none";

  const upcoming = events.filter(e => isUpcoming(e.date))
                         .sort((a, b) => parseDate(a.date) - parseDate(b.date));
  const past     = events.filter(e => !isUpcoming(e.date) && !isNaN(parseDate(e.date)))
                         .sort((a, b) => parseDate(b.date) - parseDate(a.date));

  if (upcoming.length === 0) {
    document.getElementById("no-events").style.display = "block";
  } else {
    renderGrouped(upcoming, "upcoming-container", renderEventEntry);
  }

  renderGrouped(past, "past-container", renderPastEvent, true);
}

// 月ごとにグループ化して描画
function renderGrouped(events, containerId, renderFn, isPast = false) {
  const container = document.getElementById(containerId);
  const groups = {};

  events.forEach(e => {
    const label = getMonthLabel(e.date);
    if (!groups[label]) groups[label] = [];
    groups[label].push(e);
  });

  Object.entries(groups).forEach(([monthLabel, monthEvents]) => {
    const groupEl = document.createElement("div");
    groupEl.className = isPast ? "past-month-group" : "month-group";

    const labelEl = document.createElement("div");
    labelEl.className = isPast ? "past-month-label" : "month-label";
    labelEl.textContent = monthLabel;
    groupEl.appendChild(labelEl);

    monthEvents.forEach(e => groupEl.appendChild(renderFn(e)));
    container.appendChild(groupEl);
  });
}

// 今後のライブ 1 件分の HTML 要素
function renderEventEntry(event) {
  const el = document.createElement("div");
  el.className = "event-entry";
  // 日付 + 時間（1行目）
  const dateTime = `${formatDate(event.date, event.day)}${event.time ? `<span style="font-weight:400;font-size:13px;"> ${escHtml(event.time)} start</span>` : ""}`;
  // 出演者の改行を <br> に変換
  const membersHtml = event.members
    ? event.members.split(/\n/).map(escHtml).join("<br>")
    : "";
  el.innerHTML = `
    <div class="event-date-time">${dateTime}</div>
    ${event.venue   ? `<div class="event-venue">${escHtml(event.venue)}</div>` : ""}
    ${membersHtml   ? `<div class="event-members">${membersHtml}</div>`        : ""}
    ${event.charge  ? `<div class="event-charge">${escHtml(event.charge)}</div>`  : ""}
    ${event.note    ? `<div class="event-note">${escHtml(event.note)}</div>`      : ""}
  `;
  return el;
}

// 過去のライブ 1 件分の HTML 要素
function renderPastEvent(event) {
  const el = document.createElement("div");
  el.className = "past-event";
  const dateTime = `${formatDate(event.date, event.day)}${event.time ? " " + event.time + " start" : ""}`;
  let text = escHtml(dateTime);
  if (event.venue)   text += ` / ${escHtml(event.venue)}`;
  if (event.members) text += ` / ${escHtml(event.members)}`;
  el.innerHTML = text;
  return el;
}

// XSS 対策の HTML エスケープ
function escHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// ── 起動 ─────────────────────────────────────────────────
loadSchedule();
