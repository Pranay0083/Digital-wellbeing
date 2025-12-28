/**
 * Warning logic for approaching limits
 */

const limits = require("../rules/limits");
const notifier = require("./notifier");
const state = require("./warningState");

const WARNINGS = [
  { level: "5min", seconds: 300, label: "5 minutes remaining" },
  { level: "1min", seconds: 60, label: "1 minute remaining" },
];

function checkAndWarn(domain) {
  state.resetOldDays();

  const remaining = limits.getRemainingTime(domain);
  if (remaining === null) return;

  for (const w of WARNINGS) {
    if (
      remaining <= w.seconds &&
      remaining > 0 &&
      !state.hasShown(domain, w.level)
    ) {
      notifier.notify("DigitalWell", `${domain}: ${w.label}`);
      console.log(`[WARN CHECK] ${domain} remaining=${remaining}s`);

      state.markShown(domain, w.level);
    }
  }
}

module.exports = {
  checkAndWarn,
};
