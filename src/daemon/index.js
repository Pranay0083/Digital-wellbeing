/**
 * DigitalWell Daemon - Core Event Loop
 * macOS only (v1)
 */

const { getActiveApp } = require("./tracker/activeApp");
const { getActiveTabURL } = require("./tracker/activeTab");
const { isUserIdle } = require("./tracker/idleDetector");

const limits = require("./rules/limits");
const blocker = require("./blocking/softBlock");
const warnings = require("./notifications/warnings");
const db = require("./storage/sqlite");

const POLL_INTERVAL_MS = 1000; // 1 second

let currentSession = null;
/**
 * currentSession = {
 *   domain: 'youtube.com',
 *   browser: 'chrome',
 *   startTime: Date
 * }
 */

async function tick() {
  try {
    // 1️⃣ Check idle state
    const idle = await isUserIdle(60); // seconds
    if (idle) {
      endCurrentSession();
      return;
    }

    // 2️⃣ Get foreground application
    const app = await getActiveApp();
    if (!app || !app.isBrowser) {
      endCurrentSession();
      return;
    }

    // 3️⃣ Get active tab URL
    const url = await getActiveTabURL(app.browser);
    if (!url) {
      endCurrentSession();
      return;
    }

    const domain = extractDomain(url);
    if (!domain) {
      endCurrentSession();
      return;
    }

    // ⚠️ WARNING CHECK (NEW)
    warnings.checkAndWarn(domain);

    // 4️⃣ Same domain → continue session
    if (currentSession && currentSession.domain === domain) {
      return;
    }

    // 5️⃣ Domain changed → close old session
    endCurrentSession();

    // 6️⃣ Start new session
    startNewSession(domain, app.browser);

  } catch (err) {
    console.error("[Daemon Tick Error]", err.message);
  }
}

function startNewSession(domain, browser) {
  currentSession = {
    domain,
    browser,
    startTime: new Date(),
  };

  console.log(`[START] ${domain}`);

  // 🔒 Enforce soft block immediately if already exceeded
  if (limits.isLimitReached(domain)) {
    console.log(`[BLOCKED] ${domain} (limit exceeded)`);
    blocker.closeActiveTab(browser);
    currentSession = null;
  }
}

function endCurrentSession() {
  if (!currentSession) return;

  const endTime = new Date();
  const durationSec = Math.floor(
    (endTime - currentSession.startTime) / 1000
  );

  if (durationSec > 0) {
    db.insertSession({
      domain: currentSession.domain,
      browser: currentSession.browser,
      startTime: currentSession.startTime,
      endTime,
      durationSec,
    });

    console.log(
      `[END] ${currentSession.domain} - ${durationSec}s`
    );

    // ⚠️ CHECK WARNINGS ON SESSION END (NEW)
    warnings.checkAndWarn(currentSession.domain);

    // 🔒 Final limit check
    if (limits.isLimitReached(currentSession.domain)) {
      console.log(
        `[LIMIT REACHED] ${currentSession.domain}`
      );
      blocker.closeActiveTab(currentSession.browser);
    }
  }

  currentSession = null;
}


function extractDomain(url) {
  try {
    const { hostname } = new URL(url);
    return hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

// 🔁 Start daemon loop
console.log("DigitalWell daemon started");
setInterval(tick, POLL_INTERVAL_MS);
