/**
 * DigitalWell CLI
 * v1: stats + limits
 */

const path = require("path");
const Database = require("better-sqlite3");
const auth = require('../security/auth');
const keychain = require('../security/keychain');
const { promptPassword } = require('./prompts/password');

const APP_SUPPORT_DIR = path.join(
  process.env.HOME,
  "Library",
  "Application Support",
  "DigitalWell"
);

const DB_PATH = path.join(APP_SUPPORT_DIR, "digitalwell.db");

// ---------- helpers ----------

function printUsage() {
  console.log(`
Usage:
  dw stats today

Limits:
  dw limit <domain> <time>      Set daily limit (e.g. 20s, 10m, 2h)
  dw limit list                 List all limits
  dw limit remove <domain>      Remove limit
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

function parseTime(input) {
  const match = input.match(/^(\d+)(s|m|h)$/i);
  if (!match) return null;

  const value = parseInt(match[1], 10);
  const unit = match[2].toLowerCase();

  if (unit === "s") return value;
  if (unit === "m") return value * 60;
  if (unit === "h") return value * 3600;

  return null;
}

// ---------- stats ----------

function statsToday() {
  const db = new Database(DB_PATH, { readonly: true });
  const today = new Date().toISOString().slice(0, 10);

  const rows = db
    .prepare(
      `
    SELECT domain, SUM(duration_sec) AS total_sec
    FROM sessions
    WHERE date(start_time) = ?
    GROUP BY domain
    ORDER BY total_sec DESC
  `
    )
    .all(today);

  if (rows.length === 0) {
    console.log("No usage data for today.");
    return;
  }

  console.log("\nWebsite Usage (Today)\n");

  rows.forEach((row) => {
    console.log(row.domain.padEnd(25) + formatTime(row.total_sec));
  });

  console.log("");
}

// ---------- limits ----------

function setLimit(domain, timeStr) {
  const seconds = parseTime(timeStr);
  if (!seconds || seconds <= 0) {
    console.error("Invalid time format. Use s, m, or h (e.g. 20s, 10m, 2h)");
    return;
  }

  const db = new Database(DB_PATH);
  db.prepare(
    `
    INSERT INTO limits (domain, daily_limit_sec)
    VALUES (?, ?)
    ON CONFLICT(domain)
    DO UPDATE SET daily_limit_sec = excluded.daily_limit_sec
  `
  ).run(domain, seconds);

  console.log(`Limit set: ${domain} → ${formatTime(seconds)}`);
}

function listLimits() {
  const db = new Database(DB_PATH, { readonly: true });

  const rows = db
    .prepare(
      `
    SELECT domain, daily_limit_sec
    FROM limits
    ORDER BY domain
  `
    )
    .all();

  if (rows.length === 0) {
    console.log("No limits set.");
    return;
  }

  console.log("\nDaily Limits\n");

  rows.forEach((row) => {
    console.log(row.domain.padEnd(25) + formatTime(row.daily_limit_sec));
  });

  console.log("");
}

function limitStatus() {
  const db = new Database(DB_PATH, { readonly: true });
  const today = new Date().toISOString().slice(0, 10);

  const rows = db
    .prepare(
      `
    SELECT
      l.domain,
      l.daily_limit_sec AS limit_sec,
      IFNULL(SUM(s.duration_sec), 0) AS used_sec
    FROM limits l
    LEFT JOIN sessions s
      ON l.domain = s.domain
     AND date(s.start_time) = ?
    GROUP BY l.domain
    ORDER BY l.domain
  `
    )
    .all(today);

  if (rows.length === 0) {
    console.log("No limits set.");
    return;
  }

  console.log("\nLimit Status (Today)\n");

  rows.forEach((row) => {
    const remaining = row.limit_sec - row.used_sec;

    if (remaining <= 0) {
      console.log(
        `${row.domain.padEnd(25)} ❌ exceeded by ${formatTime(-remaining)}`
      );
    } else {
      console.log(
        `${row.domain.padEnd(25)} ✅ remaining ${formatTime(remaining)}`
      );
    }
  });

  console.log("");
}

function removeLimit(domain) {
  const db = new Database(DB_PATH);
  const res = db
    .prepare(
      `
    DELETE FROM limits WHERE domain = ?
  `
    )
    .run(domain);

  if (res.changes === 0) {
    console.log(`No limit found for ${domain}`);
  } else {
    console.log(`Limit removed for ${domain}`);
  }
}

async function setParentalPassword() {
  const pwd1 = await promptPassword('Set parental password: ');
  const pwd2 = await promptPassword('Confirm password: ');

  if (!pwd1 || pwd1 !== pwd2) {
    console.log('Passwords do not match.');
    return;
  }

  keychain.setPassword(pwd1);
  console.log('Parental password set.');
}

async function requireAuth() {
  // 🔐 If no password exists, force setup
  if (!keychain.passwordExists()) {
    console.log('No parental password found.');
    console.log('Please set a parental password.\n');

    const pwd1 = await promptPassword('Set parental password: ');
    const pwd2 = await promptPassword('Confirm password: ');

    if (!pwd1 || pwd1 !== pwd2) {
      console.log('Passwords do not match.');
      process.exit(1);
    }

    keychain.setPassword(pwd1);
    console.log('Parental password set.\n');
    return;
  }

  // 🔑 Password exists → verify
  const input = await promptPassword();
  if (!auth.verifyPassword(input)) {
    console.log('Incorrect password.');
    process.exit(1);
  }
}


// ---------- main ----------

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    printUsage();
    return;
  }

  if (args[0] === 'auth' && args[1] === 'set') {
    await setParentalPassword();
    return;
  }


  if (args[0] === "stats" && args[1] === "today") {
    statsToday();
    return;
  }

  if (args[0] === "limit") {
    if (args[1] === "list") {
      listLimits();
      return;
    }

    if (args[1] === 'remove' && args[2]) {
      await requireAuth();
      removeLimit(args[2]);
      return;
    }


    if (args[1] === "status") {
      limitStatus();
      return;
    }

    if (args.length === 3) {
      await requireAuth();
      setLimit(args[1], args[2]);
      return;
    }

    printUsage();
    return;
  }

  printUsage();
}

main();
