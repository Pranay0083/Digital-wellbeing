/**
 * DigitalWell CLI
 * v1: stats only
 */

const path = require('path');
const Database = require('better-sqlite3');

const APP_SUPPORT_DIR = path.join(
  process.env.HOME,
  'Library',
  'Application Support',
  'DigitalWell'
);

const DB_PATH = path.join(APP_SUPPORT_DIR, 'digitalwell.db');

function printUsage() {
  console.log(`
Usage:
  dw stats today
`);
}

function formatTime(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;

  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

function statsToday() {
  const db = new Database(DB_PATH, { readonly: true });

  const today = new Date().toISOString().slice(0, 10);

  const rows = db.prepare(`
    SELECT domain, SUM(duration_sec) AS total_sec
    FROM sessions
    WHERE date(start_time) = ?
    GROUP BY domain
    ORDER BY total_sec DESC
  `).all(today);

  if (rows.length === 0) {
    console.log('No usage data for today.');
    return;
  }

  console.log('\nWebsite Usage (Today)\n');

  rows.forEach(row => {
    console.log(
      row.domain.padEnd(25) +
      formatTime(row.total_sec)
    );
  });

  console.log('');
}

function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    printUsage();
    return;
  }

  if (args[0] === 'stats' && args[1] === 'today') {
    statsToday();
    return;
  }

  printUsage();
}

main();
