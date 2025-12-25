const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const APP_SUPPORT_DIR = path.join(
  process.env.HOME,
  'Library',
  'Application Support',
  'DigitalWell'
);

const DB_PATH = path.join(APP_SUPPORT_DIR, 'digitalwell.db');

let db;

function init() {
  if (!fs.existsSync(APP_SUPPORT_DIR)) {
    fs.mkdirSync(APP_SUPPORT_DIR, { recursive: true });
  }

  db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');

  // sessions table
  db.prepare(`
    CREATE TABLE IF NOT EXISTS sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      domain TEXT NOT NULL,
      browser TEXT NOT NULL,
      start_time TEXT NOT NULL,
      end_time TEXT NOT NULL,
      duration_sec INTEGER NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `).run();

  // limits table
  db.prepare(`
    CREATE TABLE IF NOT EXISTS limits (
      domain TEXT PRIMARY KEY,
      daily_limit_sec INTEGER NOT NULL
    )
  `).run();
}

// 🔥 MUST be called at load time
init();

function insertSession(data) {
  db.prepare(`
    INSERT INTO sessions
    (domain, browser, start_time, end_time, duration_sec)
    VALUES (?, ?, ?, ?, ?)
  `).run(
    data.domain,
    data.browser,
    data.startTime.toISOString(),
    data.endTime.toISOString(),
    data.durationSec
  );
}

function setDailyLimit(domain, seconds) {
  db.prepare(`
    INSERT INTO limits (domain, daily_limit_sec)
    VALUES (?, ?)
    ON CONFLICT(domain)
    DO UPDATE SET daily_limit_sec = excluded.daily_limit_sec
  `).run(domain, seconds);
}

function getDailyLimit(domain) {
  const row = db.prepare(
    `SELECT daily_limit_sec FROM limits WHERE domain = ?`
  ).get(domain);
  return row ? row.daily_limit_sec : null;
}

function getTodayUsage(domain) {
  const today = new Date().toISOString().slice(0, 10);
  const row = db.prepare(`
    SELECT SUM(duration_sec) AS total
    FROM sessions
    WHERE domain = ?
      AND date(start_time) = ?
  `).get(domain, today);
  return row?.total || 0;
}

module.exports = {
  insertSession,
  setDailyLimit,
  getDailyLimit,
  getTodayUsage
};
