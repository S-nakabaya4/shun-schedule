/**
 * =====================================================
 * config.js – サイト設定ファイル
 * =====================================================
 *
 * Google スプレッドシートを使う場合の設定手順:
 *
 * 1. Google スプレッドシートを開く
 * 2. メニュー「ファイル」→「共有」→「ウェブに公開」を選択
 * 3. 「シート全体」を「カンマ区切り値 (.csv)」で公開
 * 4. 表示された URL を下の SHEETS_CSV_URL に貼り付ける
 *
 * 例: https://docs.google.com/spreadsheets/d/e/XXXXX/pub?output=csv
 *
 * スプレッドシートの列構成（1行目はヘッダー行にしてください）:
 *   A: 日付      例: 2026-04-11
 *   B: 曜日      例: Sat
 *   C: 開演時間  例: 19:30
 *   D: 会場      例: Pit Inn -新宿-
 *   E: 出演者    例: Shunya Nakabayashi (as), Taro Yamada (p)
 *   F: チャージ  例: ¥2,500
 *   G: 備考      例: ワンドリンク付き（空欄可）
 *
 * ★ SHEETS_CSV_URL を空欄のままにすると、data.json のサンプルデータが表示されます
 */

const CONFIG = {
  // Google スプレッドシートの公開 CSV URL（設定するまでは空のまま）
  SHEETS_CSV_URL: "https://docs.google.com/spreadsheets/d/e/2PACX-1vRLWS71ncomeCEqiLj8Hber0THWHTc5O_-3dSIqlbEvi-BD_jRejN827wiz19DOgqyAVvxZROtzBB93/pubhtml?gid=1494244772&single=true",

  // サイトタイトル
  SITE_TITLE: "Shunya Nakabayashi",

  // 日付のロケール表示設定
  LOCALE: "ja-JP",
};
