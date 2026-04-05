/**
 * script.js – スケジュールデータの取得・表示
 *
 * データソースの優先順位:
 *   1. config.js の SHEETS_CSV_URL が設定されている → Google スプレッドシートから取得
 *   2. 未設定 → data.json のサンプルデータを使用
 */

// ── ナビゲーション（ハンバーガーメニュー） ────────────────
document.getElementById("navToggle").addEventListener("click", () => {
  document.getElementById("navLinks").classList.toggle("open");
});
// メニュー項目クリック時に閉じる
document.querySelectorAll(".nav-links a").forEach(link => {
  link.addEventListener("click", () => {
    document.getElementById("navLinks").classList.remove("open");
  });
});

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

// CSV → イベントオブジェクト配列
function parseCSV(csv) {
  const lines = csv.trim().split("\n");
  // 1行目はヘッダーなのでスキップ
  return lines.slice(1).map(line => {
    const cols = splitCSVLine(line);
    return {
      date:    (cols[0] || "").trim(),
      day:     (cols[1] || "").trim(),
      time:    (cols[2] || "").trim(),
      venue:   (cols[3] || "").trim(),
      members: (cols[4] || "").trim(),
      charge:  (cols[5] || "").trim(),
      note:    (cols[6] || "").trim(),
    };
  }).filter(e => e.date); // 日付が空の行は除外
}

// CSV の 1 行をカンマ分割（ダブルクォート対応）
function splitCSVLine(line) {
  const result = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === "," && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  result.push(current);
  return result;
}

// ── 日付ユーティリティ ────────────────────────────────────
function parseDate(dateStr) {
  // "2026-04-11" または "2026/04/11" 形式を受け付ける
  return new Date(dateStr.replace(/\//g, "-"));
}

function isUpcoming(dateStr) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return parseDate(dateStr) >= today;
}

function getMonthLabel(dateStr) {
  const d = parseDate(dateStr);
  return d.toLocaleDateString(CONFIG.LOCALE, { year: "numeric", month: "long" });
}

function formatDate(dateStr, dayStr) {
  const d = parseDate(dateStr);
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
  const past     = events.filter(e => !isUpcoming(e.date))
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

    monthEvents.forEach(e => {
      groupEl.appendChild(renderFn(e));
    });

    container.appendChild(groupEl);
  });
}

// 今後のライブ 1 件分のHTML要素
function renderEventEntry(event) {
  const el = document.createElement("div");
  el.className = "event-entry";

  const dateTime = `${formatDate(event.date, event.day)} ${event.time} start`;
  const parts = [dateTime, event.venue].filter(Boolean);

  el.innerHTML = `
    <div class="event-main">
      <span class="event-date-time">${escHtml(dateTime)}</span>
      ${event.venue ? `<span class="event-venue"> / ${escHtml(event.venue)}</span>` : ""}
    </div>
    ${event.members ? `<div class="event-members">${escHtml(event.members)}</div>` : ""}
    ${event.charge  ? `<div class="event-charge">${escHtml(event.charge)}</div>` : ""}
    ${event.note    ? `<div class="event-note">${escHtml(event.note)}</div>` : ""}
  `;
  return el;
}

// 過去のライブ 1 件分のHTML要素
function renderPastEvent(event) {
  const el = document.createElement("div");
  el.className = "past-event";
  const dateTime = `${formatDate(event.date, event.day)} ${event.time} start`;
  let text = escHtml(dateTime);
  if (event.venue) text += ` / ${escHtml(event.venue)}`;
  if (event.members) text += ` / ${escHtml(event.members)}`;
  el.innerHTML = text;
  return el;
}

// XSS対策のHTMLエスケープ
function escHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// ── 起動 ─────────────────────────────────────────────────
loadSchedule();
